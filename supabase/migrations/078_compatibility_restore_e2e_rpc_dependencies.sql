-- CORE SYSTEM v2.1 — compatibility repair for isolated migration replay
-- Evidence:
-- 1) create_pin_session() and check_pin_rate_limit() already reference
--    pin_attempt_log.ip_address, and Production contains that canonical column.
-- 2) save_patient_intake_page() already uses the canonical five-page
--    patient_intake_responses columns and ON CONFLICT(session_id).
-- 3) Production contains the canonical survey columns and a UNIQUE(session_id)
--    constraint, while the early repository migration only created the legacy
--    retention-shaped table.
-- This migration restores only those missing replay dependencies. No RPC
-- signatures, auth model, RLS model, or production data are rewritten.

ALTER TABLE public.pin_attempt_log
  ADD COLUMN IF NOT EXISTS ip_address INET;

ALTER TABLE public.patient_intake_responses
  ADD COLUMN IF NOT EXISTS visit_type_selection VARCHAR(20),
  ADD COLUMN IF NOT EXISTS service_reason VARCHAR(255),
  ADD COLUMN IF NOT EXISTS procedures_requested TEXT[],
  ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS service_interest VARCHAR(100),
  ADD COLUMN IF NOT EXISTS visit_goal VARCHAR(100),
  ADD COLUMN IF NOT EXISTS consideration_period VARCHAR(50),
  ADD COLUMN IF NOT EXISTS readiness_level SMALLINT,
  ADD COLUMN IF NOT EXISTS decision_factor VARCHAR(50),
  ADD COLUMN IF NOT EXISTS referral_source VARCHAR(50),
  ADD COLUMN IF NOT EXISTS followup_importance SMALLINT,
  ADD COLUMN IF NOT EXISTS top_priorities TEXT[],
  ADD COLUMN IF NOT EXISTS main_concern VARCHAR(255),
  ADD COLUMN IF NOT EXISTS openness_to_proceed SMALLINT,
  ADD COLUMN IF NOT EXISTS digital_signature_svg TEXT,
  ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_redirect_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completion_status VARCHAR(20) DEFAULT 'incomplete',
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- The legacy base migration made form_type NOT NULL without a default.
-- Keep that legacy column backward-compatible for the canonical page-save RPC.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'patient_intake_responses'
      AND column_name = 'form_type'
  ) THEN
    ALTER TABLE public.patient_intake_responses
      ALTER COLUMN form_type SET DEFAULT 'new_patient';
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS patient_intake_responses_session_id_key
  ON public.patient_intake_responses(session_id);

GRANT EXECUTE ON FUNCTION public.save_patient_intake_page(UUID, INTEGER, JSONB)
  TO anon, authenticated;
