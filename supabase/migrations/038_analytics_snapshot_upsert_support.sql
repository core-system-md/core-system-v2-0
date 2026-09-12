-- 038_analytics_snapshot_upsert_support.sql
-- P37-A: Restore the canonical analytics snapshot table before adding
-- its tenant/date uniqueness required by the analytics snapshot upsert.
-- Evidence: Blueprint §18 defines this table; later migration 044 adds
-- deleted_at separately, so it is intentionally not introduced here.

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
