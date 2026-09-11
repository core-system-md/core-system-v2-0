-- Master Test #116/#117: isolated replay must expose the canonical Doctor session fields.
-- Production and Blueprint evidence require these runtime fields on clinic_visit_sessions.
-- Scope: additive isolated-replay compatibility only; no auth/RLS/RPC contract change.

ALTER TABLE public.clinic_visit_sessions
  ADD COLUMN IF NOT EXISTS core_score_backend smallint,
  ADD COLUMN IF NOT EXISTS patient_class varchar(20),
  ADD COLUMN IF NOT EXISTS par_result varchar(30);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.clinic_visit_sessions'::regclass
      AND conname = 'clinic_visit_sessions_par_result_check'
  ) THEN
    ALTER TABLE public.clinic_visit_sessions
      ADD CONSTRAINT clinic_visit_sessions_par_result_check
      CHECK (par_result IS NULL OR par_result IN ('full_acceptance','partial_acceptance','deferred','rejection','no_decision'));
  END IF;
END $$;
