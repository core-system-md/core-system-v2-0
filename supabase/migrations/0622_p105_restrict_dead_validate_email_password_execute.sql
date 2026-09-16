-- P105: Restrict execution of the legacy validate_email_password RPC.
-- Evidence: Production may expose validate_email_password(jsonb) as SECURITY DEFINER,
-- but the canonical migration chain can already have removed this legacy overload.
-- Historical migration 035 explicitly marked this function as dead and dropped it.
-- Therefore this hardening migration must be replay-safe: revoke client execution
-- only when the legacy function still exists; otherwise no-op.

DO $$
BEGIN
  IF to_regprocedure('public.validate_email_password(jsonb)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.validate_email_password(jsonb) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.validate_email_password(jsonb) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.validate_email_password(jsonb) FROM authenticated;
  END IF;
END
$$;
