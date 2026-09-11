-- Evidence-backed runtime reconciliation for the active Reception + Survey contracts.
-- Blueprint/database.types expose these canonical agenda fields; historical 005_scheduling.sql
-- predates them. ADD COLUMN IF NOT EXISTS keeps existing production contracts unchanged.

ALTER TABLE public.master_agenda_events
  ADD COLUMN IF NOT EXISTS doctor_id uuid REFERENCES public.clinic_users(id),
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.clinic_rooms(id),
  ADD COLUMN IF NOT EXISTS scheduled_start timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end timestamptz,
  ADD COLUMN IF NOT EXISTS buffer_end timestamptz,
  ADD COLUMN IF NOT EXISTS visit_type text,
  ADD COLUMN IF NOT EXISTS booking_notes text,
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.clinic_users(id),
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_master_agenda_events_doctor_schedule
  ON public.master_agenda_events (tenant_id, doctor_id, scheduled_start)
  WHERE deleted_at IS NULL;

-- Reassert the active Reception PIN-session read against canonical agenda columns.
CREATE OR REPLACE FUNCTION public.get_reception_dashboard_for_pin_session(
  p_tenant_id uuid,
  p_session_token text,
  p_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_staff_id uuid;
  v_role text;
  v_result jsonb;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 OR p_date IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: invalid reception session';
  END IF;

  SELECT ps.staff_id, cu.role
    INTO v_staff_id, v_role
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

  SELECT jsonb_build_object(
    'doctors', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', cu.id,
          'full_name', cu.full_name,
          'specialization', cu.specialization
        ) ORDER BY cu.full_name
      )
      FROM public.clinic_users cu
      WHERE cu.tenant_id = p_tenant_id
        AND cu.is_active = true
        AND cu.deleted_at IS NULL
        AND cu.role = 'doctor'
    ), '[]'::jsonb),
    'agenda', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'patient_id', a.patient_id,
          'patient_name', COALESCE(NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), ''), p.full_name, 'مريض غير معروف'),
          'doctor_id', a.doctor_id,
          'doctor_name', COALESCE(d.full_name, 'طبيب غير معروف'),
          'scheduled_start', COALESCE(a.scheduled_start, a.start_at),
          'scheduled_end', COALESCE(a.scheduled_end, a.end_at),
          'status', a.status
        ) ORDER BY COALESCE(a.scheduled_start, a.start_at)
      )
      FROM public.master_agenda_events a
      LEFT JOIN public.clinic_patients p ON p.id = a.patient_id AND p.deleted_at IS NULL
      LEFT JOIN public.clinic_users d ON d.id = a.doctor_id
      WHERE a.tenant_id = p_tenant_id
        AND a.deleted_at IS NULL
        AND COALESCE(a.scheduled_start, a.start_at) >= p_date::timestamptz
        AND COALESCE(a.scheduled_start, a.start_at) < (p_date + 1)::timestamptz
        AND a.status NOT IN ('cancelled', 'no_show')
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

