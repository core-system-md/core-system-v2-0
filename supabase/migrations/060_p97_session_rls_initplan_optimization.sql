-- P97: optimize existing clinic session RLS predicates without changing access semantics.
-- Wrap stable auth/tenant/role lookups in scalar SELECTs so PostgreSQL can evaluate
-- them once per statement instead of re-evaluating them for every candidate row.

DROP POLICY IF EXISTS rls_sessions_select ON public.clinic_visit_sessions;
CREATE POLICY rls_sessions_select
ON public.clinic_visit_sessions
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  tenant_id = (SELECT public.get_current_tenant_id())
  AND (
    (SELECT public.get_current_user_role()) = ANY (
      ARRAY['clinic_admin'::text, 'super_admin'::text, 'receptionist'::text]
    )
    OR doctor_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS visit_sessions_update ON public.clinic_visit_sessions;
CREATE POLICY visit_sessions_update
ON public.clinic_visit_sessions
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  tenant_id = (SELECT public.get_current_tenant_id())
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
