-- 020_session_status_fix.sql
-- Fix session_status enum if needed

-- Align the legacy session CHECK with the canonical v2.1 lifecycle.
ALTER TABLE clinic_visit_sessions
  DROP CONSTRAINT IF EXISTS clinic_visit_sessions_status_check;

ALTER TABLE clinic_visit_sessions
  ADD CONSTRAINT clinic_visit_sessions_status_check CHECK (
    session_status IN (
      'waiting',
      'in_consultation',
      'pending_close',
      'auto_closed',
      'completed',
      'cancelled',
      'System_Closed_Timeout',
      'pending',
      'checked_in',
      'in_progress',
      'no_show',
      'abandoned',
      'rescheduled'
    )
  );


-- Restore the evolved v2.1 session columns before downstream RPCs/triggers use them.
ALTER TABLE public.clinic_visit_sessions
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.clinic_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.clinic_rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS session_ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visit_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS waiting_time_minutes SMALLINT,
  ADD COLUMN IF NOT EXISTS session_duration_minutes SMALLINT,
  ADD COLUMN IF NOT EXISTS core_score_backend SMALLINT,
  ADD COLUMN IF NOT EXISTS core_score_display NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS patient_class VARCHAR(20),
  ADD COLUMN IF NOT EXISTS scoring_mode VARCHAR(20) DEFAULT 'first_time',
  ADD COLUMN IF NOT EXISTS par_result VARCHAR(30),
  ADD COLUMN IF NOT EXISTS prestige_inflation_detected BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prestige_inflation_factor NUMERIC(4,3) DEFAULT 1.000,
  ADD COLUMN IF NOT EXISTS triangulation_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS buffer_window_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS auto_close_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

UPDATE public.clinic_visit_sessions
SET doctor_id = COALESCE(doctor_id, primary_doctor_id),
    room_id = COALESCE(room_id, assigned_room_id),
    arrived_at = COALESCE(arrived_at, actual_check_in),
    session_started_at = COALESCE(session_started_at, actual_start),
    session_ended_at = COALESCE(session_ended_at, actual_end),
    visit_closed_at = COALESCE(visit_closed_at, actual_check_out),
    waiting_time_minutes = COALESCE(
      waiting_time_minutes,
      CASE
        WHEN actual_check_in IS NOT NULL AND actual_start IS NOT NULL
        THEN GREATEST(0, EXTRACT(EPOCH FROM (actual_start - actual_check_in)) / 60)::SMALLINT
        ELSE NULL
      END
    ),
    session_duration_minutes = COALESCE(
      session_duration_minutes,
      CASE
        WHEN actual_start IS NOT NULL AND actual_end IS NOT NULL
        THEN GREATEST(0, EXTRACT(EPOCH FROM (actual_end - actual_start)) / 60)::SMALLINT
        ELSE NULL
      END
    )
WHERE doctor_id IS NULL
   OR room_id IS NULL
   OR arrived_at IS NULL
   OR session_started_at IS NULL
   OR session_ended_at IS NULL
   OR visit_closed_at IS NULL
   OR waiting_time_minutes IS NULL
   OR session_duration_minutes IS NULL;

ALTER TABLE public.clinic_visit_sessions
  DROP CONSTRAINT IF EXISTS clinic_visit_sessions_patient_class_check,
  DROP CONSTRAINT IF EXISTS clinic_visit_sessions_scoring_mode_check,
  DROP CONSTRAINT IF EXISTS clinic_visit_sessions_par_result_check,
  DROP CONSTRAINT IF EXISTS clinic_visit_sessions_core_score_backend_check,
  DROP CONSTRAINT IF EXISTS clinic_visit_sessions_core_score_display_check;

ALTER TABLE public.clinic_visit_sessions
  ADD CONSTRAINT clinic_visit_sessions_patient_class_check
    CHECK (patient_class IS NULL OR patient_class IN ('low_priority','medium_priority','high_priority','qualified','hot_lead')),
  ADD CONSTRAINT clinic_visit_sessions_scoring_mode_check
    CHECK (scoring_mode IS NULL OR scoring_mode IN ('first_time','weighted_ltv')),
  ADD CONSTRAINT clinic_visit_sessions_par_result_check
    CHECK (par_result IS NULL OR par_result IN ('full_acceptance','partial_acceptance','deferred','rejection','no_decision')),
  ADD CONSTRAINT clinic_visit_sessions_core_score_backend_check
    CHECK (core_score_backend IS NULL OR (core_score_backend BETWEEN 0 AND 1000)),
  ADD CONSTRAINT clinic_visit_sessions_core_score_display_check
    CHECK (core_score_display IS NULL OR (core_score_display BETWEEN 0 AND 100));

CREATE INDEX IF NOT EXISTS idx_sessions_tenant_doctor_status
  ON public.clinic_visit_sessions(tenant_id, doctor_id, session_status);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant_room_status
  ON public.clinic_visit_sessions(tenant_id, room_id, session_status);

-- Governance trigger 021 also observes the canonical invoice contract.
ALTER TABLE clinic_invoices
  ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(20) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS doctor_par_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS collected_reception BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS amount_paid_subunits INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS match_triangulation BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE clinic_invoices
  DROP CONSTRAINT IF EXISTS clinic_invoices_invoice_status_check;

ALTER TABLE clinic_invoices
  ADD CONSTRAINT clinic_invoices_invoice_status_check CHECK (
    invoice_status IN ('draft','issued','paid','partial','cancelled','refunded')
  );

-- The governance trigger in 021 observes the six behavioral score columns.
-- They belong to the session schema and must exist before governance triggers are created.
ALTER TABLE clinic_visit_sessions
  ADD COLUMN IF NOT EXISTS score_aps SMALLINT CHECK (score_aps IS NULL OR score_aps BETWEEN 0 AND 1000),
  ADD COLUMN IF NOT EXISTS score_dri SMALLINT CHECK (score_dri IS NULL OR score_dri BETWEEN 0 AND 1000),
  ADD COLUMN IF NOT EXISTS score_tsi SMALLINT CHECK (score_tsi IS NULL OR score_tsi BETWEEN 0 AND 1000),
  ADD COLUMN IF NOT EXISTS score_uri SMALLINT CHECK (score_uri IS NULL OR score_uri BETWEEN 0 AND 1000),
  ADD COLUMN IF NOT EXISTS score_pqs SMALLINT CHECK (score_pqs IS NULL OR score_pqs BETWEEN 0 AND 1000),
  ADD COLUMN IF NOT EXISTS score_rvs SMALLINT CHECK (score_rvs IS NULL OR score_rvs BETWEEN 0 AND 1000);


-- If using VARCHAR instead of enum (safer for migrations)
ALTER TABLE clinic_visit_sessions 
ALTER COLUMN session_status TYPE VARCHAR(30);

-- Add missing status values if using CHECK constraint
-- ALTER TABLE clinic_visit_sessions 
-- ADD CONSTRAINT chk_session_status 
-- CHECK (session_status IN ('waiting', 'in_consultation', 'pending_close', 'closed', 'System_Closed_Timeout'));
