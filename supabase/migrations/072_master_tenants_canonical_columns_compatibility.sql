-- 072_master_tenants_canonical_columns_compatibility.sql
-- Restore the canonical master_tenants schema required by the Blueprint,
-- active tenant access paths, and the existing E2E seed.
-- Existing columns are preserved; IF NOT EXISTS keeps this migration
-- compatible with environments that already contain the canonical fields.

ALTER TABLE public.master_tenants
  ADD COLUMN IF NOT EXISTS clinic_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS clinic_name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS max_devices SMALLINT NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS primary_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'JOD',
  ADD COLUMN IF NOT EXISTS currency_subunit INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7) DEFAULT '#1B2A4A',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_master_tenants_active
  ON public.master_tenants(is_active)
  WHERE deleted_at IS NULL;
