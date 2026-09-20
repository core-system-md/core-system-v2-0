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
