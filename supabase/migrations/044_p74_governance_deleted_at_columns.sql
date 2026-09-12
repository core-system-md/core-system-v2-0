-- P74: Constitution-required soft-delete column for tenant-owned tables.
-- Global reference tables (currency_reference, medical_procedure_taxonomy) are excluded.

-- The canonical analytics_patient_metrics table is part of the Blueprint schema
-- and is required by subsequent governance migrations. The migration chain
-- previously referenced it without creating it in the isolated database.
CREATE TABLE IF NOT EXISTS public.analytics_patient_metrics (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID NOT NULL REFERENCES public.master_tenants(id),
  metric_period          VARCHAR(20) NOT NULL CHECK (metric_period IN ('weekly','monthly','quarterly')),
  period_start           DATE NOT NULL,
  period_end             DATE NOT NULL,
  new_patients           INTEGER,
  churned_patients       INTEGER,
  reactivated_patients   INTEGER,
  avg_ltv_subunits       BIGINT,
  avg_disc_distribution  JSONB,
  top_procedures         JSONB,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
