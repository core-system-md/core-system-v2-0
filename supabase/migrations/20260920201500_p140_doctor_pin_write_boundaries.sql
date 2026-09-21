-- P140 — Doctor PIN-session write + score boundaries
-- Additive, idempotent, and scoped to the active PIN doctor workflow.

CREATE OR REPLACE FUNCTION public.save_doctor_par_for_pin_session(
  p_tenant_id uuid,p_session_token text,p_session_id uuid,p_par_result text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_staff_id uuid; v_role text; v_status text;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 OR p_session_id IS NULL
    THEN RAISE EXCEPTION 'Unauthorized: invalid doctor session parameters'; END IF;
  IF p_par_result IS NOT NULL AND p_par_result NOT IN ('full_acceptance','partial_acceptance','deferred','rejection','no_decision')
    THEN RAISE EXCEPTION 'Invalid PAR result'; END IF;

  SELECT ps.staff_id,cu.role INTO v_staff_id,v_role
  FROM public.pin_sessions ps
  JOIN public.clinic_users cu ON cu.id=ps.staff_id AND cu.tenant_id=ps.tenant_id
    AND cu.is_active=true AND cu.deleted_at IS NULL
  WHERE ps.tenant_id=p_tenant_id AND ps.token_hash=extensions.digest(p_session_token,'sha256')
    AND ps.deleted_at IS NULL AND ps.expires_at>NOW() LIMIT 1;

  IF v_staff_id IS NULL OR v_role NOT IN ('doctor','clinic_admin','super_admin')
    THEN RAISE EXCEPTION 'Unauthorized: invalid or expired doctor session'; END IF;

  SELECT s.session_status::text INTO v_status FROM public.clinic_visit_sessions s
  WHERE s.id=p_session_id AND s.tenant_id=p_tenant_id AND s.deleted_at IS NULL
    AND (v_role IN ('clinic_admin','super_admin') OR s.doctor_id=v_staff_id) LIMIT 1;

  IF v_status IS NULL THEN RAISE EXCEPTION 'Session not found or access denied'; END IF;
  IF v_status IN ('completed','cancelled','auto_closed','System_Closed_Timeout') THEN RAISE EXCEPTION 'SESSION_CLOSED'; END IF;

  UPDATE public.clinic_visit_sessions SET par_result=p_par_result,updated_at=NOW()
  WHERE id=p_session_id AND tenant_id=p_tenant_id AND deleted_at IS NULL;

  RETURN jsonb_build_object('success',true,'par_result',p_par_result);
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_doctor_clinical_notes_for_pin_session(
  p_tenant_id uuid,p_session_token text,p_session_id uuid,p_clinical_notes jsonb
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_staff_id uuid; v_role text; v_status text;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 OR p_session_id IS NULL
    THEN RAISE EXCEPTION 'Unauthorized: invalid doctor session parameters'; END IF;
  IF p_clinical_notes IS NULL OR jsonb_typeof(p_clinical_notes) <> 'array'
    THEN RAISE EXCEPTION 'Invalid clinical notes payload'; END IF;

  SELECT ps.staff_id,cu.role INTO v_staff_id,v_role
  FROM public.pin_sessions ps
  JOIN public.clinic_users cu ON cu.id=ps.staff_id AND cu.tenant_id=ps.tenant_id
    AND cu.is_active=true AND cu.deleted_at IS NULL
  WHERE ps.tenant_id=p_tenant_id AND ps.token_hash=extensions.digest(p_session_token,'sha256')
    AND ps.deleted_at IS NULL AND ps.expires_at>NOW() LIMIT 1;

  IF v_staff_id IS NULL OR v_role NOT IN ('doctor','clinic_admin','super_admin')
    THEN RAISE EXCEPTION 'Unauthorized: invalid or expired doctor session'; END IF;

  SELECT s.session_status::text INTO v_status FROM public.clinic_visit_sessions s
  WHERE s.id=p_session_id AND s.tenant_id=p_tenant_id AND s.deleted_at IS NULL
    AND (v_role IN ('clinic_admin','super_admin') OR s.doctor_id=v_staff_id) LIMIT 1;

  IF v_status IS NULL THEN RAISE EXCEPTION 'Session not found or access denied'; END IF;
  IF v_status IN ('completed','cancelled','auto_closed','System_Closed_Timeout') THEN RAISE EXCEPTION 'SESSION_CLOSED'; END IF;

  UPDATE public.clinic_visit_sessions
  SET session_metadata=jsonb_set(COALESCE(session_metadata,'{}'::jsonb),'{clinical_notes}',p_clinical_notes,true),
      updated_at=NOW()
  WHERE id=p_session_id AND tenant_id=p_tenant_id AND deleted_at IS NULL;

  RETURN jsonb_build_object('success',true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.end_doctor_session_for_pin_session(
  p_tenant_id uuid,p_session_token text,p_session_id uuid
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE v_staff_id uuid; v_role text; v_status text; v_ended_at timestamptz;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 OR p_session_id IS NULL
    THEN RAISE EXCEPTION 'Unauthorized: invalid doctor session parameters'; END IF;

  SELECT ps.staff_id,cu.role INTO v_staff_id,v_role
  FROM public.pin_sessions ps
  JOIN public.clinic_users cu ON cu.id=ps.staff_id AND cu.tenant_id=ps.tenant_id
    AND cu.is_active=true AND cu.deleted_at IS NULL
  WHERE ps.tenant_id=p_tenant_id AND ps.token_hash=extensions.digest(p_session_token,'sha256')
    AND ps.deleted_at IS NULL AND ps.expires_at>NOW() LIMIT 1;

  IF v_staff_id IS NULL OR v_role NOT IN ('doctor','clinic_admin','super_admin')
    THEN RAISE EXCEPTION 'Unauthorized: invalid or expired doctor session'; END IF;

  SELECT s.session_status::text,s.session_ended_at INTO v_status,v_ended_at
  FROM public.clinic_visit_sessions s
  WHERE s.id=p_session_id AND s.tenant_id=p_tenant_id AND s.deleted_at IS NULL
    AND (v_role IN ('clinic_admin','super_admin') OR s.doctor_id=v_staff_id) LIMIT 1;

  IF v_status IS NULL THEN RAISE EXCEPTION 'Session not found or access denied'; END IF;
  IF v_status IN ('completed','cancelled','auto_closed','System_Closed_Timeout')
    THEN RETURN jsonb_build_object('success',false,'error','SESSION_CLOSED','session_status',v_status); END IF;
  IF v_status NOT IN ('in_consultation','pending_close') THEN RAISE EXCEPTION 'SESSION_NOT_IN_CONSULTATION'; END IF;

  UPDATE public.clinic_visit_sessions
  SET session_ended_at=COALESCE(v_ended_at,NOW()),updated_at=NOW()
  WHERE id=p_session_id AND tenant_id=p_tenant_id AND deleted_at IS NULL;

  SELECT s.session_status::text,s.session_ended_at INTO v_status,v_ended_at
  FROM public.clinic_visit_sessions s
  WHERE s.id=p_session_id AND s.tenant_id=p_tenant_id AND s.deleted_at IS NULL LIMIT 1;

  RETURN jsonb_build_object('success',true,'session_status',v_status,'session_ended_at',v_ended_at);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.save_doctor_par_for_pin_session(uuid,text,uuid,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_doctor_clinical_notes_for_pin_session(uuid,text,uuid,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.end_doctor_session_for_pin_session(uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_doctor_par_for_pin_session(uuid,text,uuid,text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_doctor_clinical_notes_for_pin_session(uuid,text,uuid,jsonb) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.end_doctor_session_for_pin_session(uuid,text,uuid) TO anon,authenticated;