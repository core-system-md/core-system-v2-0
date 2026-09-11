-- Master Test #116/#117: isolated replay must expose the canonical Doctor session fields.
-- Production and Blueprint evidence require these runtime fields on clinic_visit_sessions.
-- Scope: additive isolated-replay compatibility only; no auth/RLS/RPC contract change.

ALTER TABLE public.clinic_visit_sessions
  ADD COLUMN IF NOT EXISTS core_score_backend smallint,
  ADD COLUMN IF NOT EXISTS patient_class varchar(20);
