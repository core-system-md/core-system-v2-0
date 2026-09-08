-- P85: enforce tenant-scoped access for clinic_patients.
-- Evidence: Production rls_patients_isolation previously used tenant_id IS NOT NULL,
-- while Blueprint requires tenant_id = get_current_tenant_id().
-- Scope: one existing RLS policy; no schema, RPC, Auth, or data changes.

DROP POLICY IF EXISTS rls_patients_isolation ON clinic_patients;

CREATE POLICY rls_patients_isolation
  ON clinic_patients
  FOR ALL
  USING (tenant_id = get_current_tenant_id());
