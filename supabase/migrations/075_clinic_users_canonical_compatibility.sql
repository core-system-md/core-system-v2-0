-- 075_clinic_users_canonical_compatibility.sql
-- Evidence: Blueprint clinic_users contract and current E2E staff seed require
-- canonical staff profile/login fields that are absent from the base table.
-- Minimal compatibility-only repair; no RLS/auth policy changes.

ALTER TABLE public.clinic_users
  ADD COLUMN IF NOT EXISTS full_name_ar VARCHAR(255),
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS employee_code TEXT,
  ADD COLUMN IF NOT EXISTS pin_code TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clinic_users_employee_code
  ON public.clinic_users(employee_code);
