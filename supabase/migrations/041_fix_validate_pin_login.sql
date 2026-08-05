-- 041_fix_validate_pin_login.sql
-- P0 REGRESSION FIX: Remove G30 check from validate_pin
-- validate_pin is an AUTHENTICATION function — auth.uid() is null during login
-- Rate limiting and logging from P38-B2 are PRESERVED

CREATE OR REPLACE FUNCTION validate_pin(
  p_tenant_id UUID,
  p_pin TEXT
)
RETURNS SETOF clinic_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $\$
DECLARE
  v_match_count INT;
BEGIN
  -- P38-B2: Enforce backend rate limiting BEFORE PIN verification
  IF NOT check_pin_rate_limit(p_tenant_id) THEN
    INSERT INTO pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, auth.uid(), p_pin, false, NULL);

    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Too many PIN attempts. Try again later.';
  END IF;

  -- Count PIN matches (tenant-scoped by p_tenant_id)
  SELECT COUNT(*) INTO v_match_count
  FROM clinic_users
  WHERE tenant_id = p_tenant_id
    AND pin_code = p_pin
    AND is_active = true
    AND deleted_at IS NULL;

  -- Log attempt result
  INSERT INTO pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
  VALUES (p_tenant_id, auth.uid(), p_pin, v_match_count > 0, NULL);

  -- Return matching users
  RETURN QUERY
  SELECT *
  FROM clinic_users
  WHERE tenant_id = p_tenant_id
    AND pin_code = p_pin
    AND is_active = true
    AND deleted_at IS NULL;
END;
$\$;
