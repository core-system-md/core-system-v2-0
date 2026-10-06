-- P140/P0 regression reconciliation
-- Evidence:
-- 1) E2E role suites share one tenant and PIN attempt audit rows persist across suites.
-- 2) Soft-deleted PIN audit rows were still counted by check_pin_rate_limit().
-- 3) Soft-deleted patient_intake_responses rows were still considered current by save_patient_intake_page().
-- Scope: test isolation + correct soft-delete semantics; no RLS or role expansion.

-- Evidence: isolated replay exposed a schema-parity gap. Production patient_intake_responses
-- contains the five-page survey columns and a unique session_id constraint, while the repository
-- baseline did not. Keep the replay schema aligned with the verified production contract.

ALTER TABLE public.patient_intake_responses
  ADD COLUMN IF NOT EXISTS visit_type_selection VARCHAR(30),
  ADD COLUMN IF NOT EXISTS service_reason VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS procedures_requested TEXT[],
  ADD COLUMN IF NOT EXISTS consent_accepted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS service_interest VARCHAR(255),
  ADD COLUMN IF NOT EXISTS visit_goal VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS consideration_period VARCHAR(100),
  ADD COLUMN IF NOT EXISTS readiness_level SMALLINT,
  ADD COLUMN IF NOT EXISTS decision_factor VARCHAR(255),
  ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255),
  ADD COLUMN IF NOT EXISTS followup_importance SMALLINT,
  ADD COLUMN IF NOT EXISTS top_priorities TEXT[],
  ADD COLUMN IF NOT EXISTS main_concern VARCHAR(1000),
  ADD COLUMN IF NOT EXISTS openness_to_proceed SMALLINT,
  ADD COLUMN IF NOT EXISTS digital_signature_svg TEXT,
  ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_redirect_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completion_status VARCHAR(20) DEFAULT 'incomplete',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS patient_intake_responses_session_id_key
  ON public.patient_intake_responses(session_id);

DO $guard_survey_checks$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.patient_intake_responses'::regclass
      AND conname = 'patient_intake_responses_completion_status_check'
  ) THEN
    ALTER TABLE public.patient_intake_responses
      ADD CONSTRAINT patient_intake_responses_completion_status_check
      CHECK (completion_status IN ('incomplete','page1_done','page2_done','page3_done','page4_done','completed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.patient_intake_responses'::regclass
      AND conname = 'patient_intake_responses_readiness_level_check'
  ) THEN
    ALTER TABLE public.patient_intake_responses
      ADD CONSTRAINT patient_intake_responses_readiness_level_check
      CHECK (readiness_level IS NULL OR (readiness_level >= 1 AND readiness_level <= 5));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.patient_intake_responses'::regclass
      AND conname = 'patient_intake_responses_followup_importance_check'
  ) THEN
    ALTER TABLE public.patient_intake_responses
      ADD CONSTRAINT patient_intake_responses_followup_importance_check
      CHECK (followup_importance IS NULL OR (followup_importance >= 1 AND followup_importance <= 4));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.patient_intake_responses'::regclass
      AND conname = 'patient_intake_responses_openness_to_proceed_check'
  ) THEN
    ALTER TABLE public.patient_intake_responses
      ADD CONSTRAINT patient_intake_responses_openness_to_proceed_check
      CHECK (openness_to_proceed IS NULL OR (openness_to_proceed >= 1 AND openness_to_proceed <= 3));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.patient_intake_responses'::regclass
      AND conname = 'patient_intake_responses_visit_type_selection_check'
  ) THEN
    ALTER TABLE public.patient_intake_responses
      ADD CONSTRAINT patient_intake_responses_visit_type_selection_check
      CHECK (visit_type_selection IS NULL OR visit_type_selection IN ('first_time','returning'));
  END IF;
END
$guard_survey_checks$;

