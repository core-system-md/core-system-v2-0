-- 029_update_scheduled_start.sql
-- Preserve the production data adjustment when the licensing column exists,
-- while allowing a fresh migration chain to proceed before tenant licensing
-- columns are introduced by the later schema-alignment migrations.
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
        SELECT id
        FROM master_tenants
        WHERE license_key = 'DEMO-LICENSE-2024'
      );
    $sql$;
  END IF;
END;
$$;
