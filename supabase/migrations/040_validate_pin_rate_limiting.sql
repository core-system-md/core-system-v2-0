-- 040_validate_pin_rate_limiting.sql
-- P38-B2: Integrate backend rate limiting into legacy validate_pin.
-- Active PIN login uses create_pin_session; this function remains compatibility-only.

CREATE OR REPLACE FUNCTION public.check_pin_rate_limit(
  p_tenant_id UUID,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $p040a$
DECLARE
  v_attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO v_attempt_count
  FROM public.pin_attempt_log
  WHERE tenant_id = p_tenant_id
    AND (p_ip_address IS NULL OR ip_address = p_ip_address::inet)
    AND created_at > NOW() - INTERVAL '15 minutes';

  RETURN v_attempt_count < 5;
END;
$p040a$;

CREATE OR REPLACE FUNCTION public.validate_pin(
  p_tenant_id UUID,
  p_pin TEXT
)
RETURNS SETOF public.clinic_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $p040b$
DECLARE
  v_match_count INT;
BEGIN
  IF NOT public.check_pin_rate_limit(p_tenant_id) THEN
    INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, auth.uid(), p_pin, false, NULL);
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Too many PIN attempts. Try again later.';
  END IF;

  SELECT COUNT(*) INTO v_match_count
  FROM public.clinic_users
  WHERE tenant_id = p_tenant_id
    AND pin_code = p_pin
    AND is_active = true
    AND deleted_at IS NULL;

  INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
  VALUES (p_tenant_id, auth.uid(), p_pin, v_match_count > 0, NULL);

  RETURN QUERY
  SELECT *
  FROM public.clinic_users
  WHERE tenant_id = p_tenant_id
    AND pin_code = p_pin
    AND is_active = true
    AND deleted_at IS NULL;
END;
$p040b$;