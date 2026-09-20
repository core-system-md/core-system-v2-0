-- CORE SYSTEM v2.1 — P140 production parity reconciliation
-- Evidence: Production had the required operational columns, but the main branch
-- did not carry the same forward-compatible schema boundary and the Doctor PIN
-- session RPC payload was missing the score indicators and longitudinal profile
-- consumed by DecisionCard.
-- Additive/idempotent only. No RLS, Auth, scoring formula, or business rule change.

ALTER TABLE public.clinic_patients
  ADD COLUMN IF NOT EXISTS patient_status VARCHAR(30);

ALTER TABLE public.clinic_visit_sessions
  ADD COLUMN IF NOT EXISTS is_insured BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS lock_holder_id UUID,
  ADD COLUMN IF NOT EXISTS lock_timestamp TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.get_doctor_session_for_pin_session(
  p_tenant_id uuid,
  p_session_token text,
  p_session_id uuid
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
  IF p_tenant_id IS NULL
     OR p_session_token IS NULL
     OR length(p_session_token) < 32
     OR p_session_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: invalid doctor session parameters';
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
    AND ps.deleted_at IS NULL
    AND ps.expires_at > NOW()
  LIMIT 1;

  IF v_staff_id IS NULL
     OR v_role NOT IN ('doctor', 'clinic_admin', 'super_admin') THEN
    RAISE EXCEPTION 'Unauthorized: invalid or expired doctor session';
  END IF;

  SELECT jsonb_build_object(
    'id', s.id,
    'patient_id', s.patient_id,
    'session_status', s.session_status,
    'created_at', s.created_at,
    'waiting_time_minutes', s.waiting_time_minutes,
    'session_duration_minutes', s.session_duration_minutes,
    'score_aps', s.score_aps,
    'score_dri', s.score_dri,
    'score_rvs', s.score_rvs,
    'score_uri', s.score_uri,
    'score_tsi', s.score_tsi,
    'score_pqs', s.score_pqs,
    'is_insured', s.is_insured,
    'core_score_display', s.core_score_display,
    'core_score_backend', s.core_score_backend,
    'patient_class', s.patient_class,
    'doctor_notes', s.doctor_notes,
    'par_result', s.par_result,
    'room_id', s.room_id,
    'agenda_event_id', s.agenda_event_id,
    'session_metadata', s.session_metadata,
    'patient_longitudinal_profile', (
      SELECT jsonb_build_object(
        'dominant_disc_profile', lp.dominant_disc_profile,
        'total_visits', lp.total_visits,
        'total_revenue_subunits', lp.total_revenue_subunits,
        'loyalty_tier', lp.loyalty_tier,
        'historical_core_score_avg', lp.historical_core_score_avg,
        'last_visit_date', lp.last_visit_date
      )
      FROM public.patient_longitudinal_profiles lp
      WHERE lp.patient_id = s.patient_id
        AND lp.tenant_id = s.tenant_id
        AND lp.deleted_at IS NULL
      ORDER BY lp.updated_at DESC NULLS LAST
      LIMIT 1
    ),
    'clinic_patients', jsonb_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'first_name_ar', p.first_name_ar,
      'last_name_ar', p.last_name_ar,
      'phone_primary', p.phone_primary,
      'date_of_birth', p.date_of_birth,
      'gender', p.gender,
      'dominant_disc_profile', p.dominant_disc_profile,
      'allergies', p.allergies
    )
  )
  INTO v_result
  FROM public.clinic_visit_sessions s
  JOIN public.clinic_patients p
    ON p.id = s.patient_id
   AND p.tenant_id = s.tenant_id
   AND p.deleted_at IS NULL
  WHERE s.id = p_session_id
    AND s.tenant_id = p_tenant_id
    AND s.deleted_at IS NULL
    AND (
      v_role IN ('clinic_admin', 'super_admin')
      OR (v_role = 'doctor' AND s.doctor_id = v_staff_id)
    )
  LIMIT 1;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Session not found or access denied';
  END IF;

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_doctor_session_for_pin_session(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_doctor_session_for_pin_session(uuid, text, uuid) TO anon, authenticated;