-- Reassert the complete active five-page survey RPC after later runtime reconciliation.
-- Keep the existing RPC signature and canonical patient_intake_responses contract.
CREATE OR REPLACE FUNCTION public.save_patient_intake_page(p_session_id uuid, p_page integer, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_patient_id uuid;
  v_tenant_id uuid;
  v_intake_id uuid;
  v_current_status text;
  v_expected_prior text;
  v_new_status text;
  v_visit_type text;
  v_service_reason text;
  v_procedures text[];
  v_consent boolean;
  v_num_a integer;
  v_num_b integer;
  v_text_a text;
  v_text_b text;
  v_text_c text;
  v_arr text[];
  v_svg text;
  v_sig_raw text;
  v_sig_ts timestamptz;
BEGIN
  SELECT s.patient_id, s.tenant_id
    INTO v_patient_id, v_tenant_id
  FROM clinic_visit_sessions s
  WHERE s.id = p_session_id
    AND s.deleted_at IS NULL;

  IF v_patient_id IS NULL OR v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'INVALID_PAGE_ORDER: unknown page %', p_page;
  END IF;

  SELECT id, completion_status::text
    INTO v_intake_id, v_current_status
  FROM patient_intake_responses
  WHERE session_id = p_session_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  v_expected_prior := CASE p_page
    WHEN 1 THEN NULL
    WHEN 2 THEN 'page1_done'
    WHEN 3 THEN 'page2_done'
    WHEN 4 THEN 'page3_done'
    WHEN 5 THEN 'page4_done'
  END;

  v_new_status := CASE p_page
    WHEN 1 THEN 'page1_done'
    WHEN 2 THEN 'page2_done'
    WHEN 3 THEN 'page3_done'
    WHEN 4 THEN 'page4_done'
    WHEN 5 THEN 'completed'
  END;

  IF p_page = 1 THEN
    IF v_current_status = 'completed' THEN
      RAISE EXCEPTION 'SURVEY_ALREADY_COMPLETED';
    END IF;
  ELSIF COALESCE(NOT (
       (v_current_status IS NULL AND v_expected_prior IS NULL)
    OR v_current_status = v_expected_prior
    OR v_current_status = v_new_status
  ), TRUE) THEN
    RAISE EXCEPTION 'INVALID_PAGE_ORDER: expected %, got %',
      COALESCE(v_expected_prior, 'new'), COALESCE(v_current_status, 'none');
  END IF;

  IF p_page = 1 THEN
    v_visit_type := p_payload->>'visit_type_selection';
    v_service_reason := NULLIF(trim(p_payload->>'service_reason'), '');
    v_consent := COALESCE((p_payload->>'consent_accepted')::boolean, false);

    IF v_visit_type IS NULL OR v_visit_type = '' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: visit_type_selection is required';
    END IF;
    IF v_service_reason IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: service_reason is required';
    END IF;
    IF jsonb_typeof(COALESCE(p_payload->'procedures_requested', '[]'::jsonb)) <> 'array' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: procedures_requested must be an array';
    END IF;
    v_procedures := ARRAY(SELECT jsonb_array_elements_text(p_payload->'procedures_requested'));
    IF array_length(v_procedures, 1) IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: at least one procedure is required';
    END IF;
    IF v_consent IS DISTINCT FROM TRUE THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: consent_accepted must be true';
    END IF;

  ELSIF p_page = 2 THEN
    v_text_a := NULLIF(trim(p_payload->>'service_interest'), '');
    v_text_b := NULLIF(trim(p_payload->>'visit_goal'), '');
    v_text_c := NULLIF(trim(p_payload->>'consideration_period'), '');

  ELSIF p_page = 3 THEN
    v_num_a := (p_payload->>'readiness_level')::integer;
    IF v_num_a IS NULL OR v_num_a < 1 OR v_num_a > 5 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: readiness_level must be 1..5';
    END IF;
    v_num_b := (p_payload->>'followup_importance')::integer;
    IF v_num_b IS NULL OR v_num_b < 1 OR v_num_b > 4 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: followup_importance must be 1..4';
    END IF;
    v_text_a := NULLIF(trim(p_payload->>'decision_factor'), '');
    IF v_text_a IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: decision_factor is required';
    END IF;
    v_text_b := NULLIF(trim(p_payload->>'referral_source'), '');
    IF v_text_b IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: referral_source is required';
    END IF;

  ELSIF p_page = 4 THEN
    IF jsonb_typeof(COALESCE(p_payload->'top_priorities', '[]'::jsonb)) <> 'array' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: top_priorities must be an array';
    END IF;
    v_arr := ARRAY(
      SELECT NULLIF(trim(x), '')
      FROM jsonb_array_elements_text(p_payload->'top_priorities') AS t(x)
    );
    v_arr := (SELECT ARRAY_AGG(y) FROM unnest(v_arr) AS u(y) WHERE y IS NOT NULL);
    IF v_arr IS NULL OR array_length(v_arr, 1) IS NULL OR array_length(v_arr, 1) > 2 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: top_priorities must contain 1..2 items';
    END IF;
    v_text_a := NULLIF(trim(p_payload->>'main_concern'), '');
    IF v_text_a IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: main_concern is required';
    END IF;
    v_num_a := (p_payload->>'openness_to_proceed')::integer;
    IF v_num_a IS NULL OR v_num_a < 1 OR v_num_a > 3 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: openness_to_proceed must be 1..3';
    END IF;

  ELSIF p_page = 5 THEN
    v_svg := NULLIF(trim(p_payload->>'digital_signature_svg'), '');
    IF v_svg IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: digital_signature_svg is required';
    END IF;
    v_sig_raw := NULLIF(trim(p_payload->>'signature_timestamp'), '');
    IF v_sig_raw IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: signature_timestamp is required';
    END IF;
    BEGIN
      v_sig_ts := v_sig_raw::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: signature_timestamp must be a valid ISO 8601 timestamp';
    END;
  END IF;

  IF v_intake_id IS NULL THEN
    INSERT INTO patient_intake_responses (session_id, patient_id, tenant_id, completion_status, deleted_at)
    VALUES (p_session_id, v_patient_id, v_tenant_id, v_new_status, NULL)
    RETURNING id INTO v_intake_id;
  ELSE
    UPDATE patient_intake_responses
       SET completion_status = v_new_status,
           patient_id = v_patient_id,
           tenant_id = v_tenant_id,
           deleted_at = NULL,
           updated_at = NOW()
     WHERE id = v_intake_id;
  END IF;

  IF p_page = 1 THEN
    UPDATE patient_intake_responses SET
      visit_type_selection = v_visit_type,
      service_reason = v_service_reason,
      procedures_requested = v_procedures,
      consent_accepted = TRUE,
      consent_timestamp = NOW()
    WHERE id = v_intake_id;
  ELSIF p_page = 2 THEN
    UPDATE patient_intake_responses SET
      service_interest = v_text_a,
      visit_goal = v_text_b,
      consideration_period = v_text_c
    WHERE id = v_intake_id;
  ELSIF p_page = 3 THEN
    UPDATE patient_intake_responses SET
      readiness_level = v_num_a,
      decision_factor = v_text_a,
      referral_source = v_text_b,
      followup_importance = v_num_b
    WHERE id = v_intake_id;
  ELSIF p_page = 4 THEN
    UPDATE patient_intake_responses SET
      top_priorities = v_arr,
      main_concern = v_text_a,
      openness_to_proceed = v_num_a
    WHERE id = v_intake_id;
  ELSIF p_page = 5 THEN
    UPDATE patient_intake_responses SET
      digital_signature_svg = v_svg,
      signature_timestamp = v_sig_ts,
      whatsapp_redirect_sent = FALSE,
      completed_at = NOW()
    WHERE id = v_intake_id;
  END IF;

  RETURN jsonb_build_object('intake_id', v_intake_id, 'completion_status', v_new_status);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.save_patient_intake_page(uuid, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_patient_intake_page(uuid, integer, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.save_patient_intake_page(uuid, integer, jsonb) TO authenticated;
