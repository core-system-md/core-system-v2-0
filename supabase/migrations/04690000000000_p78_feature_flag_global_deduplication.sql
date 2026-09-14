-- P78 compatibility bridge.
-- Evidence: migration 010 defines feature_flags as a global table with a
-- globally unique key and no tenant_id/deleted_at columns.
-- Therefore tenant-scoped/global-row reconciliation is not applicable to
-- the canonical schema. Keep this migration syntactically valid without
-- inventing schema fields or changing the existing table contract.
DO $$
BEGIN
  NULL;
END;
$$;
