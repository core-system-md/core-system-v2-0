-- 038_analytics_snapshot_upsert_support.sql
-- P37-A: Add unique constraint for analytics_daily_snapshots upsert

DO $\$
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
END $\$;
