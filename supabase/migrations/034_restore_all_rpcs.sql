-- ============================================================
-- Migration 034: Restore All RPCs (v4 - Smart SETOF + TEXT casts)
-- Generated: 2026-07-01
-- Fixed: Uses SETOF table_name to auto-detect types
--        Uses ::TEXT casts for all text columns
-- ============================================================

-- ============================================================
-- STEP 1: Drop all existing functions
-- ============================================================
DROP FUNCTION IF EXISTS get_queue_for_tenant(UUID);
DROP FUNCTION IF EXISTS get_queue_with_details(UUID);
DROP FUNCTION IF EXISTS validate_pin(UUID, TEXT);
DROP FUNCTION IF EXISTS validate_license(TEXT);
DROP FUNCTION IF EXISTS validate_email_password(TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS check_pin_rate_limit(UUID, TEXT);
DROP FUNCTION IF EXISTS create_invoice(UUID, UUID, INT, INT, INT, TEXT);
DROP FUNCTION IF EXISTS mark_invoice_paid(UUID, INT, UUID);
DROP FUNCTION IF EXISTS update_session_status(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS process_pending_notifications(INT);
DROP FUNCTION IF EXISTS release_abandoned_locks(INT);
DROP FUNCTION IF EXISTS compute_daily_snapshot(UUID, DATE);
DROP FUNCTION IF EXISTS generate_daily_snapshot(DATE);
DROP FUNCTION IF EXISTS get_user_by_email(TEXT);
DROP FUNCTION IF EXISTS get_patient_longitudinal(UUID);
DROP FUNCTION IF EXISTS get_agenda_for_doctor(UUID, DATE);
DROP FUNCTION IF EXISTS detect_leakage_gaps();
DROP FUNCTION IF EXISTS hash_pin(TEXT);
DROP FUNCTION IF EXISTS verify_pin_hash(UUID, TEXT);

-- ============================================================
-- STEP 2: Enable pgcrypt
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- STEP 3: Create all functions
-- ============================================================

-- 1. validate_pin (SETOF clinic_users - auto-detects types)
CREATE OR REPLACE FUNCTION validate_pin(
  p_tenant_id UUID,
  p_pin TEXT
)
RETURNS SETOF clinic_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM clinic_users
  WHERE tenant_id = p_tenant_id
    AND pin_code = p_pin
    AND is_active = true
    AND deleted_at IS NULL;
END;
$$;

-- 2. verify_pin_hash
CREATE OR REPLACE FUNCTION verify_pin_hash(
  p_tenant_id UUID,
  p_pin TEXT
)
RETURNS SETOF clinic_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM clinic_users
  WHERE tenant_id = p_tenant_id
    AND pin_hash = crypt(p_pin, pin_hash)
    AND is_active = true
    AND deleted_at IS NULL;
END;
$$;

-- 3. hash_pin
CREATE OR REPLACE FUNCTION hash_pin(
  p_pin TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN crypt(p_pin, gen_salt('bf'));
END;
$$;

-- 4. validate_license (SETOF master_tenants - auto-detects types)
CREATE OR REPLACE FUNCTION validate_license(
  p_license_key TEXT
)
RETURNS SETOF master_tenants
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM master_tenants
  WHERE license_key = p_license_key
    AND deleted_at IS NULL;
END;
$$;

-- 5. validate_email_password
CREATE OR REPLACE FUNCTION validate_email_password(
  p_email TEXT,
  p_password TEXT,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS SETOF clinic_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM clinic_users
  WHERE email = p_email
    AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
    AND is_active = true
    AND deleted_at IS NULL;
END;
$$;

-- 6. get_queue_for_tenant (custom columns with TEXT casts)
CREATE OR REPLACE FUNCTION get_queue_for_tenant(
  p_tenant_id UUID
)
RETURNS TABLE(
  id UUID,
  patient_id UUID,
  doctor_id UUID,
  room_id UUID,
  session_status TEXT,
  core_score_display NUMERIC,
  is_insured BOOLEAN,
  lock_holder_id UUID,
  wait_time_minutes INT,
  actual_check_in TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  clinic_patients JSON,
  clinic_users JSON,
  clinic_procedures JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.patient_id,
    s.doctor_id,
    s.room_id,
    s.session_status::TEXT,
    s.core_score_display,
    s.is_insured,
    s.lock_holder_id,
    s.waiting_time_minutes::INT,
    s.arrived_at,
    s.session_started_at,
    to_jsonb(p) AS clinic_patients,
    to_jsonb(d) AS clinic_users,
    to_jsonb(pr) AS clinic_procedures
  FROM clinic_visit_sessions s
  LEFT JOIN clinic_patients p ON s.patient_id = p.id
  LEFT JOIN clinic_users d ON s.doctor_id = d.id
  LEFT JOIN clinic_procedures pr ON s.procedure_id = pr.id
  WHERE s.tenant_id = p_tenant_id
    AND s.session_status NOT IN ('completed', 'cancelled')
    AND s.deleted_at IS NULL
  ORDER BY s.created_at;
END;
$$;

-- 7. get_queue_with_details
CREATE OR REPLACE FUNCTION get_queue_with_details(
  p_tenant_id UUID
)
RETURNS TABLE(
  id UUID,
  patient_name TEXT,
  doctor_name TEXT,
  procedure_name TEXT,
  session_status TEXT,
  core_score_display NUMERIC,
  wait_time_minutes INT,
  is_insured BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    COALESCE(p.full_name, p.first_name || ' ' || p.last_name)::TEXT,
    d.full_name::TEXT,
    pr.procedure_name::TEXT,
    s.session_status::TEXT,
    s.core_score_display,
    s.waiting_time_minutes::INT,
    s.is_insured
  FROM clinic_visit_sessions s
  LEFT JOIN clinic_patients p ON s.patient_id = p.id
  LEFT JOIN clinic_users d ON s.doctor_id = d.id
  LEFT JOIN clinic_procedures pr ON s.procedure_id = pr.id
  WHERE s.tenant_id = p_tenant_id
    AND s.session_status NOT IN ('completed', 'cancelled')
    AND s.deleted_at IS NULL
  ORDER BY s.created_at;
END;
$$;

-- 8. check_pin_rate_limit
CREATE OR REPLACE FUNCTION check_pin_rate_limit(
  p_tenant_id UUID,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO v_attempt_count
  FROM pin_attempt_log
  WHERE tenant_id = p_tenant_id
    AND (p_ip_address IS NULL OR ip_address = p_ip_address::INET)
    AND attempted_at > NOW() - INTERVAL '15 minutes';

  RETURN v_attempt_count < 5;
END;
$$;

-- 9. create_invoice
CREATE OR REPLACE FUNCTION create_invoice(
  p_session_id UUID,
  p_patient_id UUID,
  p_subtotal_subunits INT,
  p_discount_subunits INT DEFAULT 0,
  p_tax_subunits INT DEFAULT 0,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id UUID;
  v_total_subunits INT;
BEGIN
  v_total_subunits := p_subtotal_subunits - p_discount_subunits + p_tax_subunits;

  INSERT INTO clinic_invoices (
    tenant_id, session_id, patient_id,
    subtotal_subunits, discount_subunits, tax_subunits,
    total_subunits, payment_method, invoice_status
  )
  SELECT 
    s.tenant_id, p_session_id, p_patient_id,
    p_subtotal_subunits, p_discount_subunits, p_tax_subunits,
    v_total_subunits, p_payment_method::TEXT, 'draft'::TEXT
  FROM clinic_visit_sessions s
  WHERE s.id = p_session_id
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

-- 10. mark_invoice_paid
CREATE OR REPLACE FUNCTION mark_invoice_paid(
  p_invoice_id UUID,
  p_amount_paid_subunits INT,
  p_collected_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE clinic_invoices
  SET 
    amount_paid_subunits = p_amount_paid_subunits,
    collected_by = p_collected_by,
    invoice_status = CASE 
      WHEN p_amount_paid_subunits >= total_subunits THEN 'paid'::TEXT
      ELSE 'partial'::TEXT
    END,
    updated_at = NOW()
  WHERE id = p_invoice_id;

  RETURN FOUND;
END;
$$;

-- 11. update_session_status
CREATE OR REPLACE FUNCTION update_session_status(
  p_session_id UUID,
  p_new_status TEXT,
  p_user_id UUID,
  p_user_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
  v_tenant_id UUID;
BEGIN
  SELECT session_status::TEXT, tenant_id INTO v_current_status, v_tenant_id
  FROM clinic_visit_sessions
  WHERE id = p_session_id;

  IF v_current_status = 'completed' AND p_new_status != 'completed' THEN
    RAISE EXCEPTION 'Cannot modify completed session';
  END IF;

  IF p_user_role = 'doctor' THEN
    IF NOT EXISTS (
      SELECT 1 FROM clinic_visit_sessions 
      WHERE id = p_session_id AND doctor_id = p_user_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized: not your session';
    END IF;
  END IF;

  UPDATE clinic_visit_sessions
  SET session_status = p_new_status::TEXT, updated_at = NOW()
  WHERE id = p_session_id;

  RETURN FOUND;
END;
$$;

-- 12. process_pending_notifications (FIXED: CTE with FOR UPDATE SKIP LOCKED)
CREATE OR REPLACE FUNCTION process_pending_notifications(
  p_batch_size INT DEFAULT 100
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_processed INT;
BEGIN
  WITH selected AS (
    SELECT id
    FROM notification_queue
    WHERE status = 'queued'::TEXT
      AND scheduled_at <= NOW()
    ORDER BY priority DESC, scheduled_at
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE notification_queue
  SET status = 'processing'::TEXT
  WHERE id IN (SELECT id FROM selected);

  GET DIAGNOSTICS v_processed = ROW_COUNT;
  RETURN v_processed;
END;
$$;

-- 13. release_abandoned_locks
CREATE OR REPLACE FUNCTION release_abandoned_locks(
  p_timeout_minutes INT DEFAULT 10
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_released INT;
BEGIN
  UPDATE clinic_visit_sessions
  SET lock_holder_id = NULL, lock_timestamp = NULL
  WHERE lock_holder_id IS NOT NULL
    AND lock_timestamp < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL;

  GET DIAGNOSTICS v_released = ROW_COUNT;
  RETURN v_released;
END;
$$;

-- 14. compute_daily_snapshot
CREATE OR REPLACE FUNCTION compute_daily_snapshot(
  p_tenant_id UUID,
  p_date DATE
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT jsonb_build_object(
    'total_visits', COUNT(*),
    'total_revenue', COALESCE(SUM(i.total_subunits), 0),
    'avg_wait_time', COALESCE(AVG(s.waiting_time_minutes), 0),
    'sla_breaches', COUNT(*) FILTER (WHERE s.waiting_time_minutes >= 25)
  ) INTO v_result
  FROM clinic_visit_sessions s
  LEFT JOIN clinic_invoices i ON s.id = i.session_id
  WHERE s.tenant_id = p_tenant_id
    AND DATE(s.created_at) = p_date;

  RETURN v_result;
END;
$$;

-- 15. generate_daily_snapshot
CREATE OR REPLACE FUNCTION generate_daily_snapshot(
  p_snapshot_date DATE DEFAULT CURRENT_DATE
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INT;
BEGIN
  INSERT INTO analytics_daily_snapshots (
    tenant_id, snapshot_date, total_visits,
    total_revenue_subunits, avg_wait_time_minutes, sla_breaches_count
  )
  SELECT 
    s.tenant_id, p_snapshot_date, COUNT(*),
    COALESCE(SUM(i.total_subunits), 0),
    COALESCE(AVG(s.waiting_time_minutes), 0),
    COUNT(*) FILTER (WHERE s.waiting_time_minutes >= 25)
  FROM clinic_visit_sessions s
  LEFT JOIN clinic_invoices i ON s.id = i.session_id
  WHERE DATE(s.created_at) = p_snapshot_date
  GROUP BY s.tenant_id
  ON CONFLICT (tenant_id, snapshot_date) DO UPDATE SET
    total_visits = EXCLUDED.total_visits,
    total_revenue_subunits = EXCLUDED.total_revenue_subunits,
    avg_wait_time_minutes = EXCLUDED.avg_wait_time_minutes,
    sla_breaches_count = EXCLUDED.sla_breaches_count,
    updated_at = NOW();

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

-- 16. get_current_tenant_id
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt()->>'tenant_id')::UUID;
$$;

-- 17. get_current_user_role
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt()->>'user_role')::TEXT;
$$;

-- 18. is_super_admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_current_user_role() = 'super_admin';
$$;

-- 19. get_user_by_email (SETOF clinic_users)
CREATE OR REPLACE FUNCTION get_user_by_email(
  p_email TEXT
)
RETURNS SETOF clinic_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM clinic_users
  WHERE email = p_email
    AND is_active = true
    AND deleted_at IS NULL;
END;
$$;

-- 20. get_patient_longitudinal (SETOF patient_longitudinal_profiles)
CREATE OR REPLACE FUNCTION get_patient_longitudinal(
  p_patient_id UUID
)
RETURNS SETOF patient_longitudinal_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM patient_longitudinal_profiles
  WHERE patient_id = p_patient_id;
END;
$$;

-- 21. get_agenda_for_doctor (SETOF master_agenda_events)
CREATE OR REPLACE FUNCTION get_agenda_for_doctor(
  p_doctor_id UUID,
  p_date DATE
)
RETURNS SETOF master_agenda_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM master_agenda_events
  WHERE doctor_id = p_doctor_id
    AND DATE(scheduled_start) = p_date
    AND status NOT IN ('cancelled', 'no_show')
  ORDER BY scheduled_start;
END;
$$;

-- 22. detect_leakage_gaps
CREATE OR REPLACE FUNCTION detect_leakage_gaps()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gaps INT;
BEGIN
  SELECT COUNT(*) INTO v_gaps
  FROM clinic_visit_sessions s
  WHERE s.session_status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM clinic_invoices i
      WHERE i.session_id = s.id
    )
    AND s.created_at < NOW() - INTERVAL '7 days';

  RETURN v_gaps;
END;
$$;-- Migration 034: Restore All RPCs from Production DB
-- (المحتوى الكامل هنا)
