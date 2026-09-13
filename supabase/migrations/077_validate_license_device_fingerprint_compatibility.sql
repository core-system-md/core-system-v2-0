-- Compatibility repair: align the canonical validate_license RPC with the
-- production/database.types contract used by the active authentication flow.
-- Evidence: production exposes validate_license(p_license_key text,
-- p_device_fingerprint text DEFAULT NULL), while the earlier migration chain
-- only created the one-argument overload. The active client supplies the
-- license key and does not require a device fingerprint.
-- No table, RLS, or authorization model changes.

DROP FUNCTION IF EXISTS public.validate_license(text, text);
DROP FUNCTION IF EXISTS public.validate_license(text);

CREATE OR REPLACE FUNCTION public.validate_license(
  p_license_key TEXT,
  p_device_fingerprint TEXT DEFAULT NULL
)
RETURNS SETOF public.master_tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.master_tenants
  WHERE license_key = p_license_key
    AND deleted_at IS NULL;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.validate_license(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_license(TEXT, TEXT) TO anon, authenticated;
