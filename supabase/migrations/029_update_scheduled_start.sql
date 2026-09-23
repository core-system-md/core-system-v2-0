-- Historical demo-data normalization.
-- The legacy baseline used master_tenants.license_key, which is not part of
-- the current tenant schema. Keep backward compatibility when that column
-- exists; otherwise this migration is intentionally a no-op.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'master_tenants'
      AND column_name = 'license_key'
  ) THEN
    EXECUTE $sql$
      UPDATE clinic_visit_sessions
      SET scheduled_start = NOW(),
          updated_at = NOW()
      WHERE tenant_id = (
        SELECT id FROM master_tenants
        WHERE license_key = 'DEMO-LICENSE-2024'
      )
    $sql$;
  END IF;
END
$$;