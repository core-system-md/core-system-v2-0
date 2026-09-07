-- CORE SYSTEM v2.1 — PIN session bridge for legacy kiosk authentication
-- Purpose: keep the existing 4-digit PIN login while giving protected queue reads
-- a server-verifiable, short-lived session token. No auth.users IDs are changed.

CREATE TABLE IF NOT EXISTS public.pin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.master_tenants(id),
  staff_id UUID NOT NULL REFERENCES public.clinic_users(id),
  token_hash BYTEA NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pin_sessions_lookup
  ON public.pin_sessions(tenant_id, staff_id, expires_at);

ALTER TABLE public.pin_sessions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.pin_sessions FROM anon, authenticated, public;

CREATE OR REPLACE FUNCTION public.create_pin_session(
  p_tenant_id UUID,
  p_employee_code TEXT,
  p_pin TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user public.clinic_users%ROWTYPE;
  v_token TEXT;
BEGIN
  IF p_tenant_id IS NULL OR p_employee_code IS NULL OR p_pin IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_PARAMETERS');
  END IF;

  IF NOT public.check_pin_rate_limit(p_tenant_id) THEN
    INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, NULL, p_pin, false, NULL);
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Too many PIN attempts. Try again later.';
  END IF;

  SELECT * INTO v_user
  FROM public.clinic_users
  WHERE tenant_id = p_tenant_id
    AND employee_code = p_employee_code
    AND pin_code = p_pin
    AND is_active = TRUE
    AND deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, NULL, p_pin, false, NULL);
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  END IF;

  INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
  VALUES (p_tenant_id, v_user.id, p_pin, true, NULL);

  v_token := encode(gen_random_bytes(32), 'hex');

  DELETE FROM public.pin_sessions
  WHERE staff_id = v_user.id
    AND tenant_id = p_tenant_id;

  INSERT INTO public.pin_sessions (tenant_id, staff_id, token_hash, expires_at)
  VALUES (
    p_tenant_id,
    v_user.id,
    digest(v_token, 'sha256'),
    NOW() + INTERVAL '8 hours'
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_token', v_token,
    'user_id', v_user.id,
    'full_name', v_user.full_name,
    'full_name_ar', v_user.full_name_ar,
    'role', v_user.role,
    'tenant_id', v_user.tenant_id,
    'employee_code', v_user.employee_code,
    'email', v_user.email,
    'phone', v_user.phone,
    'specialization', v_user.specialization
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_pin_session(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_pin_session(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_pin_session(UUID, TEXT, TEXT) TO anon;

CREATE OR REPLACE FUNCTION public.get_queue_for_pin_session(
  p_tenant_id UUID,
  p_session_token TEXT
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
  wait_time_minutes INTEGER,
  actual_check_in TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  clinic_patients JSON,
  clinic_users JSON,
  clinic_procedures JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 THEN
    RAISE EXCEPTION 'Unauthorized: invalid PIN session';
  END IF;

  SELECT ps.staff_id INTO v_staff_id
  FROM public.pin_sessions AS ps
  JOIN public.clinic_users AS cu
    ON cu.id = ps.staff_id
   AND cu.tenant_id = ps.tenant_id
   AND cu.is_active = TRUE
   AND cu.deleted_at IS NULL
  WHERE ps.tenant_id = p_tenant_id
    AND ps.token_hash = digest(p_session_token, 'sha256')
    AND ps.expires_at > NOW()
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: invalid or expired PIN session';
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
    to_json(p)::JSON,
    to_json(d)::JSON,
    to_json(pr)::JSON
  FROM public.clinic_visit_sessions AS s
  LEFT JOIN public.clinic_patients AS p ON p.id = s.patient_id
  LEFT JOIN public.clinic_users AS d ON d.id = s.doctor_id
  LEFT JOIN public.clinic_procedures AS pr ON pr.id = s.procedure_id
  WHERE s.tenant_id = p_tenant_id
    AND s.deleted_at IS NULL
    AND s.session_status NOT IN ('completed', 'cancelled')
  ORDER BY s.created_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_queue_for_pin_session(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_queue_for_pin_session(UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_queue_for_pin_session(UUID, TEXT) TO anon;
