-- 015_patient_identity.sql
-- Add structured name fields for medical compliance and insurance interoperability
-- NOTE: full_name remains the active display field for existing patients.
-- first_name / father_name / last_name are nullable, populated for new
-- patients only. Backfill of existing records is manual/admin-driven.
-- Algorithmic splitting of Arabic names is unsafe for medical identity.
BEGIN;
ALTER TABLE clinic_patients
    ADD COLUMN first_name TEXT,
    ADD COLUMN father_name TEXT,
    ADD COLUMN last_name TEXT,
    ADD COLUMN first_name_ar TEXT,
    ADD COLUMN father_name_ar TEXT,
    ADD COLUMN last_name_ar TEXT;
CREATE INDEX idx_clinic_patients_name_structure 
    ON clinic_patients(tenant_id, first_name, father_name, last_name);
COMMIT;
