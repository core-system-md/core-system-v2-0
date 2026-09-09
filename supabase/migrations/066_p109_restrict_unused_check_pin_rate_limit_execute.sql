-- P109: Restrict direct client execution of check_pin_rate_limit.
-- Evidence: active application source has no RPC caller. The function is invoked
-- internally by SECURITY DEFINER validate_pin paths, so removing client-role
-- EXECUTE preserves the existing internal PIN rate-limiting contract.

REVOKE EXECUTE ON FUNCTION public.check_pin_rate_limit(uuid, text) FROM PUBLIC, anon, authenticated;
