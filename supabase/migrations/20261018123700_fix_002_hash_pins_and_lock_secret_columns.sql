-- MDCORE-FIX-002 — Hash legacy PINs and remove client access to credential columns.
-- Forward-only, additive migration. Do not apply to production without a separate approved rollout.
-- Preserves pin_code/password columns and historical pin_attempt_log rows.
BEGIN;

DO $extension_preflight$
DECLARE
  v_schema text;
BEGIN
  SELECT n.nspname INTO v_schema
  FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace
  WHERE e.extname='pgcrypto';
  IF v_schema IS DISTINCT FROM 'extensions' THEN
    RAISE EXCEPTION 'FIX-002 requires pgcrypto to be installed in schema extensions; no changes applied.';
  END IF;
END
$extension_preflight$;

-- A clean replay may still carry the original NOT NULL constraint even though
-- the inspected production column is nullable. Allow hash-only future inserts;
-- existing pin_code values are deliberately retained by this migration.
ALTER TABLE public.clinic_users ALTER COLUMN pin_code DROP NOT NULL;

-- Fail closed if a row needing a hash repair has no legacy PIN from which it
-- can be migrated. Counts only are used; no PIN/hash values are emitted.
DO $pin_hash_preflight$
DECLARE
  v_unrecoverable bigint;
  v_conflicting_hashes bigint;
BEGIN
  SELECT count(*) INTO v_unrecoverable
  FROM public.clinic_users u
  WHERE (u.pin_hash IS NULL
      OR u.pin_hash !~ '^\$2a\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$')
    AND u.pin_code IS NULL;

  SELECT count(*) INTO v_conflicting_hashes
  FROM public.clinic_users u
  WHERE u.pin_code IS NOT NULL
    AND u.pin_hash ~ '^\$2a\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$'
    AND extensions.crypt(u.pin_code, u.pin_hash) IS DISTINCT FROM u.pin_hash;

  IF v_unrecoverable > 0 THEN
    RAISE EXCEPTION 'FIX-002 stopped: % clinic_users rows need hash repair but have no legacy PIN.', v_unrecoverable;
  END IF;
  IF v_conflicting_hashes > 0 THEN
    RAISE EXCEPTION 'FIX-002 stopped: % valid-format $2a$ hashes do not match the retained legacy PIN; reconcile these rows before applying.', v_conflicting_hashes;
  END IF;
END
$pin_hash_preflight$;

-- Replace only absent, non-bcrypt, incompatible-prefix, or invalid-cost hashes
-- from the retained legacy PIN. Existing valid, matching $2a$ hashes are preserved.
UPDATE public.clinic_users u
SET pin_hash = extensions.crypt(u.pin_code, extensions.gen_salt('bf', 12)),
    updated_at = pg_catalog.now()
WHERE u.pin_code IS NOT NULL
  AND (
    u.pin_hash IS NULL
    OR u.pin_hash !~ '^\$2a\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$'
  );

DO $pin_hash_postflight$
DECLARE
  v_unrecoverable bigint;
  v_bad_hashes bigint;
BEGIN
  SELECT count(*) INTO v_unrecoverable
  FROM public.clinic_users u
  WHERE (u.pin_hash IS NULL
      OR u.pin_hash !~ '^\$2a\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$')
    AND u.pin_code IS NULL;

  SELECT count(*) INTO v_bad_hashes
  FROM public.clinic_users u
  WHERE u.pin_hash IS NULL
     OR u.pin_hash !~ '^\$2a\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$'
     OR CASE
          WHEN u.pin_code IS NOT NULL
           AND u.pin_hash ~ '^\$2a\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$'
          THEN extensions.crypt(u.pin_code, u.pin_hash) IS DISTINCT FROM u.pin_hash
          ELSE false
        END;

  IF v_unrecoverable > 0 OR v_bad_hashes > 0 THEN
    RAISE EXCEPTION 'FIX-002 hash postflight failed: unrecoverable_rows=%, invalid_hash_rows=%.', v_unrecoverable, v_bad_hashes;
  END IF;
END
$pin_hash_postflight$;

