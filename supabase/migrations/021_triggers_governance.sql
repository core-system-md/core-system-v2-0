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
-- Some historical replay schemas do not yet expose the buffer columns.
-- Detect those fields through JSON so migration replay remains schema-tolerant.
CREATE OR REPLACE FUNCTION fn_set_session_buffer()
RETURNS TRIGGER AS $$
DECLARE
  v_new JSONB := to_jsonb(NEW);
  v_old JSONB := to_jsonb(OLD);
  v_session_ended_at TIMESTAMPTZ;
  v_old_session_ended_at TIMESTAMPTZ;
BEGIN
  IF NOT (v_new ? 'session_ended_at') THEN
    RETURN NEW;
  END IF;

  v_session_ended_at := NULLIF(v_new->>'session_ended_at', '')::TIMESTAMPTZ;
  v_old_session_ended_at := NULLIF(v_old->>'session_ended_at', '')::TIMESTAMPTZ;

  IF v_session_ended_at IS NOT NULL AND v_old_session_ended_at IS NULL THEN
    IF v_new ? 'session_status' THEN
      NEW := jsonb_populate_record(
        NEW,
        jsonb_build_object('session_status', 'pending_close')
      );
      v_new := to_jsonb(NEW);
    END IF;

    IF v_new ? 'buffer_window_expires_at' THEN
      NEW := jsonb_populate_record(
        NEW,
        jsonb_build_object(
          'buffer_window_expires_at',
          to_jsonb(v_session_ended_at + INTERVAL '5 minutes')
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_session_buffer ON clinic_visit_sessions;
CREATE TRIGGER tr_session_buffer
BEFORE UPDATE ON clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION fn_set_session_buffer();

-- TRIGGER 3: Auto-Close Timer (60 minutes)
-- Historical replay schemas may lack these timer columns.
CREATE OR REPLACE FUNCTION fn_set_auto_close()
RETURNS TRIGGER AS $$
DECLARE
  v_new JSONB := to_jsonb(NEW);
  v_old JSONB := to_jsonb(OLD);
  v_visit_closed_at TIMESTAMPTZ;
  v_old_visit_closed_at TIMESTAMPTZ;
BEGIN
  IF NOT (v_new ? 'visit_closed_at') THEN
    RETURN NEW;
  END IF;

  v_visit_closed_at := NULLIF(v_new->>'visit_closed_at', '')::TIMESTAMPTZ;
  v_old_visit_closed_at := NULLIF(v_old->>'visit_closed_at', '')::TIMESTAMPTZ;

  IF v_visit_closed_at IS NOT NULL
     AND v_old_visit_closed_at IS NULL
     AND v_new->>'session_status' = 'pending_close'
     AND v_new ? 'auto_close_at' THEN
    NEW := jsonb_populate_record(
      NEW,
      jsonb_build_object(
        'auto_close_at',
        to_jsonb(v_visit_closed_at + INTERVAL '60 minutes')
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_auto_close_timer ON clinic_visit_sessions;
CREATE TRIGGER tr_auto_close_timer
BEFORE UPDATE ON clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION fn_set_auto_close();

-- TRIGGER 4: Ghost Evaluation Honeypot
-- The trigger cannot use UPDATE OF score_* directly because older replay schemas
-- may not expose those columns yet. The function therefore detects score changes
-- through row JSON only when the score keys exist, preserving behavior on schemas
-- that already contain the score indicators.
CREATE OR REPLACE FUNCTION fn_detect_ghost_evaluation()
RETURNS TRIGGER AS $$
DECLARE
  v_closed_at TIMESTAMPTZ;
  v_ghost_window TIMESTAMPTZ;
  v_new JSONB := to_jsonb(NEW);
  v_old JSONB := to_jsonb(OLD);
  v_score_change BOOLEAN := false;
BEGIN
  IF NOT (v_new ?| ARRAY['score_aps', 'score_dri', 'score_tsi', 'score_uri', 'score_pqs', 'score_rvs']) THEN
    RETURN NEW;
  END IF;

  v_score_change :=
    (v_new->'score_aps') IS DISTINCT FROM (v_old->'score_aps') OR
    (v_new->'score_dri') IS DISTINCT FROM (v_old->'score_dri') OR
    (v_new->'score_tsi') IS DISTINCT FROM (v_old->'score_tsi') OR
    (v_new->'score_uri') IS DISTINCT FROM (v_old->'score_uri') OR
    (v_new->'score_pqs') IS DISTINCT FROM (v_old->'score_pqs') OR
    (v_new->'score_rvs') IS DISTINCT FROM (v_old->'score_rvs');

  IF NOT v_score_change THEN
    RETURN NEW;
  END IF;

  IF NOT (v_new ? 'visit_closed_at') THEN
    RETURN NEW;
  END IF;

  v_closed_at := NULLIF(v_new->>'visit_closed_at', '')::TIMESTAMPTZ;

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
BEFORE UPDATE ON clinic_visit_sessions
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