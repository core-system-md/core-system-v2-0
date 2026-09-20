-- P-SurveySchema: align the legacy local intake table with the active survey RPC contract.
--
-- Production and save_patient_intake_page() use the canonical page-level columns.
-- The original 008 migration still contains the older form_type/responses contract.
-- This is additive/forward-only and keeps legacy columns for compatibility.

ALTER TABLE public.patient_intake_responses
  ALTER COLUMN form_type SET DEFAULT 'new_patient';

ALTER TABLE public.patient_intake_responses
  ADD COLUMN IF NOT EXISTS visit_type_selection VARCHAR(50),
  ADD COLUMN IF NOT EXISTS service_reason VARCHAR(500),
  ADD COLUMN IF NOT EXISTS procedures_requested TEXT[],
  ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN,
  ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS service_interest VARCHAR(255),
  ADD COLUMN IF NOT EXISTS visit_goal VARCHAR(500),
  ADD COLUMN IF NOT EXISTS consideration_period VARCHAR(100),
  ADD COLUMN IF NOT EXISTS readiness_level SMALLINT,
  ADD COLUMN IF NOT EXISTS decision_factor VARCHAR(255),
  ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255),
  ADD COLUMN IF NOT EXISTS followup_importance SMALLINT,
  ADD COLUMN IF NOT EXISTS top_priorities TEXT[],
  ADD COLUMN IF NOT EXISTS main_concern VARCHAR(500),
  ADD COLUMN IF NOT EXISTS openness_to_proceed SMALLINT,
  ADD COLUMN IF NOT EXISTS digital_signature_svg TEXT,
  ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_redirect_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completion_status VARCHAR(30) DEFAULT 'incomplete',
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS patient_intake_responses_session_id_key
  ON public.patient_intake_responses(session_id);
