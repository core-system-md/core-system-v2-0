-- 0462_p78_feature_flag_global_deduplication.sql
-- P78: migrate the legacy feature_flags shape to the current Blueprint/Production
-- contract, then enforce one active global default per flag key.

ALTER TABLE public.feature_flags
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.master_tenants(id),
  ADD COLUMN IF NOT EXISTS allowed_tiers TEXT[] DEFAULT ARRAY['enterprise']::TEXT[],
  ADD COLUMN IF NOT EXISTS config_json JSONB DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Rename legacy columns into the active contract rather than duplicating state.
DO $p0462$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='feature_flags' AND column_name='key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='feature_flags' AND column_name='flag_key'
  ) THEN
    ALTER TABLE public.feature_flags RENAME COLUMN key TO flag_key;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='feature_flags' AND column_name='name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='feature_flags' AND column_name='flag_name'
  ) THEN
    ALTER TABLE public.feature_flags RENAME COLUMN name TO flag_name;
  END IF;
END
$p0462$;

-- Preserve legacy condition payloads as the current JSON configuration and
-- derive tier gates where the old payload provided tenant_tiers.
UPDATE public.feature_flags
SET config_json = COALESCE(config_json, conditions, '{}'::JSONB),
    allowed_tiers = CASE
      WHEN jsonb_typeof(COALESCE(conditions, '{}'::JSONB)->'tenant_tiers') = 'array'
        THEN ARRAY(
          SELECT jsonb_array_elements_text(COALESCE(conditions, '{}'::JSONB)->'tenant_tiers')
        )
      ELSE COALESCE(allowed_tiers, ARRAY['enterprise']::TEXT[])
    END
WHERE config_json IS NULL OR config_json = '{}'::JSONB;

ALTER TABLE public.feature_flags
  ALTER COLUMN flag_key SET NOT NULL,
  ALTER COLUMN flag_name SET NOT NULL;

-- New writes use the active columns; legacy conditions remain only as historical
-- source data when present and do not participate in authorization.
ALTER TABLE public.feature_flags
  DROP CONSTRAINT IF EXISTS feature_flags_key_key;

-- The Blueprint permits tenant-specific overrides and a single active global row.
CREATE UNIQUE INDEX IF NOT EXISTS uq_feature_flags_tenant_active
  ON public.feature_flags (tenant_id, flag_key)
  WHERE tenant_id IS NOT NULL AND deleted_at IS NULL;

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY flag_key
           ORDER BY created_at, id
         ) AS rn
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