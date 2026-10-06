-- P130: Prevent updates to logically deleted clinic visit sessions.
-- Existing tenant/role/doctor ownership semantics are preserved.
-- Active session writes now require deleted_at IS NULL at the RLS boundary.

DROP POLICY IF EXISTS visit_sessions_update ON public.clinic_visit_sessions;
CREATE POLICY visit_sessions_update
ON public.clinic_visit_sessions
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  tenant_id = (SELECT public.get_current_tenant_id())
  AND deleted_at IS NULL
  AND (
    (SELECT public.get_current_user_role()) = ANY (
      ARRAY['clinic_admin'::text, 'super_admin'::text, 'receptionist'::text]
    )
    OR (
      (SELECT public.get_current_user_role()) = 'doctor'::text
      AND doctor_id = (SELECT auth.uid())
      AND session_status <> 'completed'::text
    )
  )
)
WITH CHECK (
  tenant_id = (SELECT public.get_current_tenant_id())
  AND deleted_at IS NULL
  AND (
    (SELECT public.get_current_user_role()) = ANY (
      ARRAY['clinic_admin'::text, 'super_admin'::text, 'receptionist'::text]
    )
    OR (
      (SELECT public.get_current_user_role()) = 'doctor'::text
      AND doctor_id = (SELECT auth.uid())
      AND session_status <> 'completed'::text
    )
  )
);
