-- ============================================================
-- Migration 035: Drop Dead Functions
-- Phase: P15 — Safe Dead RPC Removal
-- Verified: No active callers, no dependents, no overloaded versions
-- Date: 2026-07-21
-- ============================================================

-- G31: validate_email_password — p_password unused, no callers
DROP FUNCTION IF EXISTS validate_email_password(TEXT, TEXT, UUID);

-- G32b: get_patient_longitudinal — no callers, table RLS protected
DROP FUNCTION IF EXISTS get_patient_longitudinal(UUID);

-- G32c: get_agenda_for_doctor — no callers, table RLS protected
DROP FUNCTION IF EXISTS get_agenda_for_doctor(UUID, DATE);

-- G32d: detect_leakage_gaps — wrapper exists but uncalled, returns COUNT only
DROP FUNCTION IF EXISTS detect_leakage_gaps();