-- P-ClinicUsers: Align clinic_users with the repository's canonical soft-delete contract.
--
-- Evidence:
-- - 002_tenants_users.sql creates clinic_users without deleted_at.
-- - E2E seed/reset/reconciliation and multiple authorization boundaries already
--   treat clinic_users.deleted_at as canonical state.
-- - Blueprint documents deleted_at on clinic_users and partial indexes that use it.
--
-- Keep this as a forward migration so historical migrations remain untouched.

ALTER TABLE public.clinic_users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clinic_users_tenant_active
  ON public.clinic_users (tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_clinic_users_role_active
  ON public.clinic_users (tenant_id, role)
  WHERE deleted_at IS NULL;
