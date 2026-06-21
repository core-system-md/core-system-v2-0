-- 022_rls_policies.sql
-- RLS Policies for tables with RLS enabled but no policies

-- analytics_events: SELECT open to all authenticated users (read-only analytics)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_analytics_events_select ON analytics_events;
CREATE POLICY rls_analytics_events_select
ON analytics_events
FOR SELECT
TO authenticated
USING (true);

-- currency_reference: SELECT open to all (global reference data)
ALTER TABLE currency_reference ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_currency_reference_select ON currency_reference;
CREATE POLICY rls_currency_reference_select
ON currency_reference
FOR SELECT
TO authenticated
USING (true);

-- medical_procedure_taxonomy: SELECT open to all (global taxonomy)
ALTER TABLE medical_procedure_taxonomy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_taxonomy_select ON medical_procedure_taxonomy;
CREATE POLICY rls_taxonomy_select
ON medical_procedure_taxonomy
FOR SELECT
TO authenticated
USING (true);
