-- P-Intake: Align patient intake responses with the current soft-delete contract.
--
-- Evidence:
-- - 008_retention.sql created patient_intake_responses without deleted_at.
-- - Production has patient_intake_responses.deleted_at and P137 records it as
--   an active soft-delete table.
-- - E2E reset and SyncEngine already use deleted_at for this table.
-- - Blueprint text is internally inconsistent here (it describes the table as
--   append-only), but the active application, Constitution, P137 evidence, and
--   production schema all require the current soft-delete field.
--
-- Keep this as a forward migration so historical migrations remain untouched.

ALTER TABLE public.patient_intake_responses
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_patient_intake_responses_tenant_active
  ON public.patient_intake_responses (tenant_id)
  WHERE deleted_at IS NULL;