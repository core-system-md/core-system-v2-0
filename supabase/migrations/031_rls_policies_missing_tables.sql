-- Migration 031: RLS Policies for analytics_events, currency_reference, medical_procedure_taxonomy
-- Date: 2026-06-24
-- PostgreSQL does not support CREATE POLICY IF NOT EXISTS; keep migration idempotent
-- with explicit DROP POLICY IF EXISTS before CREATE POLICY.

DROP POLICY IF EXISTS rls_analytics_events_select ON analytics_events;
CREATE POLICY rls_analytics_events_select
  ON analytics_events
  FOR SELECT
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS rls_currency_reference_select ON currency_reference;
CREATE POLICY rls_currency_reference_select
  ON currency_reference
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS rls_taxonomy_select ON medical_procedure_taxonomy;
CREATE POLICY rls_taxonomy_select
  ON medical_procedure_taxonomy
  FOR SELECT
  USING (true);
