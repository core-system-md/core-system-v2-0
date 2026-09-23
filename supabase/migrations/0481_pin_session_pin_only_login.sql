-- P48: PIN session compatibility for the existing AuthScreen contract.
-- AuthScreen supplies employee_code + PIN because PIN values are not unique per tenant.
-- The secure session function is defined with (tenant_id, employee_code, pin).
-- This migration records the production migration already applied to Supabase.

CREATE OR REPLACE FUNCTION public.create_pin_session(p_tenant_id uuid, p_pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_user public.clinic_users%ROWTYPE;
  v_match_count integer;
  v_token text;
BEGIN
  IF p_tenant_id IS NULL OR p_pin IS NULL OR length(p_pin) <> 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_PARAMETERS');
  END IF;

  IF NOT public.check_pin_rate_limit(p_tenant_id) THEN
    INSERT INTO public.pin_attempt_log(tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, NULL, p_pin, false, NULL);
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Too many PIN attempts. Try again later.';
  END IF;

  SELECT count(*) INTO v_match_count
  FROM public.clinic_users
  WHERE tenant_id = p_tenant_id
    AND pin_code = p_pin
    AND is_active = true
    AND deleted_at IS NULL;

  IF v_match_count = 0 THEN
    INSERT INTO public.pin_attempt_log(tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, NULL, p_pin, false, NULL);
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  END IF;

  IF v_match_count > 1 THEN
    INSERT INTO public.pin_attempt_log(tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, NULL, p_pin, false, NULL);
    RETURN jsonb_build_object('success', false, 'error', 'AMBIGUOUS_PIN');
  END IF;

  SELECT * INTO v_user
  FROM public.clinic_users
  WHERE tenant_id = p_tenant_id
    AND pin_code = p_pin
    AND is_active = true
    AND deleted_at IS NULL
  LIMIT 1;

  INSERT INTO public.pin_attempt_log(tenant_id, staff_id, attempted_pin, success, ip_address)
  VALUES (p_tenant_id, v_user.id, p_pin, true, NULL);

  v_token := encode(gen_random_bytes(32), 'hex');

  DELETE FROM public.pin_sessions
  WHERE staff_id = v_user.id
    AND tenant_id = p_tenant_id;

  INSERT INTO public.pin_sessions(tenant_id, staff_id, token_hash, expires_at)
  VALUES (p_tenant_id, v_user.id, digest(v_token, 'sha256'), NOW() + INTERVAL '8 hours');

  UPDATE public.clinic_users
  SET last_login_at = NOW()
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

GRANT EXECUTE ON FUNCTION public.create_pin_session(uuid, text) TO anon, authenticated;
