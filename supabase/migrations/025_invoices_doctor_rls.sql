-- Migration 025: Fix clinic_invoices RLS to block doctors
-- Critical security fix: doctors could access invoices via direct API

-- Drop existing select policy (it only checks tenant_id, not role)
DROP POLICY IF EXISTS invoices_select ON clinic_invoices;

-- New policy: Block doctors completely from invoices
CREATE POLICY invoices_select ON clinic_invoices
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() != 'doctor'
  );

-- Also update other policies to block doctors
DROP POLICY IF EXISTS invoices_insert ON clinic_invoices;
CREATE POLICY invoices_insert ON clinic_invoices
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() != 'doctor'
  );

DROP POLICY IF EXISTS invoices_update ON clinic_invoices;
CREATE POLICY invoices_update ON clinic_invoices
  FOR UPDATE
  USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() != 'doctor'
  );

DROP POLICY IF EXISTS invoices_delete ON clinic_invoices;
CREATE POLICY invoices_delete ON clinic_invoices
  FOR DELETE
  USING (
    tenant_id = get_current_tenant_id()
    AND get_current_user_role() != 'doctor'
  );

-- Keep the super_admin override
DROP POLICY IF EXISTS invoices_super_admin ON clinic_invoices;
CREATE POLICY invoices_super_admin ON clinic_invoices
  FOR ALL
  USING (get_current_user_role() = 'super_admin');
