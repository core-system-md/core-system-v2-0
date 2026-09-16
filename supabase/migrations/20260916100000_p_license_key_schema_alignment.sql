-- ============================================================
-- P-License: Align master_tenants with the canonical licensing contract.
--
-- Evidence:
-- - validate_license(p_license_key TEXT) reads license_key + deleted_at.
-- - Production/Blueprint expect master_tenants.deleted_at.
-- - The E2E seed and active Super Admin UI use tenant presentation and
--   activation fields that were missing from the replayed base schema.
-- - Master Test #400 reached E2E and failed because master_tenants.is_active
--   was missing after the migration chain was replayed.
--
-- Keep this as a forward migration so existing databases can be
-- reconciled without rewriting historical migration files.
-- ============================================================

ALTER TABLE public.master_tenants
  ADD COLUMN IF NOT EXISTS license_key TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS clinic_name TEXT,
  ADD COLUMN IF NOT EXISTS clinic_name_ar TEXT,
  ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#1B2A4A',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'Asia/Amman';

-- Preserve existing tenant names when introducing the canonical
-- clinic_name field before enforcing the Blueprint's required value.
UPDATE public.master_tenants
SET clinic_name = name
WHERE clinic_name IS NULL;

ALTER TABLE public.master_tenants
  ALTER COLUMN clinic_name SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_master_tenants_license_key
  ON public.master_tenants (license_key)
  WHERE deleted_at IS NULL;
