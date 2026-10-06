-- P102 — Restrict audit trail read policy to signed-in users only
-- Existing tenant and role predicates are preserved unchanged.
DROP POLICY IF EXISTS rls_audit_read ON public.audit_trail;
CREATE POLICY rls_audit_read
  ON public.audit_trail
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() = ANY (ARRAY['clinic_admin'::text, 'super_admin'::text])
  );
