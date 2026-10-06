-- P103 corrective: remove explicit anon/authenticated EXECUTE grants.
-- The initial PUBLIC revoke did not remove these explicit grants.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_protected_clinic_user_changes() FROM anon, authenticated;

COMMIT;
