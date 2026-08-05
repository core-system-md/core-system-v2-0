-- 040_validate_pin_rate_limiting.sql
-- P38-B2: Integrate backend rate limiting into validate_pin
-- Fixes check_pin_rate_limit column reference (attempted_at -> created_at)

-- ============================================================
-- STEP 1: Fix check_pin_rate_limit column name
-- ============================================================
CREATE OR REPLACE FUNCTION check_pin_rate_limit(
  p_tenant_id UUID,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $\$
DECLARE
  v_attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO v_attempt_count
  FROM pin_attempt_log
  WHERE tenant_id = p_tenant_id
    AND (p_ip_address IS NULL OR ip_address = p_ip_address::INET)
    AND created_at > NOW() - INTERVAL '15 minutes';

  RETURN v_attempt_count < 5;
END;
$\$;

-- ============================================================
-- STEP 2: Update validate_pin with rate limiting + logging
-- ============================================================
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
  v_caller_tenant_id UUID;
  v_match_count INT;
BEGIN
  -- G30 FIX: Verify caller belongs to the requested tenant
  SELECT tenant_id INTO v_caller_tenant_id
  FROM clinic_users
  WHERE id = auth.uid()
    AND is_active = true
    AND deleted_at IS NULL;

  IF v_caller_tenant_id IS NULL OR v_caller_tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: cross-tenant access denied';
  END IF;

  -- P38-B2: Enforce backend rate limiting BEFORE PIN verification
  IF NOT check_pin_rate_limit(p_tenant_id) THEN
    -- Log the blocked attempt for audit trail
    INSERT INTO pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, auth.uid(), p_pin, false, NULL);

    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Too many PIN attempts. Try again later.';
  END IF;

  -- Count PIN matches (preserves original multi-row behavior)
  SELECT COUNT(*) INTO v_match_count
  FROM clinic_users
  WHERE tenant_id = p_tenant_id
    AND pin_code = p_pin
    AND is_active = true
    AND deleted_at IS NULL;

  -- Log attempt result (success = true if any match found)
  INSERT INTO pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
  VALUES (p_tenant_id, auth.uid(), p_pin, v_match_count > 0, NULL);

  -- Return matching users (exact same behavior as before)
  RETURN QUERY
  SELECT *
  FROM clinic_users
  WHERE tenant_id = p_tenant_id
    AND pin_code = p_pin
    AND is_active = true
    AND deleted_at IS NULL;
END;
$\$;
