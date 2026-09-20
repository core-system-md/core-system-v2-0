-- 038_analytics_snapshot_upsert_support.sql
-- P37-A: Restore the canonical analytics warehouse tables required by
-- Blueprint Sections 18-19 before applying later analytics governance.
-- Evidence: Blueprint defines analytics_daily_snapshots and
-- analytics_patient_metrics; migration 044 later adds deleted_at.

CREATE TABLE IF NOT EXISTS public.analytics_daily_snapshots (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES master_tenants(id),
  snapshot_date               DATE NOT NULL,
  total_visits                INTEGER DEFAULT 0,
  total_new_patients          INTEGER DEFAULT 0,
  total_returning_patients    INTEGER DEFAULT 0,
  total_no_shows              INTEGER DEFAULT 0,
  total_cancellations         INTEGER DEFAULT 0,
  total_revenue_subunits      BIGINT DEFAULT 0,
  total_discounts_subunits    INTEGER DEFAULT 0,
  avg_wait_time_minutes       NUMERIC(5,1) DEFAULT 0,
  avg_session_duration_minutes NUMERIC(5,1) DEFAULT 0,
  avg_core_score              NUMERIC(5,1) DEFAULT 0,
  sla_breaches_count          INTEGER DEFAULT 0,
  hot_leads_count             INTEGER DEFAULT 0,
  conversion_rate             NUMERIC(5,2) DEFAULT 0,
  snapshot_metadata           JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.analytics_patient_metrics (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES master_tenants(id),
  metric_period         VARCHAR(20) NOT NULL
    CHECK (metric_period IN ('weekly','monthly','quarterly')),
  period_start          DATE NOT NULL,
  period_end            DATE NOT NULL,
  new_patients          INTEGER DEFAULT 0,
  reactivated_patients  INTEGER DEFAULT 0,
  churned_patients      INTEGER DEFAULT 0,
  avg_ltv_subunits      BIGINT DEFAULT 0,
  avg_disc_distribution JSONB DEFAULT '{}',
  top_procedures        JSONB DEFAULT '[]',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'analytics_daily_snapshots_tenant_date_unique'
    AND conrelid = 'analytics_daily_snapshots'::regclass
  ) THEN
    ALTER TABLE public.analytics_daily_snapshots
    ADD CONSTRAINT analytics_daily_snapshots_tenant_date_unique
    UNIQUE (tenant_id, snapshot_date);
  END IF;
END $$;
