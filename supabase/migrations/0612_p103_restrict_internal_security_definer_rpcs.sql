-- P103: restrict two public SECURITY DEFINER functions whose production
-- evidence shows they are not application RPC contracts.
--
-- is_super_admin() has no active policy dependency or active source usage;
-- authorization uses the auth-schema helper instead.
-- prevent_protected_clinic_user_changes() is trigger-only and is invoked by
-- trg_protect_clinic_user_identity on clinic_users; it is not a client RPC.
--
-- Revoke only EXECUTE from PUBLIC. Existing explicit service_role access is
-- preserved, and trigger execution is unaffected.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_protected_clinic_user_changes() FROM PUBLIC;

COMMIT;
