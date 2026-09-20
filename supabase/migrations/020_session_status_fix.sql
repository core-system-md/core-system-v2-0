-- 020_session_status_fix.sql
-- Fix session_status enum if needed

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
