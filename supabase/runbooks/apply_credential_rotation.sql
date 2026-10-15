-- CORE SYSTEM v2.1 — credential rotation apply script
-- NOT a migration. Do not run before FIX-002 is merged and verified.
-- Production execution requires separate written owner approval after FIX-002.
-- Designed for a single privileged database session after secure staging.
-- No rows are deleted; no RLS or security protection is disabled.
-- Run only on a disposable local Supabase stack or an approved isolated branch
-- until the owner separately approves a production rotation.

BEGIN;

DO $preflight$
DECLARE
  v_tenant_id UUID;
  v_target_license TEXT;
  v_stage_users BIGINT;
  v_active_users BIGINT;
  v_hash_aware_functions BIGINT;
  v_plaintext_functions BIGINT;
  v_total_functions BIGINT;
  v_function_def TEXT;
BEGIN
  IF to_regclass('pg_temp.mdcore_rotation_staff_stage') IS NULL
     OR to_regclass('pg_temp.mdcore_rotation_license_stage') IS NULL THEN
    RAISE EXCEPTION 'Rotation staging tables are missing; run prepare_credential_rotation.sql and load them in this same session.';
  END IF;

  SELECT count(*)
    INTO v_stage_users
  FROM pg_temp.mdcore_rotation_staff_stage;

  SELECT tenant_id
    INTO v_tenant_id
  FROM pg_temp.mdcore_rotation_staff_stage
  LIMIT 1;

  IF v_stage_users = 0 OR v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Rotation stage must include at least one staff hash.';
  END IF;

  IF (SELECT count(DISTINCT tenant_id) FROM pg_temp.mdcore_rotation_staff_stage) <> 1 THEN
    RAISE EXCEPTION 'All staged staff rows must belong to exactly one tenant.';
  END IF;

  IF (SELECT count(*) FROM pg_temp.mdcore_rotation_license_stage) <> 1 THEN
    RAISE EXCEPTION 'Rotation stage must include exactly one tenant license row.';
  END IF;

  IF (SELECT tenant_id FROM pg_temp.mdcore_rotation_license_stage LIMIT 1) <> v_tenant_id THEN
    RAISE EXCEPTION 'Staff and license staging tenant IDs do not match.';
  END IF;

  SELECT new_license_key
    INTO v_target_license
  FROM pg_temp.mdcore_rotation_license_stage
  WHERE tenant_id = v_tenant_id;

  IF v_target_license IS NULL OR length(trim(v_target_license)) = 0 THEN
    RAISE EXCEPTION 'New license key is required.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.master_tenants other_tenant
    WHERE other_tenant.license_key = v_target_license
      AND other_tenant.id <> v_tenant_id
  ) THEN
    RAISE EXCEPTION 'The staged license key is already assigned to another tenant.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.master_tenants t
    WHERE t.id = v_tenant_id
      AND t.is_active = TRUE
      AND t.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Target tenant is missing, inactive, or deleted.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_temp.mdcore_rotation_staff_stage s
    LEFT JOIN public.clinic_users u
      ON u.id = s.staff_id
     AND u.tenant_id = s.tenant_id
     AND u.is_active = TRUE
     AND u.deleted_at IS NULL
    WHERE u.id IS NULL
       OR s.pin_length < 6
       OR s.pin_hash !~ '^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
  ) THEN
    RAISE EXCEPTION 'A staged staff row is invalid or does not match an active, non-deleted user in the target tenant.';
  END IF;

  SELECT count(*)
    INTO v_active_users
  FROM public.clinic_users u
  WHERE u.tenant_id = v_tenant_id
    AND u.is_active = TRUE
    AND u.deleted_at IS NULL;

  IF v_active_users <> v_stage_users THEN
    RAISE EXCEPTION 'Staged user count does not match the target tenant active-user count; no changes applied.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.clinic_users u
    WHERE u.tenant_id = v_tenant_id
      AND u.is_active = TRUE
      AND u.deleted_at IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM pg_temp.mdcore_rotation_staff_stage s
        WHERE s.staff_id = u.id
          AND s.tenant_id = u.tenant_id
      )
  ) THEN
    RAISE EXCEPTION 'One or more active users are missing from the rotation stage.';
  END IF;

  -- FIX-002 must make every create_pin_session overload hash-aware and
  -- remove every plaintext pin_code = p_pin comparison.
  -- Catch qualified and unqualified comparisons in either operand order.
  WITH function_contracts AS (
    SELECT pg_get_functiondef(p.oid) AS definition
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'create_pin_session'
  )
  SELECT count(*),
         count(*) FILTER (
           WHERE definition ILIKE '%pin_hash%'
              OR definition ILIKE '%verify_pin_hash%'
         ),
         count(*) FILTER (
           WHERE definition ~* '([[:alnum:]_]+\\.)?pin_code[[:space:]]*=[[:space:]]*p_pin([[:space:]]|$)|p_pin[[:space:]]*=[[:space:]]*([[:alnum:]_]+\\.)?pin_code'
         )
    INTO v_total_functions, v_hash_aware_functions, v_plaintext_functions
  FROM function_contracts;

  IF v_total_functions = 0
     OR v_hash_aware_functions <> v_total_functions
     OR v_plaintext_functions > 0 THEN
    RAISE EXCEPTION 'FIX-002 is not verified: every create_pin_session overload must use the hashed PIN contract and must not compare pin_code to the input PIN.';
  END IF;

  SELECT pg_get_functiondef(p.oid)
    INTO v_function_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'validate_license'
  ORDER BY p.oid
  LIMIT 1;

  IF v_function_def IS NULL OR v_function_def NOT ILIKE '%license_key%' THEN
    RAISE EXCEPTION 'validate_license contract is missing or does not use master_tenants.license_key.';
  END IF;

  -- Prevent concurrent changes to the tenant and its active staff during apply.
  PERFORM 1
  FROM public.master_tenants t
  WHERE t.id = v_tenant_id
  FOR UPDATE;

  PERFORM 1
  FROM public.clinic_users u
  JOIN pg_temp.mdcore_rotation_staff_stage s
    ON s.staff_id = u.id
   AND s.tenant_id = u.tenant_id
  WHERE u.tenant_id = v_tenant_id
  FOR UPDATE OF u;
