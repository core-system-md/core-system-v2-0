-- Master Test #110: make page-1 survey persistence deterministic on replay.
-- Preserve the existing five-page implementation as the legacy function and
-- override only page 1 with the production-proven session upsert path.

ALTER FUNCTION public.save_patient_intake_page(uuid, integer, jsonb)
  RENAME TO save_patient_intake_page_legacy;

CREATE OR REPLACE FUNCTION public.save_patient_intake_page(p_session_id uuid, p_page integer, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_patient_id uuid;
  v_tenant_id uuid;
  v_id uuid;
  v_status text;
  v_visit_type text;
  v_reason text;
  v_procedures text[];
BEGIN
  IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 5 THEN
    RAISE EXCEPTION 'INVALID_PAGE_ORDER: unknown page %', p_page;
  END IF;

  IF p_page <> 1 THEN
    RETURN public.save_patient_intake_page_legacy(p_session_id, p_page, p_payload);
  END IF;

  SELECT patient_id, tenant_id INTO v_patient_id, v_tenant_id
  FROM public.clinic_visit_sessions
  WHERE id = p_session_id AND deleted_at IS NULL;

  IF v_patient_id IS NULL OR v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  v_visit_type := p_payload->>'visit_type_selection';
  v_reason := NULLIF(trim(p_payload->>'service_reason'), '');
  IF v_visit_type IS NULL OR v_visit_type = '' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: visit_type_selection is required';
  END IF;
  IF v_reason IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: service_reason is required';
  END IF;
  IF jsonb_typeof(COALESCE(p_payload->'procedures_requested', '[]'::jsonb)) <> 'array' THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: procedures_requested must be an array';
  END IF;
  v_procedures := ARRAY(SELECT jsonb_array_elements_text(p_payload->'procedures_requested'));
  IF array_length(v_procedures, 1) IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: at least one procedure is required';
  END IF;
  IF COALESCE((p_payload->>'consent_accepted')::boolean, false) IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: consent_accepted must be true';
  END IF;

  INSERT INTO public.patient_intake_responses
    (session_id, patient_id, tenant_id, completion_status, deleted_at,
     visit_type_selection, service_reason, procedures_requested,
     consent_accepted, consent_timestamp)
  VALUES
    (p_session_id, v_patient_id, v_tenant_id, 'page1_done', NULL,
     v_visit_type, v_reason, v_procedures, TRUE, NOW())
  ON CONFLICT (session_id) DO UPDATE
    SET patient_id = EXCLUDED.patient_id,
        tenant_id = EXCLUDED.tenant_id,
        completion_status = 'page1_done',
        deleted_at = NULL,
        visit_type_selection = EXCLUDED.visit_type_selection,
        service_reason = EXCLUDED.service_reason,
        procedures_requested = EXCLUDED.procedures_requested,
        consent_accepted = TRUE,
        consent_timestamp = NOW(),
        updated_at = NOW()
  RETURNING id, completion_status INTO v_id, v_status;

  RETURN jsonb_build_object('intake_id', v_id, 'completion_status', v_status);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.save_patient_intake_page_legacy(uuid, integer, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_patient_intake_page(uuid, integer, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.save_patient_intake_page(uuid, integer, jsonb) TO authenticated;
