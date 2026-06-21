-- 020_session_status_fix.sql
-- Fix session_status enum if needed

-- If using VARCHAR instead of enum (safer for migrations)
ALTER TABLE clinic_visit_sessions 
ALTER COLUMN session_status TYPE VARCHAR(30);

-- Add missing status values if using CHECK constraint
-- ALTER TABLE clinic_visit_sessions 
-- ADD CONSTRAINT chk_session_status 
-- CHECK (session_status IN ('waiting', 'in_consultation', 'pending_close', 'closed', 'System_Closed_Timeout'));
