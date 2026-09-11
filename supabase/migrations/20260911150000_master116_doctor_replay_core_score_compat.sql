-- Master Test #116: isolated replay must expose the canonical Doctor CORE score field.
-- Production and Blueprint evidence require clinic_visit_sessions.core_score_backend.

ALTER TABLE public.clinic_visit_sessions
  ADD COLUMN IF NOT EXISTS core_score_backend smallint;
