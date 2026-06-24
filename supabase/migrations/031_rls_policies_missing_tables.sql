-- Migration 031: RLS Policies for analytics_events, currency_reference, medical_procedure_taxonomy
-- Date: 2026-06-24

CREATE POLICY IF NOT EXISTS rls_analytics_events_select
  ON analytics_events FOR SELECT
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY IF NOT EXISTS rls_currency_reference_select
  ON currency_reference FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS rls_taxonomy_select
  ON medical_procedure_taxonomy FOR SELECT
  USING (true);
