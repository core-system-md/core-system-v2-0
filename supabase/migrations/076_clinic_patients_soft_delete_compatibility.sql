-- 076_clinic_patients_soft_delete_compatibility.sql
-- Evidence: Blueprint requires clinic_patients.deleted_at for the mandatory
-- soft-delete boundary, and the current E2E seed/reset/reconcile paths use it.
-- Minimal compatibility-only repair; no RLS/auth policy changes.

ALTER TABLE public.clinic_patients
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_clinic_patients_tenant_active
  ON public.clinic_patients(tenant_id)
  WHERE deleted_at IS NULL;
