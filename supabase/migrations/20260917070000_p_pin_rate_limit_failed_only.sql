-- P-AuthRateLimit: count failed PIN attempts only.
--
-- Evidence:
-- - The active create_pin_session() RPC logs both successful and failed PIN attempts.
-- - The existing rate-limit function counted every row for the tenant, so legitimate
--   successful logins consumed the five-attempt allowance.
-- - E2E role/security coverage performs multiple valid logins in one isolated tenant.
--
-- Security intent: failed PIN attempts remain rate-limited; successful authentication
-- must not consume the brute-force failure budget.

CREATE OR REPLACE FUNCTION public.check_pin_rate_limit(
  p_tenant_id UUID,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO v_attempt_count
  FROM public.pin_attempt_log
  WHERE tenant_id = p_tenant_id
    AND success = false
    AND (p_ip_address IS NULL OR ip_address = p_ip_address::INET)
    AND created_at > NOW() - INTERVAL '15 minutes';

  RETURN v_attempt_count < 5;
END;
$$;
