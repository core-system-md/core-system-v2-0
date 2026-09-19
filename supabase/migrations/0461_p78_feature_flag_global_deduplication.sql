-- P78: Reconcile duplicate global feature-flag rows.
--
-- The canonical migration chain stores feature flags as global rows keyed by
-- feature_flags.key, which is already UNIQUE NOT NULL. There is no tenant-scoped
-- tenant_id / flag_key / deleted_at contract in this schema, so the historical
-- tenant/global deduplication procedure is not applicable here.
--
-- Preserve the actual schema and data; this migration is intentionally a no-op.
SELECT 1;
