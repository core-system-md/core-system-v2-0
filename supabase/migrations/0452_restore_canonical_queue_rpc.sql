-- ============================================================
-- Migration 045: Restore canonical get_queue_for_tenant contract
-- Purpose: reconcile Production with the repository RPC contract and
--          restore tenant authorization for this SECURITY DEFINER RPC.
-- No table/schema changes; existing session columns are used.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_queue_for_tenant(UUID);

CREATE OR REPLACE FUNCTION public.get_queue_for_tenant(
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
DECLARE
  v_caller_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_caller_tenant_id
  FROM clinic_users
  WHERE id = auth.uid()
    AND is_active = TRUE
    AND deleted_at IS NULL;

  IF v_caller_tenant_id IS NULL OR v_caller_tenant_id <> p_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: cross-tenant access denied';
  END IF;

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
    to_jsonb(p)::JSON,
    to_jsonb(d)::JSON,
    to_jsonb(pr)::JSON
  FROM clinic_visit_sessions s
  LEFT JOIN clinic_patients p ON s.patient_id = p.id
  LEFT JOIN clinic_users d ON s.doctor_id = d.id
  LEFT JOIN clinic_procedures pr ON s.procedure_id = pr.id
  WHERE s.tenant_id = p_tenant_id
    AND s.deleted_at IS NULL
    AND s.session_status NOT IN ('completed', 'cancelled')
  ORDER BY s.created_at ASC;
END;
$$;
