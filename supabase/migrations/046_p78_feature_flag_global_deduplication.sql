-- P78: Reconcile duplicate global feature-flag rows.
-- The initial platform migration uses the legacy key/name/conditions shape.
-- Production uses the Blueprint feature_flags shape (tenant_id/flag_key/etc.).
-- Bridge the legacy replay schema here so the historical migration chain can
-- be replayed deterministically without changing Production migration history.

ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.master_tenants(id),
  ADD COLUMN IF NOT EXISTS flag_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS flag_name TEXT,
  ADD COLUMN IF NOT EXISTS allowed_tiers TEXT[] DEFAULT ARRAY['enterprise'],
  ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.feature_flags
SET flag_key = COALESCE(flag_key, key),
    flag_name = COALESCE(flag_name, name),
    config_json = COALESCE(config_json, conditions, '{}'::jsonb),
    allowed_tiers = COALESCE(allowed_tiers, ARRAY['enterprise']::TEXT[])
WHERE flag_key IS NULL
   OR flag_name IS NULL
   OR config_json IS NULL
   OR allowed_tiers IS NULL;

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
