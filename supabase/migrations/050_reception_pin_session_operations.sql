-- P50: Reception dashboard operations through the verified PIN session.
-- The PIN-only auth flow intentionally has no Supabase Auth JWT, so reception
-- reads/writes must not call tenant-scoped tables directly from the browser.
-- These functions validate the secure PIN session and keep tenant isolation server-side.

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
          'scheduled_start', a.scheduled_start,
          'scheduled_end', a.scheduled_end,
          'status', a.status
        ) ORDER BY a.scheduled_start
      )
      FROM public.master_agenda_events a
      LEFT JOIN public.clinic_patients p ON p.id = a.patient_id
      LEFT JOIN public.clinic_users d ON d.id = a.doctor_id
      WHERE a.tenant_id = p_tenant_id
        AND a.deleted_at IS NULL
        AND a.scheduled_start >= p_date::timestamptz
        AND a.scheduled_start < (p_date + 1)::timestamptz
        AND a.status NOT IN ('cancelled', 'no_show')
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_reception_patient_for_pin_session(
  p_tenant_id uuid,
  p_session_token text,
  p_phone text
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
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 OR p_phone IS NULL OR length(trim(p_phone)) < 7 THEN
    RAISE EXCEPTION 'Invalid patient search parameters';
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
    'id', p.id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'phone_primary', p.phone_primary,
    'patient_status', p.patient_status
  ) INTO v_result
  FROM public.clinic_patients p
  WHERE p.tenant_id = p_tenant_id
    AND p.deleted_at IS NULL
    AND p.phone_primary ILIKE '%' || trim(p_phone) || '%'
  ORDER BY p.created_at DESC
  LIMIT 1;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_reception_quick_booking_for_pin_session(
  p_tenant_id uuid,
  p_session_token text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_gender text,
  p_doctor_id uuid,
  p_scheduled_start timestamptz,
  p_inquiry_reason text DEFAULT NULL,
  p_existing_patient_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_staff_id uuid;
  v_role text;
  v_patient_id uuid;
  v_agenda_id uuid;
  v_session_id uuid;
  v_scheduled_end timestamptz;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 THEN
    RAISE EXCEPTION 'Unauthorized: invalid reception session';
  END IF;
  IF p_first_name IS NULL OR length(trim(p_first_name)) = 0 OR p_phone IS NULL OR length(trim(p_phone)) = 0 OR p_doctor_id IS NULL OR p_scheduled_start IS NULL THEN
    RAISE EXCEPTION 'Missing required booking fields';
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.clinic_users d
    WHERE d.id = p_doctor_id
      AND d.tenant_id = p_tenant_id
      AND d.role = 'doctor'
      AND d.is_active = true
      AND d.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid doctor';
  END IF;

  IF p_existing_patient_id IS NOT NULL THEN
    SELECT p.id INTO v_patient_id
    FROM public.clinic_patients p
    WHERE p.id = p_existing_patient_id
      AND p.tenant_id = p_tenant_id
      AND p.deleted_at IS NULL
    LIMIT 1;

    IF v_patient_id IS NULL THEN
      RAISE EXCEPTION 'Invalid existing patient';
    END IF;
  ELSE
    v_patient_id := extensions.gen_random_uuid();
    INSERT INTO public.clinic_patients (
      id, tenant_id, mrn, full_name, first_name, last_name,
      phone_primary, gender, patient_status, preferred_channel
    ) VALUES (
      v_patient_id,
      p_tenant_id,
      'MRN-' || upper(substr(encode(extensions.gen_random_bytes(8), 'hex'), 1, 10)),
      trim(concat_ws(' ', p_first_name, p_last_name)),
      trim(p_first_name),
      NULLIF(trim(p_last_name), ''),
      trim(p_phone),
      NULLIF(trim(p_gender), ''),
      'active',
      'whatsapp'
    );

    INSERT INTO public.patient_longitudinal_profiles (
      tenant_id, patient_id, loyalty_tier
    ) VALUES (
      p_tenant_id, v_patient_id, 'standard'
    );
  END IF;

  v_scheduled_end := p_scheduled_start + interval '30 minutes';

  INSERT INTO public.master_agenda_events (
    tenant_id, patient_id, doctor_id,
    scheduled_start, scheduled_end, buffer_end,
    event_type, visit_type, status, booking_notes, created_by
  ) VALUES (
    p_tenant_id, v_patient_id, p_doctor_id,
    p_scheduled_start, v_scheduled_end, v_scheduled_end,
    'appointment',
    CASE WHEN p_existing_patient_id IS NULL THEN 'first_time' ELSE 'follow_up' END,
    'scheduled',
    NULLIF(trim(p_inquiry_reason), ''),
    v_staff_id
  ) RETURNING id INTO v_agenda_id;

  INSERT INTO public.clinic_visit_sessions (
    tenant_id, patient_id, doctor_id, agenda_event_id,
    session_status, initialized_by_receptionist, is_insured,
    scheduled_start, scheduled_end
  ) VALUES (
    p_tenant_id, v_patient_id, p_doctor_id, v_agenda_id,
    'waiting', v_staff_id, false,
    p_scheduled_start, v_scheduled_end
  ) RETURNING id INTO v_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'patient_id', v_patient_id,
    'agenda_event_id', v_agenda_id,
    'session_id', v_session_id
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_reception_dashboard_for_pin_session(uuid, text, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_reception_patient_for_pin_session(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_reception_quick_booking_for_pin_session(uuid, text, text, text, text, text, uuid, timestamptz, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reception_dashboard_for_pin_session(uuid, text, date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_reception_patient_for_pin_session(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_reception_quick_booking_for_pin_session(uuid, text, text, text, text, text, uuid, timestamptz, text, uuid) TO anon, authenticated;
