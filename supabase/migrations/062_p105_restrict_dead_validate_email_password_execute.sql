-- P105: Restrict execution of the legacy validate_email_password RPC.
-- Evidence: Production exposes validate_email_password(jsonb) as SECURITY DEFINER,
-- but active source contains no caller. Historical migration 035 explicitly marked
-- this function as dead and dropped the earlier (TEXT, TEXT, UUID) overload.
-- Preserve the function definition/signature for non-client/internal compatibility
-- where it exists, and make historical replay idempotent when the dead function has
-- already been removed.

DO $$
BEGIN
  IF to_regprocedure('public.validate_email_password(jsonb)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.validate_email_password(jsonb) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.validate_email_password(jsonb) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.validate_email_password(jsonb) FROM authenticated;
  END IF;
END
$$;
