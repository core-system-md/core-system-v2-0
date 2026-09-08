-- P78: Reconcile duplicate global feature-flag rows.
-- Tenant overrides are preserved. Global defaults use the oldest active row per flag_key.

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY flag_key ORDER BY created_at, id) AS rn
  FROM public.feature_flags
  WHERE tenant_id IS NULL AND deleted_at IS NULL
)
UPDATE public.feature_flags f
SET deleted_at = now(),
    updated_at = now()
FROM ranked r
WHERE f.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flags_global_active
ON public.feature_flags (flag_key)
WHERE tenant_id IS NULL AND deleted_at IS NULL;
