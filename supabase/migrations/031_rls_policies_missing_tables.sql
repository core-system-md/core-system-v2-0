-- Migration 031: RLS Policies for analytics_events, currency_reference, medical_procedure_taxonomy
-- Date: 2026-06-24
--
-- Migration 022 creates SELECT policies with these names. Migration 026 then
-- establishes the canonical tenant-isolated / global-reference policies.
-- Keep this migration replay-safe by replacing the same named policies with
-- the intended definitions instead of failing on duplicate policy names.

DROP POLICY IF EXISTS rls_analytics_events_select ON analytics_events;
CREATE POLICY rls_analytics_events_select
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS rls_currency_reference_select ON currency_reference;
CREATE POLICY rls_currency_reference_select
  ON currency_reference
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS rls_taxonomy_select ON medical_procedure_taxonomy;
CREATE POLICY rls_taxonomy_select
  ON medical_procedure_taxonomy
  FOR SELECT
  TO authenticated
  USING (true);