-- Current production JSON contract is retained exactly. The lookup projects
-- only non-secret columns; pin_code is not read during authentication.
CREATE OR REPLACE FUNCTION public.create_pin_session(
  p_tenant_id uuid,
  p_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user record;
  v_token text;
BEGIN
  IF p_tenant_id IS NULL OR p_pin IS NULL OR length(p_pin) <> 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_PARAMETERS');
  END IF;

  IF NOT public.check_pin_rate_limit(p_tenant_id) THEN
    INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, NULL, '****', false, NULL);
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Too many PIN attempts. Try again later.';
  END IF;

  SELECT u.id, u.tenant_id, u.email, u.full_name, u.full_name_ar, u.role,
         u.employee_code, u.phone, u.specialization
    INTO v_user
  FROM public.clinic_users u
  WHERE u.tenant_id = p_tenant_id
    AND u.pin_hash IS NOT NULL
    AND extensions.crypt(p_pin, u.pin_hash) = u.pin_hash
    AND u.is_active = true
    AND u.deleted_at IS NULL
  ORDER BY u.created_at ASC, u.id ASC
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, NULL, '****', false, NULL);
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  END IF;

  INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
  VALUES (p_tenant_id, v_user.id, '****', true, NULL);

  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  UPDATE public.pin_sessions
  SET deleted_at = pg_catalog.now()
  WHERE staff_id = v_user.id AND tenant_id = p_tenant_id;

  INSERT INTO public.pin_sessions (tenant_id, staff_id, token_hash, expires_at)
  VALUES (p_tenant_id, v_user.id, extensions.digest(v_token, 'sha256'), pg_catalog.now() + INTERVAL '8 hours');

  UPDATE public.clinic_users
  SET last_login_at = pg_catalog.now()
  WHERE id = v_user.id;

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_token,
    'user_id', v_user.id,
    'full_name', v_user.full_name,
    'full_name_ar', v_user.full_name_ar,
    'role', v_user.role,
    'tenant_id', v_user.tenant_id,
    'employee_code', v_user.employee_code,
    'email', v_user.email,
    'phone', v_user.phone,
    'specialization', v_user.specialization
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_pin_session(
  p_tenant_id uuid,
  p_employee_code text,
  p_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_user record;
  v_token text;
BEGIN
  IF p_tenant_id IS NULL OR p_employee_code IS NULL OR p_pin IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_PARAMETERS');
  END IF;

  IF NOT public.check_pin_rate_limit(p_tenant_id) THEN
    INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, NULL, '****', false, NULL);
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Too many PIN attempts. Try again later.';
  END IF;

  SELECT u.id, u.tenant_id, u.email, u.full_name, u.full_name_ar, u.role,
         u.employee_code, u.phone, u.specialization
    INTO v_user
  FROM public.clinic_users u
  WHERE u.tenant_id = p_tenant_id
    AND u.employee_code = p_employee_code
    AND u.pin_hash IS NOT NULL
    AND extensions.crypt(p_pin, u.pin_hash) = u.pin_hash
    AND u.is_active = true
    AND u.deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, NULL, '****', false, NULL);
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  END IF;

  INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
  VALUES (p_tenant_id, v_user.id, '****', true, NULL);

  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');

  UPDATE public.pin_sessions
  SET deleted_at = pg_catalog.now()
  WHERE staff_id = v_user.id AND tenant_id = p_tenant_id;

  INSERT INTO public.pin_sessions (tenant_id, staff_id, token_hash, expires_at)
  VALUES (p_tenant_id, v_user.id, extensions.digest(v_token, 'sha256'), pg_catalog.now() + INTERVAL '8 hours');

  UPDATE public.clinic_users
  SET last_login_at = pg_catalog.now()
  WHERE id = v_user.id;

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_token,
    'user_id', v_user.id,
    'full_name', v_user.full_name,
    'full_name_ar', v_user.full_name_ar,
    'role', v_user.role,
    'tenant_id', v_user.tenant_id,
    'employee_code', v_user.employee_code,
    'email', v_user.email,
    'phone', v_user.phone,
    'specialization', v_user.specialization
  );
END;
$function$;

