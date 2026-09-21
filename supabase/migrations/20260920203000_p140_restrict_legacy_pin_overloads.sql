-- P140 security hardening
-- Evidence: legacy client-facing PIN/auth overloads are not part of the active
-- application contract. Hardening is guarded so clean replay remains valid even
-- when a production-only legacy overload is absent.

DO $p140_restrict_legacy$
BEGIN
  IF to_regprocedure('public.verify_pin_hash(uuid,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text) FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text) FROM authenticated';
  END IF;

  IF to_regprocedure('public.verify_pin_hash(uuid,text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text, text) FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text, text) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid, text, text) FROM authenticated';
  END IF;

  IF to_regprocedure('public.create_pin_session(uuid,text,text)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_pin_session(uuid, text, text) FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.create_pin_session(uuid, text, text) FROM authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.create_pin_session(uuid, text, text) TO anon';
  END IF;

  IF to_regprocedure('public.validate_pin(jsonb)') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.validate_pin(jsonb) FROM PUBLIC';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.validate_pin(jsonb) FROM anon';
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.validate_pin(jsonb) FROM authenticated';
  END IF;
END
$p140_restrict_legacy$;