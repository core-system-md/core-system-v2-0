-- P130: Prevent updates to logically deleted clinic visit sessions.
-- Existing tenant/role/doctor ownership semantics are preserved.
-- Constitution soft-delete requires a deleted_at boundary for tenant-owned tables.
-- clinic_visit_sessions did not previously have that column, so this migration
-- creates the missing prerequisite before applying the RLS write boundary.

ALTER TABLE public.clinic_visit_sessions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

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
      AND primary_doctor_id = (SELECT auth.uid())
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
      AND primary_doctor_id = (SELECT auth.uid())
      AND session_status <> 'completed'::text
    )
  )
);
