-- 074_clinic_users_full_name_ar_compatibility.sql
-- Restore the Blueprint-required Arabic staff display field used by the E2E seed.
-- Existing clinic_users columns and constraints remain unchanged.

ALTER TABLE public.clinic_users
  ADD COLUMN IF NOT EXISTS full_name_ar VARCHAR(255);
