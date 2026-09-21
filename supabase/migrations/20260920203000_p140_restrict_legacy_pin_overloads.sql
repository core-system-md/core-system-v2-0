-- P140 security hardening
-- Evidence: no active application caller exists for these legacy overloads.
-- The active login contract uses create_pin_session(uuid,text) and
-- validate_pin(uuid,text). Keep internal functions intact; revoke direct client execution.

REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_pin_session(uuid, text, text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pin_session(uuid, text, text) TO anon;
REVOKE EXECUTE ON FUNCTION public.validate_pin(jsonb) FROM PUBLIC, anon, authenticated;