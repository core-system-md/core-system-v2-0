-- P86: Staff identity and visit-session write boundaries.
-- Keeps clinic_users tenant-scoped while preventing self-escalation.
-- Doctors may update only their own non-completed sessions.

BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_protected_clinic_user_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.role IS DISTINCT FROM OLD.role THEN
    IF public.get_current_user_role() NOT IN ('clinic_admin', 'super_admin') THEN
      RAISE EXCEPTION 'Unauthorized: staff role or tenant cannot be changed';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role
       AND OLD.id = auth.uid()
       AND public.get_current_user_role() <> 'super_admin' THEN
      RAISE EXCEPTION 'Unauthorized: cannot change your own role';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_protect_clinic_user_identity ON public.clinic_users;
CREATE TRIGGER trg_protect_clinic_user_identity
BEFORE UPDATE ON public.clinic_users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_protected_clinic_user_changes();

DROP POLICY IF EXISTS rls_users_isolation ON public.clinic_users;

CREATE POLICY rls_users_select_tenant ON public.clinic_users
FOR SELECT TO public
USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY rls_users_insert_admin ON public.clinic_users
FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant_id()
  AND public.get_current_user_role() IN ('clinic_admin', 'super_admin')
);

CREATE POLICY rls_users_update_admin ON public.clinic_users
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_tenant_id()
  AND public.get_current_user_role() IN ('clinic_admin', 'super_admin')
)
WITH CHECK (
  tenant_id = public.get_current_tenant_id()
  AND public.get_current_user_role() IN ('clinic_admin', 'super_admin')
);

CREATE POLICY rls_users_delete_denied ON public.clinic_users
FOR DELETE TO public
USING (false);

DROP POLICY IF EXISTS visit_sessions_update ON public.clinic_visit_sessions;

CREATE POLICY visit_sessions_update ON public.clinic_visit_sessions
FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_tenant_id()
  AND (
    public.get_current_user_role() IN ('clinic_admin', 'super_admin', 'receptionist')
    OR (
      public.get_current_user_role() = 'doctor'
      AND doctor_id = auth.uid()
      AND session_status <> 'completed'
    )
  )
)
WITH CHECK (
  tenant_id = public.get_current_tenant_id()
  AND (
    public.get_current_user_role() IN ('clinic_admin', 'super_admin', 'receptionist')
    OR (
      public.get_current_user_role() = 'doctor'
      AND doctor_id = auth.uid()
      AND session_status <> 'completed'
    )
  )
);

COMMIT;
