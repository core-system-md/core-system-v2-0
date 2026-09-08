-- P87 correction: the hard-delete guard must be RESTRICTIVE so it cannot be
-- bypassed by an existing permissive FOR ALL policy.

BEGIN;

DO $do$
DECLARE
  t text;
  tables text[] := ARRAY[
    'clinic_patients',
    'master_agenda_events',
    'clinic_rooms',
    'clinic_procedures',
    'inventory_ledger',
    'retention_followups',
    'patient_intake_responses',
    'notification_queue',
    'tenant_devices',
    'core_rules_config',
    'tenant_health_scores',
    'analytics_daily_snapshots',
    'analytics_events',
    'analytics_patient_metrics'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS rls_deny_hard_delete ON public.%I', t);
    EXECUTE format('CREATE POLICY rls_deny_hard_delete ON public.%I AS RESTRICTIVE FOR DELETE TO public USING (false)', t);
  END LOOP;
END
$do$;

COMMIT;
