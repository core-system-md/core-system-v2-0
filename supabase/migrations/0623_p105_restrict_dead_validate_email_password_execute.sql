-- 0623_p105_restrict_dead_validate_email_password_execute.sql
-- P105: Restrict the legacy production-only validate_email_password(jsonb) RPC.
-- This function is not part of the active repository migration chain; 035 removes
-- the historical TEXT,TEXT,UUID overload. Apply the privilege hardening only when
-- the production-only jsonb signature exists so isolated replay remains valid.

DO $p0623$
BEGIN
  IF to_regprocedure('public.validate_email_password(jsonb)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.validate_email_password(jsonb) FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.validate_email_password(jsonb) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.validate_email_password(jsonb) FROM authenticated';
  END IF;
END
$p0623$;