-- Reconcile isolated migration replay with the canonical Production schema.
-- Evidence: Production exposes the survey lifecycle fields used by
-- save_patient_intake_page(), plus the session governance timestamp fields
-- consumed by governance triggers. The historical 006/008 migrations predate
-- those canonical fields.
-- Scope: additive/local-replay schema reconciliation; no RPC signature change.

ALTER TABLE public.clinic_visit_sessions
  ADD COLUMN IF NOT EXISTS session_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS session_ended_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS visit_closed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS buffer_window_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS auto_close_at timestamptz NULL;

ALTER TABLE public.patient_intake_responses
  ADD COLUMN IF NOT EXISTS visit_type_selection varchar(20) NULL,
  ADD COLUMN IF NOT EXISTS service_reason varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS procedures_requested text[] NULL,
  ADD COLUMN IF NOT EXISTS consent_accepted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz NULL,
  ADD COLUMN IF NOT EXISTS service_interest varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS visit_goal varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS consideration_period varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS readiness_level smallint NULL,
  ADD COLUMN IF NOT EXISTS decision_factor varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS referral_source varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS followup_importance smallint NULL,
  ADD COLUMN IF NOT EXISTS top_priorities text[] NULL,
  ADD COLUMN IF NOT EXISTS main_concern varchar(255) NULL,
  ADD COLUMN IF NOT EXISTS openness_to_proceed smallint NULL,
  ADD COLUMN IF NOT EXISTS digital_signature_svg text NULL,
  ADD COLUMN IF NOT EXISTS signature_timestamp timestamptz NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_redirect_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS completion_status varchar(20) DEFAULT 'incomplete',
  ADD COLUMN IF NOT EXISTS ip_address inet NULL,
  ADD COLUMN IF NOT EXISTS user_agent text NULL,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

-- Remove legacy columns that are absent from the canonical Production schema
-- and would otherwise remain NOT NULL during isolated replay.
ALTER TABLE public.patient_intake_responses
  DROP COLUMN IF EXISTS form_type,
  DROP COLUMN IF EXISTS form_version,
  DROP COLUMN IF EXISTS responses,
  DROP COLUMN IF EXISTS consent_given,
  DROP COLUMN IF EXISTS consent_at,
  DROP COLUMN IF EXISTS consent_ip,
  DROP COLUMN IF EXISTS is_complete;

-- Canonical Production contract: one intake response per session.
CREATE UNIQUE INDEX IF NOT EXISTS patient_intake_responses_session_id_key
  ON public.patient_intake_responses(session_id);
