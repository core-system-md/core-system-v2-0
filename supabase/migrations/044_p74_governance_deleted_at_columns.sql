-- P74: Constitution-required soft-delete column for tenant-owned tables.
-- Global reference tables (currency_reference, medical_procedure_taxonomy) are excluded.

ALTER TABLE public.analytics_daily_snapshots
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE public.analytics_events
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE public.analytics_patient_metrics
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE public.audit_trail
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE public.billing_events
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE public.notification_queue
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE public.pin_attempt_log
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

ALTER TABLE public.pin_sessions
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
