-- 021_triggers_governance.sql
-- Financial Governance Triggers for CORE SYSTEM v2.1

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
