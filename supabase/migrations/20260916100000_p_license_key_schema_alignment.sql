-- ============================================================
-- P-License: Align master_tenants with the canonical licensing contract.
--
-- Evidence:
-- - validate_license(p_license_key TEXT) reads license_key + deleted_at.
-- - Production and the Blueprint expect master_tenants.deleted_at.
-- - The replayed repository schema was missing both columns at the
--   base table definition, creating schema drift for the RPC contract.
--
-- Keep this as a forward migration so existing databases can be
-- reconciled without rewriting historical migration files.
-- ============================================================

ALTER TABLE public.master_tenants
  ADD COLUMN IF NOT EXISTS license_key TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_master_tenants_license_key
  ON public.master_tenants (license_key)
  WHERE deleted_at IS NULL;
