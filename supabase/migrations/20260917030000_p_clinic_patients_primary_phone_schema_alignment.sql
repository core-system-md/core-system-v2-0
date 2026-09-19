-- P-ClinicPatients: Align the canonical patient primary-phone field.
--
-- Evidence:
-- - Blueprint v2.1 defines clinic_patients.phone_primary.
-- - Active application code and generated Supabase types use phone_primary.
-- - Production has phone_primary; the isolated migration chain does not.
-- - E2E seed requires phone_primary, exposing migration-chain drift.
--
-- Keep this as a forward migration; do not modify historical migrations.

ALTER TABLE public.clinic_patients
  ADD COLUMN IF NOT EXISTS phone_primary VARCHAR(20);