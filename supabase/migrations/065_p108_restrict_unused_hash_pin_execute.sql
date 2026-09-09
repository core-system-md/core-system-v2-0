-- P108: Restrict client execution of the unused hash_pin RPC.
-- Evidence: active repository search found no caller of public.hash_pin(text).
-- The function is retained for internal database compatibility; only client-role
-- EXECUTE is removed. Existing SECURITY DEFINER behavior/signature is unchanged.

REVOKE EXECUTE ON FUNCTION public.hash_pin(text) FROM PUBLIC, anon, authenticated;
