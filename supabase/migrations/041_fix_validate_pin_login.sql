-- 041_fix_validate_pin_login.sql
-- P0 regression fix: validate_pin must not require auth.uid() during login.

CREATE OR REPLACE FUNCTION public.validate_pin(
  p_tenant_id UUID,
  p_pin TEXT
)
RETURNS SETOF public.clinic_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $p041$
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
$p041$;