-- The legacy validate_pin functions have no active source call site. Retain their
-- signatures for privileged service_role compatibility, but remove client access.
CREATE OR REPLACE FUNCTION public.validate_pin(p_tenant_id uuid, p_pin text)
RETURNS SETOF public.clinic_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_match_count integer;
BEGIN
  IF NOT public.check_pin_rate_limit(p_tenant_id) THEN
    INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, auth.uid(), '****', false, NULL);
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Too many PIN attempts. Try again later.';
  END IF;

  SELECT count(*) INTO v_match_count
  FROM public.clinic_users u
  WHERE u.tenant_id = p_tenant_id
    AND u.pin_hash IS NOT NULL
    AND extensions.crypt(p_pin, u.pin_hash) = u.pin_hash
    AND u.is_active = true
    AND u.deleted_at IS NULL;

  INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
  VALUES (p_tenant_id, auth.uid(), '****', v_match_count > 0, NULL);

  RETURN QUERY
  SELECT u.*
  FROM public.clinic_users u
  WHERE u.tenant_id = p_tenant_id
    AND u.pin_hash IS NOT NULL
    AND extensions.crypt(p_pin, u.pin_hash) = u.pin_hash
    AND u.is_active = true
    AND u.deleted_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_pin(params jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_tenant_id uuid := (params->>'p_tenant_id')::uuid;
  v_pin text := params->>'p_pin';
  v_role text := params->>'p_role';
  v_user record;
BEGIN
  IF v_tenant_id IS NULL OR v_pin IS NULL OR v_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_PARAMETERS',
                              'message', 'tenant_id, pin, and role are required');
  END IF;

  SELECT u.id, u.full_name, u.role, u.employee_code
    INTO v_user
  FROM public.clinic_users u
  WHERE u.tenant_id = v_tenant_id
    AND u.pin_hash IS NOT NULL
    AND extensions.crypt(v_pin, u.pin_hash) = u.pin_hash
    AND u.role = v_role
    AND u.deleted_at IS NULL
    AND u.is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS',
                              'message', 'Invalid PIN or role for this clinic');
  END IF;

  UPDATE public.clinic_users
  SET last_login_at = pg_catalog.now()
  WHERE id = v_user.id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user.id,
    'full_name', v_user.full_name,
    'role', v_user.role,
    'employee_code', v_user.employee_code
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_pin_hash(
  p_tenant_id uuid,
  p_role text,
  p_pin text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_failed_attempts integer;
  v_user_record record;
  v_success boolean := false;
  v_user_id uuid := NULL;
  v_reason text := NULL;
BEGIN
  SELECT count(*) INTO v_failed_attempts
  FROM public.pin_attempt_log
  WHERE tenant_id = p_tenant_id
    AND success = false
    AND created_at > pg_catalog.now() - INTERVAL '15 minutes';

  IF v_failed_attempts >= 5 THEN
    INSERT INTO public.pin_attempt_log (tenant_id, attempted_pin, success)
    VALUES (p_tenant_id, '****', false);
    RETURN jsonb_build_object('success', false, 'user_id', NULL, 'reason', 'RATE_LIMITED');
  END IF;

  SELECT u.id, u.pin_hash INTO v_user_record
  FROM public.clinic_users u
  WHERE u.tenant_id = p_tenant_id
    AND u.role = p_role
    AND u.is_active = true
    AND u.deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.pin_attempt_log (tenant_id, attempted_pin, success)
    VALUES (p_tenant_id, '****', false);
    RETURN jsonb_build_object('success', false, 'user_id', NULL, 'reason', 'INVALID_CREDENTIALS');
  END IF;

  IF v_user_record.pin_hash IS NOT NULL
     AND extensions.crypt(p_pin, v_user_record.pin_hash) = v_user_record.pin_hash THEN
    v_success := true;
    v_user_id := v_user_record.id;
    v_reason := 'SUCCESS';
  ELSE
    v_reason := 'INVALID_CREDENTIALS';
  END IF;

  INSERT INTO public.pin_attempt_log (tenant_id, attempted_pin, success)
  VALUES (p_tenant_id, '****', v_success);

  RETURN jsonb_build_object('success', v_success, 'user_id', v_user_id, 'reason', v_reason);
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_pin_hash(p_tenant_id uuid, p_pin text)
RETURNS SETOF public.clinic_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT u.*
  FROM public.clinic_users u
  WHERE u.tenant_id = p_tenant_id
    AND u.pin_hash IS NOT NULL
    AND extensions.crypt(p_pin, u.pin_hash) = u.pin_hash
    AND u.is_active = true
    AND u.deleted_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hash_pin(p_pin text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  RETURN extensions.crypt(p_pin, extensions.gen_salt('bf', 12));
END;
$function$;

-- Match the inspected production RPC grants for the active login functions.
REVOKE EXECUTE ON FUNCTION public.create_pin_session(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pin_session(uuid, text) TO anon, authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.create_pin_session(uuid, text, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pin_session(uuid, text, text) TO anon, service_role;

-- validate_pin has no active application call-site. Keep service-role compatibility.
REVOKE EXECUTE ON FUNCTION public.validate_pin(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_pin(uuid, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.validate_pin(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.validate_pin(jsonb) TO service_role;

-- Keep the verified production contract: helper crypto RPCs are service_role-only.
REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.hash_pin(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hash_pin(text) TO service_role;

-- Explicit column grants are revoked too; table-level REVOKE alone is insufficient.
REVOKE SELECT ON TABLE public.clinic_users FROM PUBLIC, anon, authenticated;
REVOKE SELECT (
  id, tenant_id, email, full_name, role, is_active, last_login_at,
  created_at, updated_at, employee_code, pin_code, full_name_ar,
  specialization, phone, password, deleted_at, pin_hash
) ON TABLE public.clinic_users FROM PUBLIC, anon, authenticated;

-- Only authenticated profile/staff reads may access the listed non-secret fields.
-- Anonymous has no clinic_users SELECT grant by design.
GRANT SELECT (
  id, tenant_id, email, full_name, role, is_active, last_login_at,
  created_at, updated_at, employee_code, full_name_ar, specialization,
  phone, deleted_at
) ON TABLE public.clinic_users TO authenticated;

-- Safe postflight: check counts/booleans only; never emit PINs or hashes.
DO $security_postflight$
DECLARE
  v_bad_hashes bigint;
BEGIN
  SELECT count(*) INTO v_bad_hashes
  FROM public.clinic_users u
  WHERE u.pin_hash IS NULL
     OR u.pin_hash !~ '^\$2a\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$'
     OR CASE
          WHEN u.pin_code IS NOT NULL
           AND u.pin_hash ~ '^\$2a\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$'
          THEN extensions.crypt(u.pin_code, u.pin_hash) IS DISTINCT FROM u.pin_hash
          ELSE false
        END;
  IF v_bad_hashes > 0 THEN
    RAISE EXCEPTION 'FIX-002 security postflight failed: % clinic_users PIN hashes are invalid.', v_bad_hashes;
  END IF;

  IF has_table_privilege('anon', 'public.clinic_users', 'SELECT')
     OR has_table_privilege('authenticated', 'public.clinic_users', 'SELECT') THEN
    RAISE EXCEPTION 'FIX-002 security postflight failed: table-level SELECT remains on clinic_users.';
  END IF;

  IF has_column_privilege('anon', 'public.clinic_users', 'pin_code', 'SELECT')
     OR has_column_privilege('anon', 'public.clinic_users', 'pin_hash', 'SELECT')
     OR has_column_privilege('anon', 'public.clinic_users', 'password', 'SELECT')
     OR has_column_privilege('authenticated', 'public.clinic_users', 'pin_code', 'SELECT')
     OR has_column_privilege('authenticated', 'public.clinic_users', 'pin_hash', 'SELECT')
     OR has_column_privilege('authenticated', 'public.clinic_users', 'password', 'SELECT') THEN
    RAISE EXCEPTION 'FIX-002 security postflight failed: one or more secret-column SELECT privileges remain.';
  END IF;

  IF NOT has_column_privilege('authenticated', 'public.clinic_users', 'id', 'SELECT')
     OR NOT has_column_privilege('authenticated', 'public.clinic_users', 'role', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.clinic_users', 'UPDATE')
     OR NOT has_table_privilege('authenticated', 'public.clinic_users', 'INSERT') THEN
    RAISE EXCEPTION 'FIX-002 security postflight failed: safe profile or existing write privileges are missing.';
  END IF;

  IF has_function_privilege('anon', 'public.validate_pin(uuid,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.validate_pin(uuid,text)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.validate_pin(jsonb)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.validate_pin(jsonb)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FIX-002 security postflight failed: a legacy validate_pin RPC remains client-callable.';
  END IF;
END
$security_postflight$;

COMMIT;
