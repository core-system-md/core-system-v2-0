-- Migration 026: RLS policies for tables missing policies
-- Constitution §9.2 — ALL 26 tables must have RLS policies

-- Table 24: analytics_events
DROP POLICY IF EXISTS rls_analytics_events_isolation ON analytics_events;
CREATE POLICY rls_analytics_events_isolation ON analytics_events
  FOR ALL USING (tenant_id = get_current_tenant_id());

-- Table 25: currency_reference (global read, super_admin write)
DROP POLICY IF EXISTS rls_currency_ref_read ON currency_reference;
DROP POLICY IF EXISTS rls_currency_ref_write ON currency_reference;
CREATE POLICY rls_currency_ref_read ON currency_reference FOR SELECT USING (true);
CREATE POLICY rls_currency_ref_write ON currency_reference 
  FOR ALL USING (get_current_user_role() = 'super_admin');

-- Table 26: medical_procedure_taxonomy (global read, super_admin write)
DROP POLICY IF EXISTS rls_taxonomy_read ON medical_procedure_taxonomy;
DROP POLICY IF EXISTS rls_taxonomy_write ON medical_procedure_taxonomy;
CREATE POLICY rls_taxonomy_read ON medical_procedure_taxonomy FOR SELECT USING (true);
CREATE POLICY rls_taxonomy_write ON medical_procedure_taxonomy 
  FOR ALL USING (get_current_user_role() = 'super_admin');
