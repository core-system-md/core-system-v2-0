-- 038_analytics_snapshot_upsert_support.sql
-- P37-A: Add unique constraint for analytics_daily_snapshots upsert

DO $$
DECLARE
  snapshots_table regclass;
BEGIN
  snapshots_table := to_regclass('public.analytics_daily_snapshots');

  IF snapshots_table IS NULL THEN
    RAISE NOTICE 'analytics_daily_snapshots is not present yet; skipping P37-A constraint';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'analytics_daily_snapshots_tenant_date_unique'
      AND conrelid = snapshots_table
  ) THEN
    ALTER TABLE public.analytics_daily_snapshots
      ADD CONSTRAINT analytics_daily_snapshots_tenant_date_unique
      UNIQUE (tenant_id, snapshot_date);
  END IF;
END $$;
