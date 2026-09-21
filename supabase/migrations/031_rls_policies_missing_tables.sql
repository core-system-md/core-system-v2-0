-- Migration 031: RLS Policies for analytics_events, currency_reference, medical_procedure_taxonomy
-- Date: 2026-06-24

DROP POLICY IF EXISTS rls_analytics_events_select;
CREATE POLICY rls_analytics_events_select
  ON analytics_events FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS rls_currency_reference_select;
CREATE POLICY rls_currency_reference_select
  ON currency_reference FOR SELECT
  USING (true);

DROP POLICY IF EXISTS rls_taxonomy_select;
CREATE POLICY rls_taxonomy_select
  ON medical_procedure_taxonomy FOR SELECT
  USING (true);
