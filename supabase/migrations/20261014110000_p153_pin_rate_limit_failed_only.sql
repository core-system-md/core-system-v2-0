-- P153 — Count failed PIN validations, not successful staff switches, for throttling.
-- Evidence: the E2E browser performs sequential valid PIN logins for separate
-- seeded roles. The rate-limit query counted successful rows too, so legitimate
-- role switches exhausted the threshold and locked the rest of the suite.
-- Keep the 15-minute window, threshold (5), tenant/IP scoping, and soft-delete
-- boundary unchanged. Only failed attempts contribute to brute-force throttling.

CREATE OR REPLACE FUNCTION public.check_pin_rate_limit(
  p_tenant_id UUID,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_attempt_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_attempt_count
  FROM public.pin_attempt_log
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND success = FALSE
    AND (p_ip_address IS NULL OR ip_address = p_ip_address::inet)
    AND created_at > NOW() - INTERVAL '15 minutes';

  RETURN v_attempt_count < 5;
END;
$function$;
