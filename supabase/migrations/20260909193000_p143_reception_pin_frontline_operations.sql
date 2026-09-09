-- P143: Reception front-line operations through the verified PIN session.
-- PIN authentication is intentionally separate from Supabase Auth JWTs.
-- Never expose tenant-scoped reception tables directly to the browser from PIN-authenticated screens.

CREATE OR REPLACE FUNCTION public.get_reception_inquiries_for_pin_session(
  p_tenant_id uuid,
  p_session_token text
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
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 THEN
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

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
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
      ) ORDER BY i.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.clinic_inquiries i
  WHERE i.tenant_id = p_tenant_id;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_reception_inquiry_for_pin_session(
  p_tenant_id uuid,
  p_session_token text,
  p_inquiry_type text,
  p_temp_patient_name text,
  p_temp_phone text,
  p_inquiry_reason text DEFAULT NULL,
  p_procedures_requested text[] DEFAULT NULL,
  p_expected_objection text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_staff_id uuid;
  v_role text;
  v_inquiry_id uuid;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 THEN
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

  IF p_inquiry_type NOT IN ('walk_in', 'appointment', 'callback', 'online') THEN
    RAISE EXCEPTION 'Invalid inquiry type';
  END IF;

  IF p_temp_patient_name IS NULL OR length(trim(p_temp_patient_name)) = 0 THEN
    RAISE EXCEPTION 'Missing inquiry name';
  END IF;

  IF p_temp_phone IS NULL OR length(trim(p_temp_phone)) < 7 THEN
    RAISE EXCEPTION 'Invalid inquiry phone';
  END IF;

  IF p_expected_objection IS NOT NULL
     AND p_expected_objection NOT IN ('price', 'trust', 'pain', 'time', 'results', 'safety') THEN
    RAISE EXCEPTION 'Invalid expected objection';
  END IF;

  INSERT INTO public.clinic_inquiries (
    tenant_id,
    inquiry_type,
    temp_patient_name,
    temp_phone,
    inquiry_reason,
    procedures_requested,
    expected_objection,
    status,
    handled_by,
    notes
  )
  VALUES (
    p_tenant_id,
    p_inquiry_type,
    trim(p_temp_patient_name),
    trim(p_temp_phone),
    NULLIF(trim(p_inquiry_reason), ''),
    p_procedures_requested,
    p_expected_objection,
    'pending',
    v_staff_id,
    NULLIF(trim(p_notes), '')
  )
  RETURNING id INTO v_inquiry_id;

  RETURN jsonb_build_object(
    'success', true,
    'inquiry_id', v_inquiry_id
  );
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
SET search_path = ''
AS $function$
DECLARE
  v_staff_id uuid;
  v_role text;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 THEN
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

  IF p_status NOT IN ('pending', 'converted_to_session', 'cancelled', 'rescheduled', 'no_show') THEN
    RAISE EXCEPTION 'Invalid inquiry status';
  END IF;

  UPDATE public.clinic_inquiries
     SET status = p_status,
         handled_by = v_staff_id,
         updated_at = NOW()
   WHERE id = p_inquiry_id
     AND tenant_id = p_tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inquiry not found';
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_reception_invoices_for_pin_session(
  p_tenant_id uuid,
  p_session_token text
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
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 THEN
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

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'patient_id', i.patient_id,
        'session_id', i.session_id,
        'invoice_date', i.invoice_date,
        'invoice_status', i.invoice_status,
        'subtotal_subunits', i.subtotal_subunits,
        'tax_subunits', i.tax_subunits,
        'discount_subunits', i.discount_subunits,
        'total_subunits', i.total_subunits,
        'amount_paid_subunits', i.amount_paid_subunits,
        'amount_due_subunits', i.amount_due_subunits,
        'payment_method', i.payment_method,
        'collected_reception', i.collected_reception
      ) ORDER BY i.invoice_date DESC, i.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_result
  FROM public.clinic_invoices i
  WHERE i.tenant_id = p_tenant_id
    AND i.deleted_at IS NULL;

  RETURN v_result;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_reception_inquiries_for_pin_session(uuid, text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_reception_inquiry_for_pin_session(uuid, text, text, text, text, text, text[], text, text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_reception_inquiry_status_for_pin_session(uuid, text, uuid, text) FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_reception_invoices_for_pin_session(uuid, text) FROM PUBLIC, authenticated;

GRANT EXECUTE ON FUNCTION public.get_reception_inquiries_for_pin_session(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_reception_inquiry_for_pin_session(uuid, text, text, text, text, text, text[], text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_reception_inquiry_status_for_pin_session(uuid, text, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_reception_invoices_for_pin_session(uuid, text) TO anon;