CREATE OR REPLACE FUNCTION public.check_pin_rate_limit(
  p_tenant_id UUID,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_attempt_count INT;
BEGIN
  SELECT COUNT(*) INTO v_attempt_count
  FROM public.pin_attempt_log
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
    AND (p_ip_address IS NULL OR ip_address = p_ip_address::inet)
    AND created_at > NOW() - INTERVAL '15 minutes';

  RETURN v_attempt_count < 5;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_patient_intake_page(p_session_id uuid, p_page integer, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  SELECT s.patient_id, s.tenant_id INTO v_patient_id, v_tenant_id
  FROM public.clinic_visit_sessions s
  WHERE s.id = p_session_id
    AND s.deleted_at IS NULL;

  IF v_patient_id IS NULL OR v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND';
  END IF;

  IF p_page IS NULL OR p_page < 1 OR p_page > 5 THEN
    RAISE EXCEPTION 'INVALID_PAGE_ORDER: unknown page %', p_page;
  END IF;

  SELECT id, completion_status::text INTO v_intake_id, v_current_status
  FROM public.patient_intake_responses
  WHERE session_id = p_session_id
    AND deleted_at IS NULL;

  IF v_current_status = 'completed' AND p_page < 5 THEN
    RAISE EXCEPTION 'SURVEY_ALREADY_COMPLETED';
  END IF;

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

  IF COALESCE(NOT (
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
    v_consent := (p_payload->>'consent_accepted')::boolean;
    IF jsonb_typeof(COALESCE(p_payload->'procedures_requested', '[]'::jsonb)) <> 'array' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: procedures_requested must be an array';
    END IF;
    v_procedures := ARRAY(SELECT jsonb_array_elements_text(p_payload->'procedures_requested'));
    IF v_visit_type IS NULL OR v_visit_type = '' THEN RAISE EXCEPTION 'VALIDATION_ERROR: visit_type_selection is required'; END IF;
    IF v_service_reason IS NULL THEN RAISE EXCEPTION 'VALIDATION_ERROR: service_reason is required'; END IF;
    IF array_length(v_procedures, 1) IS NULL THEN RAISE EXCEPTION 'VALIDATION_ERROR: at least one procedure is required'; END IF;
    IF v_consent IS DISTINCT FROM TRUE THEN RAISE EXCEPTION 'VALIDATION_ERROR: consent_accepted must be true'; END IF;
  ELSIF p_page = 2 THEN
    v_text_a := NULLIF(trim(p_payload->>'service_interest'), '');
    v_text_b := NULLIF(trim(p_payload->>'visit_goal'), '');
    v_text_c := NULLIF(trim(p_payload->>'consideration_period'), '');
  ELSIF p_page = 3 THEN
    v_num_a := (p_payload->>'readiness_level')::integer;
    IF v_num_a IS NULL OR v_num_a < 1 OR v_num_a > 5 THEN RAISE EXCEPTION 'VALIDATION_ERROR: readiness_level must be 1..5'; END IF;
    v_num_b := (p_payload->>'followup_importance')::integer;
    IF v_num_b IS NULL OR v_num_b < 1 OR v_num_b > 4 THEN RAISE EXCEPTION 'VALIDATION_ERROR: followup_importance must be 1..4'; END IF;
    v_text_a := NULLIF(trim(p_payload->>'decision_factor'), '');
    IF v_text_a IS NULL THEN RAISE EXCEPTION 'VALIDATION_ERROR: decision_factor is required'; END IF;
    v_text_b := NULLIF(trim(p_payload->>'referral_source'), '');
    IF v_text_b IS NULL THEN RAISE EXCEPTION 'VALIDATION_ERROR: referral_source is required'; END IF;
  ELSIF p_page = 4 THEN
    IF jsonb_typeof(COALESCE(p_payload->'top_priorities', '[]'::jsonb)) <> 'array' THEN RAISE EXCEPTION 'VALIDATION_ERROR: top_priorities must be an array'; END IF;
    v_arr := ARRAY(SELECT NULLIF(trim(x), '') FROM jsonb_array_elements_text(p_payload->'top_priorities') AS t(x));
    v_arr := (SELECT ARRAY_AGG(y) FROM unnest(v_arr) AS u(y) WHERE y IS NOT NULL);
    IF v_arr IS NULL OR array_length(v_arr, 1) IS NULL OR array_length(v_arr, 1) > 2 THEN RAISE EXCEPTION 'VALIDATION_ERROR: top_priorities must contain 1..2 items'; END IF;
    v_text_a := NULLIF(trim(p_payload->>'main_concern'), '');
    IF v_text_a IS NULL THEN RAISE EXCEPTION 'VALIDATION_ERROR: main_concern is required'; END IF;
    v_num_a := (p_payload->>'openness_to_proceed')::integer;
    IF v_num_a IS NULL OR v_num_a < 1 OR v_num_a > 3 THEN RAISE EXCEPTION 'VALIDATION_ERROR: openness_to_proceed must be 1..3'; END IF;
  ELSIF p_page = 5 THEN
    v_svg := NULLIF(trim(p_payload->>'digital_signature_svg'), '');
    IF v_svg IS NULL THEN RAISE EXCEPTION 'VALIDATION_ERROR: digital_signature_svg is required'; END IF;
    v_sig_raw := NULLIF(trim(p_payload->>'signature_timestamp'), '');
    IF v_sig_raw IS NULL THEN RAISE EXCEPTION 'VALIDATION_ERROR: signature_timestamp is required'; END IF;
    BEGIN
      v_sig_ts := v_sig_raw::timestamptz;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: signature_timestamp must be a valid ISO 8601 timestamp';
    END;
  END IF;

  INSERT INTO public.patient_intake_responses (session_id, patient_id, tenant_id, completion_status, deleted_at)
  VALUES (p_session_id, v_patient_id, v_tenant_id, v_new_status, NULL)
  ON CONFLICT (session_id) DO UPDATE
    SET patient_id = EXCLUDED.patient_id,
        tenant_id = EXCLUDED.tenant_id,
        completion_status = EXCLUDED.completion_status,
        deleted_at = NULL,
        updated_at = NOW()
  RETURNING id INTO v_intake_id;

  IF p_page = 1 THEN
    UPDATE public.patient_intake_responses SET visit_type_selection=v_visit_type, service_reason=v_service_reason, procedures_requested=v_procedures, consent_accepted=TRUE, consent_timestamp=NOW() WHERE id=v_intake_id;
  ELSIF p_page = 2 THEN
    UPDATE public.patient_intake_responses SET service_interest=v_text_a, visit_goal=v_text_b, consideration_period=v_text_c WHERE id=v_intake_id;
  ELSIF p_page = 3 THEN
    UPDATE public.patient_intake_responses SET readiness_level=v_num_a, decision_factor=v_text_a, referral_source=v_text_b, followup_importance=v_num_b WHERE id=v_intake_id;
  ELSIF p_page = 4 THEN
    UPDATE public.patient_intake_responses SET top_priorities=v_arr, main_concern=v_text_a, openness_to_proceed=v_num_a WHERE id=v_intake_id;
  ELSIF p_page = 5 THEN
    UPDATE public.patient_intake_responses SET digital_signature_svg=v_svg, signature_timestamp=v_sig_ts, whatsapp_redirect_sent=FALSE, completed_at=NOW() WHERE id=v_intake_id;
  END IF;

  RETURN jsonb_build_object('intake_id',v_intake_id,'completion_status',v_new_status);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.check_pin_rate_limit(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_pin_rate_limit(uuid,text) TO anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.save_patient_intake_page(uuid,integer,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_patient_intake_page(uuid,integer,jsonb) TO anon, authenticated, service_role;
