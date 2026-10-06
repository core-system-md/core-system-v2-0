-- Migration 033: restore schema prerequisites used by the RPC/seed lineage.
-- The original migration file was committed as a placeholder, leaving the
-- fresh-replay baseline without fields consumed by migrations 034+.
-- Additive and idempotent: no data is removed and no business rule is changed.

ALTER TABLE public.master_tenants
  ADD COLUMN IF NOT EXISTS license_key TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_master_tenants_license_key
  ON public.master_tenants(license_key)
  WHERE license_key IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE public.clinic_users
  ADD COLUMN IF NOT EXISTS full_name_ar TEXT,
  ADD COLUMN IF NOT EXISTS employee_code TEXT,
  ADD COLUMN IF NOT EXISTS pin_code TEXT,
  ADD COLUMN IF NOT EXISTS pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_users_employee_code_tenant
  ON public.clinic_users(tenant_id, employee_code)
  WHERE employee_code IS NOT NULL AND deleted_at IS NULL;