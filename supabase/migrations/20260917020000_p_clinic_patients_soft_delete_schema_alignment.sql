-- P-ClinicPatients: Align clinic_patients with the canonical soft-delete schema.
--
-- Evidence:
-- - 004_patients.sql predates the current patient soft-delete contract and
--   does not define deleted_at.
-- - Blueprint v2.1 defines deleted_at on clinic_patients and requires
--   active-row filtering through deleted_at IS NULL.
-- - E2E seed, reset, reconciliation, and application queries already rely
--   on clinic_patients.deleted_at.
-- - Production already has this column; the failure is isolated migration
--   chain drift, not a production data repair.
--
-- Keep this as a forward migration so historical migrations remain untouched.

ALTER TABLE public.clinic_patients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clinic_patients_tenant_active
  ON public.clinic_patients (tenant_id)
  WHERE deleted_at IS NULL;