END;
$preflight$;

-- Idempotent: a second run with the same staged hashes is a no-op for PIN rows.
UPDATE public.clinic_users u
SET pin_hash = s.pin_hash,
    pin_code = NULL,
    updated_at = NOW()
FROM pg_temp.mdcore_rotation_staff_stage s
WHERE u.id = s.staff_id
  AND u.tenant_id = s.tenant_id
  AND u.is_active = TRUE
  AND u.deleted_at IS NULL
  AND (
    u.pin_hash IS DISTINCT FROM s.pin_hash
    OR u.pin_code IS NOT NULL
  );

-- Idempotent: the tenant license is updated only when the staged value differs.
UPDATE public.master_tenants t
SET license_key = s.new_license_key
FROM pg_temp.mdcore_rotation_license_stage s
WHERE t.id = s.tenant_id
  AND t.is_active = TRUE
  AND t.deleted_at IS NULL
  AND t.license_key IS DISTINCT FROM s.new_license_key;

-- Revoke any currently live PIN sessions for this tenant without deleting rows.
UPDATE public.pin_sessions ps
SET deleted_at = NOW()
WHERE ps.tenant_id = (
    SELECT tenant_id
    FROM pg_temp.mdcore_rotation_license_stage
    LIMIT 1
  )
  AND ps.deleted_at IS NULL;

DO $postflight$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM pg_temp.mdcore_rotation_license_stage
  LIMIT 1;

  IF EXISTS (
    SELECT 1
    FROM pg_temp.mdcore_rotation_staff_stage s
    JOIN public.clinic_users u
      ON u.id = s.staff_id
     AND u.tenant_id = s.tenant_id
    WHERE u.pin_hash IS DISTINCT FROM s.pin_hash
       OR u.pin_code IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Postflight failed: one or more staged users do not match the new hash contract.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.master_tenants t
    JOIN pg_temp.mdcore_rotation_license_stage s
      ON s.tenant_id = t.id
     AND s.new_license_key = t.license_key
    WHERE t.id = v_tenant_id
      AND t.is_active = TRUE
      AND t.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Postflight failed: tenant license does not match the staged value.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.pin_sessions ps
    WHERE ps.tenant_id = v_tenant_id
      AND ps.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Postflight failed: one or more live PIN sessions remain for the rotated tenant.';
  END IF;
END;
$postflight$;

COMMIT;
