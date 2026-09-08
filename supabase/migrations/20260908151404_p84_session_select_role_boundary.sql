-- P84: Session SELECT role boundary
-- Blueprint: doctor sees own sessions; clinic_admin/super_admin/receptionist see tenant sessions.
-- Constitution: every RLS policy must be tenant-scoped.

DROP POLICY IF EXISTS rls_sessions_select ON public.clinic_visit_sessions;

CREATE POLICY rls_sessions_select
ON public.clinic_visit_sessions
FOR SELECT
TO authenticated
USING (
  tenant_id = get_current_tenant_id()
  AND (
    get_current_user_role() IN ('clinic_admin', 'super_admin', 'receptionist')
    OR doctor_id = auth.uid()
  )
);
