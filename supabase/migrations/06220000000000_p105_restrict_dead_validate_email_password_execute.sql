-- P105: Restrict execution of the legacy validate_email_password RPC.
-- Evidence: Production exposes validate_email_password(jsonb) as SECURITY DEFINER,
-- but active source contains no caller. Historical migration 035 explicitly marked
-- this function as dead and dropped its canonical overload.
-- Preserve the function definition/signature for non-client/internal compatibility;
-- remove client-role execution only when the overload exists in the local chain.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'validate_email_password'
      AND pg_get_function_identity_arguments(p.oid) = 'jsonb'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.validate_email_password(jsonb) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.validate_email_password(jsonb) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.validate_email_password(jsonb) FROM authenticated;
  END IF;
END;
$$;

-- Compatibility guard: this migration is intentionally idempotent on local chains.
