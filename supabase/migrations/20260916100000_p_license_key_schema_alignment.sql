-- ============================================================
-- P-License: Align master_tenants license schema with the
-- canonical validate_license RPC contract.
--
-- Evidence:
-- - validate_license(p_license_key TEXT) queries master_tenants.license_key
-- - application and generated DB types already use license_key
-- - the base master_tenants migration did not create license_key
--
-- Keep this as a forward migration so existing databases can be
-- reconciled without rewriting historical migration files.
-- ============================================================

ALTER TABLE public.master_tenants
  ADD COLUMN IF NOT EXISTS license_key TEXT;

CREATE INDEX IF NOT EXISTS idx_master_tenants_license_key
  ON public.master_tenants (license_key);
