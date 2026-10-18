-- Helpers for credential-rotation preflight tests only.
-- Do not replace create_pin_session or verify_pin_hash: those must remain the
-- actual functions installed by the FIX-002 forward migration.
CREATE OR REPLACE FUNCTION public.validate_license(p_license_key TEXT)
RETURNS SETOF public.master_tenants
LANGUAGE sql STABLE SET search_path = ''
AS $license$
  SELECT t.*
  FROM public.master_tenants t
  WHERE t.license_key = p_license_key
    AND t.is_active = TRUE
    AND t.deleted_at IS NULL
$license$;
