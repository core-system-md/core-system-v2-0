-- CORE SYSTEM v2.1 — P144 Reception Inquiry Soft-Delete Boundary
-- Evidence-backed narrow repair only.
-- Preserve existing RPC signatures, PIN-session authorization, tenant boundary,
-- inquiry lifecycle semantics, and SECURITY DEFINER behavior.

CREATE OR REPLACE FUNCTION public.get_reception_inquiries_for_pin_session(
  p_tenant_id uuid,
  p_session_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_staff_id uuid;
  v_role text;
  v_result jsonb;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 THEN
    RAISE EXCEPTION 'Unauthorized: invalid reception session';
  END IF;

  SELECT ps.staff_id, cu.role INTO v_staff_id, v_role
  FROM public.pin_sessions ps
  JOIN public.clinic_users cu
    ON cu.id = ps.staff_id
   AND cu.tenant_id = ps.tenant_id
   AND cu.is_active = true
   AND cu.deleted_at IS NULL
  WHERE ps.tenant_id = p_tenant_id
    AND ps.token_hash = extensions.digest(p_session_token, 'sha256')
    AND ps.expires_at > NOW()
  LIMIT 1;

  IF v_staff_id IS NULL OR v_role NOT IN ('receptionist', 'clinic_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: invalid or expired reception session';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', i.id,
    'inquiry_type', i.inquiry_type,
    'patient_id', i.patient_id,
    'temp_patient_name', i.temp_patient_name,
    'temp_phone', i.temp_phone,
    'inquiry_reason', i.inquiry_reason,
    'procedures_requested', i.procedures_requested,
    'initial_disc_guess', i.initial_disc_guess,
    'expected_objection', i.expected_objection,
    'status', i.status,
    'handled_by', i.handled_by,
    'notes', i.notes,
    'created_at', i.created_at,
    'updated_at', i.updated_at
  ) ORDER BY i.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM public.clinic_inquiries i
  WHERE i.tenant_id = p_tenant_id
    AND i.deleted_at IS NULL;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_reception_inquiry_status_for_pin_session(
  p_tenant_id uuid,
  p_session_token text,
  p_inquiry_id uuid,
  p_status text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_staff_id uuid;
  v_role text;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 THEN
    RAISE EXCEPTION 'Unauthorized: invalid reception session';
  END IF;

  SELECT ps.staff_id, cu.role INTO v_staff_id, v_role
  FROM public.pin_sessions ps
  JOIN public.clinic_users cu
    ON cu.id = ps.staff_id
   AND cu.tenant_id = ps.tenant_id
   AND cu.is_active = true
   AND cu.deleted_at IS NULL
  WHERE ps.tenant_id = p_tenant_id
    AND ps.token_hash = extensions.digest(p_session_token, 'sha256')
    AND ps.expires_at > NOW()
  LIMIT 1;

  IF v_staff_id IS NULL OR v_role NOT IN ('receptionist', 'clinic_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: invalid or expired reception session';
  END IF;

  IF p_status NOT IN ('pending', 'converted_to_session', 'cancelled', 'rescheduled', 'no_show') THEN
    RAISE EXCEPTION 'Invalid inquiry status';
  END IF;

  UPDATE public.clinic_inquiries
  SET status = p_status,
      handled_by = v_staff_id,
      updated_at = NOW()
  WHERE id = p_inquiry_id
    AND tenant_id = p_tenant_id
    AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquiry not found';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;
