-- P-ClinicUsers: Align clinic_users with the canonical staff-profile schema.
--
-- Evidence:
-- - 002_tenants_users.sql predates the current staff-profile contract and lacks
--   full_name_ar, specialization, employee_code, pin_code, and phone.
-- - Blueprint v2.1 defines these columns on clinic_users.
-- - E2E staff seed writes all of these fields and currently fails at employee_code.
-- - Existing RPCs already read pin_code and rely on deleted_at.
--
-- Keep this as a forward migration so historical migrations remain untouched.

ALTER TABLE public.clinic_users
  ADD COLUMN IF NOT EXISTS full_name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS specialization VARCHAR(100),
  ADD COLUMN IF NOT EXISTS employee_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pin_code VARCHAR(4),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clinic_users_employee_code
  ON public.clinic_users (tenant_id, employee_code)
  WHERE employee_code IS NOT NULL;
