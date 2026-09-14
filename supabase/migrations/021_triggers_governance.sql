-- 021_triggers_governance.sql
-- Financial Governance Triggers for CORE SYSTEM v2.1

-- Canonical prerequisites used by the governance triggers.
-- These fields are defined by Blueprint v2.1 but are absent from the legacy
-- session/invoice base migrations that precede this migration.
ALTER TABLE clinic_visit_sessions
    ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES clinic_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES clinic_rooms(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS session_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS session_ended_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS visit_closed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS lock_holder_id UUID REFERENCES clinic_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS lock_timestamp TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS initialized_by_receptionist UUID REFERENCES clinic_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS is_insured BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS waiting_time_minutes SMALLINT,
    ADD COLUMN IF NOT EXISTS session_duration_minutes SMALLINT,
    ADD COLUMN IF NOT EXISTS score_aps SMALLINT CHECK (score_aps BETWEEN 0 AND 1000),
    ADD COLUMN IF NOT EXISTS score_dri SMALLINT CHECK (score_dri BETWEEN 0 AND 1000),
    ADD COLUMN IF NOT EXISTS score_tsi SMALLINT CHECK (score_tsi BETWEEN 0 AND 1000),
    ADD COLUMN IF NOT EXISTS score_uri SMALLINT CHECK (score_uri BETWEEN 0 AND 1000),
    ADD COLUMN IF NOT EXISTS score_pqs SMALLINT CHECK (score_pqs BETWEEN 0 AND 1000),
    ADD COLUMN IF NOT EXISTS score_rvs SMALLINT CHECK (score_rvs BETWEEN 0 AND 1000),
    ADD COLUMN IF NOT EXISTS core_score_backend SMALLINT CHECK (core_score_backend BETWEEN 0 AND 1000),
    ADD COLUMN IF NOT EXISTS core_score_display NUMERIC(5,1) CHECK (core_score_display BETWEEN 0 AND 100),
    ADD COLUMN IF NOT EXISTS patient_class VARCHAR(20),
    ADD COLUMN IF NOT EXISTS scoring_mode VARCHAR(20) DEFAULT 'first_time',
    ADD COLUMN IF NOT EXISTS par_result VARCHAR(30),
    ADD COLUMN IF NOT EXISTS prestige_inflation_detected BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS prestige_inflation_factor NUMERIC(4,3) DEFAULT 1.000,
    ADD COLUMN IF NOT EXISTS triangulation_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS buffer_window_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS auto_close_at TIMESTAMPTZ;

ALTER TABLE clinic_visit_sessions DROP CONSTRAINT IF EXISTS clinic_visit_sessions_status_check;
ALTER TABLE clinic_visit_sessions
    ADD CONSTRAINT clinic_visit_sessions_status_check CHECK (session_status IN (
        'waiting', 'in_consultation', 'pending_close', 'auto_closed', 'completed', 'cancelled', 'System_Closed_Timeout',
        'pending', 'checked_in', 'in_progress', 'no_show', 'abandoned', 'rescheduled'
    ));

ALTER TABLE clinic_invoices
    ADD COLUMN IF NOT EXISTS subtotal_subunits INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_subunits INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount_reason VARCHAR(100),
    ADD COLUMN IF NOT EXISTS discount_approved_by UUID REFERENCES clinic_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS tax_subunits INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_subunits INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_paid_subunits INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_due_subunits INTEGER,
    ADD COLUMN IF NOT EXISTS invoice_status VARCHAR(20) NOT NULL DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS doctor_par_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS collected_reception BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS match_triangulation BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS collected_by UUID REFERENCES clinic_users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS invoice_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- TRIGGER 1: Consultation Fee Gate
-- Prevents starting consultation without paid invoice
CREATE OR REPLACE FUNCTION check_consultation_fee_gate()
RETURNS TRIGGER AS $$
DECLARE
  v_invoice_exists BOOLEAN;
BEGIN
  IF NEW.session_status = 'in_consultation' AND OLD.session_status = 'waiting' THEN
    SELECT EXISTS (
      SELECT 1 FROM clinic_invoices
      WHERE session_id = NEW.id
        AND invoice_status = 'paid'
    ) INTO v_invoice_exists;
    
    IF NOT v_invoice_exists THEN
      RAISE EXCEPTION 'GATE_VIOLATION: Cannot transition to in_consultation without paid invoice';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_consultation_fee_gate ON clinic_visit_sessions;
CREATE TRIGGER tr_check_consultation_fee_gate
BEFORE UPDATE ON clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION check_consultation_fee_gate();

-- TRIGGER 2: Session Buffer Window (5 minutes pending_close)
CREATE OR REPLACE FUNCTION fn_set_session_buffer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_ended_at IS NOT NULL AND OLD.session_ended_at IS NULL THEN
    NEW.session_status := 'pending_close';
    NEW.buffer_window_expires_at := NEW.session_ended_at + INTERVAL '5 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_session_buffer ON clinic_visit_sessions;
CREATE TRIGGER tr_session_buffer
BEFORE UPDATE ON clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION fn_set_session_buffer();

-- TRIGGER 3: Auto-Close Timer (60 minutes)
CREATE OR REPLACE FUNCTION fn_set_auto_close()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visit_closed_at IS NOT NULL 
     AND OLD.visit_closed_at IS NULL 
     AND NEW.session_status = 'pending_close' THEN
    NEW.auto_close_at := NEW.visit_closed_at + INTERVAL '60 minutes';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auto_close_timer ON clinic_visit_sessions;
CREATE TRIGGER tr_auto_close_timer
BEFORE UPDATE ON clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION fn_set_auto_close();

-- TRIGGER 4: Ghost Evaluation Honeypot
CREATE OR REPLACE FUNCTION fn_detect_ghost_evaluation()
RETURNS TRIGGER AS $$
DECLARE
  v_closed_at TIMESTAMPTZ;
  v_ghost_window TIMESTAMPTZ;
BEGIN
  SELECT visit_closed_at INTO v_closed_at
  FROM clinic_visit_sessions WHERE id = NEW.id;
  
  IF v_closed_at IS NOT NULL THEN
    v_ghost_window := v_closed_at + INTERVAL '10 minutes';
    IF NOW() > v_ghost_window THEN
      INSERT INTO system_delivery_breaches (
        tenant_id, breach_type, severity,
        related_session_id, related_user_id, breach_details
      ) VALUES (
        NEW.tenant_id, 'ghost_evaluation', 'critical',
        NEW.id, auth.uid(),
        jsonb_build_object('attempted_at', NOW())
      );
      RETURN OLD; -- Honeypot: silently reject
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_ghost_evaluation_guard ON clinic_visit_sessions;
CREATE TRIGGER tr_ghost_evaluation_guard
BEFORE UPDATE OF score_aps, score_dri, score_tsi, score_uri, score_pqs, score_rvs 
ON clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION fn_detect_ghost_evaluation();

-- TRIGGER 5: Audit Trail
CREATE OR REPLACE FUNCTION fn_audit_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_trail (
      tenant_id, actor_id, actor_role,
      action, table_name, record_id,
      old_values, new_values
    ) VALUES (
      COALESCE(NEW.tenant_id, OLD.tenant_id),
      auth.uid(),
      (auth.jwt()->>'user_role')::TEXT,
      'UPDATE', TG_TABLE_NAME, OLD.id,
      to_jsonb(OLD), to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_sessions ON clinic_visit_sessions;
CREATE TRIGGER tr_audit_sessions
AFTER UPDATE ON clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION fn_audit_sensitive_changes();

DROP TRIGGER IF EXISTS tr_audit_invoices ON clinic_invoices;
CREATE TRIGGER tr_audit_invoices
AFTER UPDATE ON clinic_invoices
FOR EACH ROW EXECUTE FUNCTION fn_audit_sensitive_changes();

-- TRIGGER 6: Triangulation Verification
CREATE OR REPLACE FUNCTION fn_verify_triangulation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.doctor_par_confirmed = true
     AND NEW.collected_reception = true
     AND NEW.amount_paid_subunits >= (NEW.total_subunits * 0.80) THEN
    NEW.match_triangulation := true;
  ELSE
    NEW.match_triangulation := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_verify_triangulation ON clinic_invoices;
CREATE TRIGGER tr_verify_triangulation
BEFORE UPDATE OF doctor_par_confirmed, collected_reception, amount_paid_subunits 
ON clinic_invoices
FOR EACH ROW EXECUTE FUNCTION fn_verify_triangulation();
