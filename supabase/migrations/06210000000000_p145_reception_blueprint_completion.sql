-- P145 — Reception Blueprint completion
-- Queue order + secure PIN-session mutations for lock, hot-swap suggestion, and invoice collection.

ALTER TABLE public.clinic_visit_sessions
  ADD COLUMN IF NOT EXISTS queue_position integer,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_clinic_visit_sessions_queue_order
  ON public.clinic_visit_sessions (tenant_id, queue_position, created_at)
  WHERE deleted_at IS NULL AND session_status NOT IN ('completed','cancelled');

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY tenant_id ORDER BY created_at, id)::int AS pos
  FROM public.clinic_visit_sessions
  WHERE deleted_at IS NULL AND session_status = 'waiting'
)
UPDATE public.clinic_visit_sessions s
SET queue_position = r.pos, updated_at = NOW()
FROM ranked r
WHERE s.id = r.id AND s.queue_position IS DISTINCT FROM r.pos;

CREATE OR REPLACE FUNCTION public.get_queue_for_pin_session(p_tenant_id uuid, p_session_token text)
RETURNS TABLE(id uuid, patient_id uuid, doctor_id uuid, room_id uuid, session_status text,
  core_score_display numeric, is_insured boolean, lock_holder_id uuid, wait_time_minutes integer,
  actual_check_in timestamptz, actual_start timestamptz, clinic_patients json, clinic_users json, clinic_procedures json)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
DECLARE v_staff_id uuid;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 THEN RAISE EXCEPTION 'Unauthorized: invalid PIN session'; END IF;
  SELECT ps.staff_id INTO v_staff_id FROM public.pin_sessions ps
  JOIN public.clinic_users cu ON cu.id=ps.staff_id AND cu.tenant_id=ps.tenant_id AND cu.is_active=true AND cu.deleted_at IS NULL
  WHERE ps.tenant_id=p_tenant_id AND ps.token_hash=extensions.digest(p_session_token,'sha256') AND ps.deleted_at IS NULL AND ps.expires_at>NOW() LIMIT 1;
  IF v_staff_id IS NULL THEN RAISE EXCEPTION 'Unauthorized: invalid or expired PIN session'; END IF;
  RETURN QUERY
  SELECT s.id,s.patient_id,s.doctor_id,s.room_id,s.session_status::text,s.core_score_display,s.is_insured,s.lock_holder_id,
    COALESCE(s.wait_time_minutes,s.waiting_time_minutes)::int,s.arrived_at,s.session_started_at,to_json(p)::json,to_json(d)::json,to_json(pr)::json
  FROM public.clinic_visit_sessions s
  LEFT JOIN public.clinic_patients p ON p.id=s.patient_id
  LEFT JOIN public.clinic_users d ON d.id=s.doctor_id
  LEFT JOIN public.clinic_procedures pr ON pr.id=s.procedure_id
  WHERE s.tenant_id=p_tenant_id AND s.deleted_at IS NULL AND s.session_status NOT IN ('completed','cancelled')
  ORDER BY CASE WHEN s.session_status='waiting' THEN COALESCE(s.queue_position,2147483647) ELSE 2147483647 END,s.created_at ASC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reorder_reception_queue_for_pin_session(p_tenant_id uuid,p_session_token text,p_session_id uuid,p_to_index integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
DECLARE v_staff_id uuid; v_role text; v_current int; v_target int; v_count int;
BEGIN
  SELECT ps.staff_id,cu.role INTO v_staff_id,v_role FROM public.pin_sessions ps
  JOIN public.clinic_users cu ON cu.id=ps.staff_id AND cu.tenant_id=ps.tenant_id AND cu.is_active=true AND cu.deleted_at IS NULL
  WHERE ps.tenant_id=p_tenant_id AND ps.token_hash=extensions.digest(p_session_token,'sha256') AND ps.deleted_at IS NULL AND ps.expires_at>NOW() LIMIT 1;
  IF v_staff_id IS NULL OR v_role NOT IN ('receptionist','clinic_admin','super_admin') THEN RAISE EXCEPTION 'Unauthorized: invalid or expired reception session'; END IF;
  SELECT count(*)::int,max(CASE WHEN id=p_session_id THEN pos END)::int INTO v_count,v_current FROM (
    SELECT id,row_number() OVER (ORDER BY COALESCE(queue_position,2147483647),created_at,id) pos
    FROM public.clinic_visit_sessions WHERE tenant_id=p_tenant_id AND deleted_at IS NULL AND session_status='waiting'
  ) q;
  IF v_current IS NULL THEN RAISE EXCEPTION 'Queue session not found'; END IF;
  v_target := GREATEST(1,LEAST(COALESCE(p_to_index,v_current),v_count));
  IF v_current=v_target THEN RETURN true; END IF;
  UPDATE public.clinic_visit_sessions s SET queue_position=CASE
    WHEN s.id=p_session_id THEN v_target
    WHEN v_current<v_target AND COALESCE(s.queue_position,2147483647)>v_current AND COALESCE(s.queue_position,2147483647)<=v_target THEN COALESCE(s.queue_position,2147483647)-1
    WHEN v_current>v_target AND COALESCE(s.queue_position,2147483647)>=v_target AND COALESCE(s.queue_position,2147483647)<v_current THEN COALESCE(s.queue_position,2147483647)+1
    ELSE COALESCE(s.queue_position,2147483647) END,updated_at=NOW()
  WHERE s.tenant_id=p_tenant_id AND s.deleted_at IS NULL AND s.session_status='waiting';
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.acquire_reception_session_lock_for_pin_session(p_tenant_id uuid,p_session_token text,p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
DECLARE v_staff_id uuid; v_role text; v_holder uuid;
BEGIN
  SELECT ps.staff_id,cu.role INTO v_staff_id,v_role FROM public.pin_sessions ps JOIN public.clinic_users cu ON cu.id=ps.staff_id AND cu.tenant_id=ps.tenant_id AND cu.is_active=true AND cu.deleted_at IS NULL
  WHERE ps.tenant_id=p_tenant_id AND ps.token_hash=extensions.digest(p_session_token,'sha256') AND ps.deleted_at IS NULL AND ps.expires_at>NOW() LIMIT 1;
  IF v_staff_id IS NULL OR v_role NOT IN ('receptionist','clinic_admin','super_admin') THEN RAISE EXCEPTION 'Unauthorized: invalid or expired reception session'; END IF;
  SELECT lock_holder_id INTO v_holder FROM public.clinic_visit_sessions WHERE id=p_session_id AND tenant_id=p_tenant_id AND deleted_at IS NULL AND session_status NOT IN ('completed','cancelled') FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','SESSION_CLOSED'); END IF;
  IF v_holder IS NOT NULL AND v_holder<>v_staff_id THEN RETURN jsonb_build_object('success',false,'error','ALREADY_LOCKED','locked_by',v_holder); END IF;
  UPDATE public.clinic_visit_sessions SET lock_holder_id=v_staff_id,lock_timestamp=NOW(),updated_at=NOW() WHERE id=p_session_id AND tenant_id=p_tenant_id;
  RETURN jsonb_build_object('success',true,'lock_holder_id',v_staff_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_reception_session_lock_for_pin_session(p_tenant_id uuid,p_session_token text,p_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
DECLARE v_staff_id uuid; v_role text; v_holder uuid;
BEGIN
  SELECT ps.staff_id,cu.role INTO v_staff_id,v_role FROM public.pin_sessions ps JOIN public.clinic_users cu ON cu.id=ps.staff_id AND cu.tenant_id=ps.tenant_id AND cu.is_active=true AND cu.deleted_at IS NULL
  WHERE ps.tenant_id=p_tenant_id AND ps.token_hash=extensions.digest(p_session_token,'sha256') AND ps.deleted_at IS NULL AND ps.expires_at>NOW() LIMIT 1;
  IF v_staff_id IS NULL OR v_role NOT IN ('receptionist','clinic_admin','super_admin') THEN RAISE EXCEPTION 'Unauthorized: invalid or expired reception session'; END IF;
  SELECT lock_holder_id INTO v_holder FROM public.clinic_visit_sessions WHERE id=p_session_id AND tenant_id=p_tenant_id AND deleted_at IS NULL AND session_status NOT IN ('completed','cancelled') FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success',false,'error','SESSION_CLOSED'); END IF;
  IF v_holder IS NOT NULL AND v_holder<>v_staff_id AND v_role<>'super_admin' THEN RETURN jsonb_build_object('success',false,'error','UNAUTHORIZED'); END IF;
  UPDATE public.clinic_visit_sessions SET lock_holder_id=NULL,lock_timestamp=NULL,updated_at=NOW() WHERE id=p_session_id AND tenant_id=p_tenant_id;
  RETURN jsonb_build_object('success',true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_reception_hot_swap_suggestions_for_pin_session(p_tenant_id uuid,p_session_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $function$
DECLARE v_staff_id uuid; v_role text; v_result jsonb;
BEGIN
  SELECT ps.staff_id,cu.role INTO v_staff_id,v_role FROM public.pin_sessions ps JOIN public.clinic_users cu ON cu.id=ps.staff_id AND cu.tenant_id=ps.tenant_id AND cu.is_active=true AND cu.deleted_at IS NULL WHERE ps.tenant_id=p_tenant_id AND ps.token_hash=extensions.digest(p_session_token,'sha256') AND ps.deleted_at IS NULL AND ps.expires_at>NOW() LIMIT 1;
  IF v_staff_id IS NULL OR v_role NOT IN ('receptionist','clinic_admin','super_admin') THEN RAISE EXCEPTION 'Unauthorized: invalid or expired reception session'; END IF;
  SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY x.wait_rank,x.room_name),'[]'::jsonb) INTO v_result FROM (
    SELECT s.id AS session_id,s.patient_id,p.full_name AS patient_name,r.id AS room_id,r.room_name,
      row_number() OVER(ORDER BY COALESCE(s.queue_position,2147483647),s.created_at,s.id)::int AS wait_rank
    FROM public.clinic_visit_sessions s JOIN public.clinic_patients p ON p.id=s.patient_id AND p.deleted_at IS NULL
    CROSS JOIN LATERAL (SELECT cr.id,cr.room_name FROM public.clinic_rooms cr WHERE cr.tenant_id=p_tenant_id AND cr.is_active=true AND cr.room_type='consultation'
      AND NOT EXISTS (SELECT 1 FROM public.clinic_visit_sessions busy WHERE busy.tenant_id=p_tenant_id AND busy.room_id=cr.id AND busy.deleted_at IS NULL AND busy.session_status IN ('in_consultation','pending_close'))
      ORDER BY cr.room_name LIMIT 1) r
    WHERE s.tenant_id=p_tenant_id AND s.deleted_at IS NULL AND s.session_status='waiting'
  ) x;
  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_reception_invoice_paid_for_pin_session(p_tenant_id uuid,p_session_token text,p_invoice_id uuid,p_payment_method text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_staff_id uuid; v_role text; v_total integer;
BEGIN
  SELECT ps.staff_id,cu.role INTO v_staff_id,v_role FROM public.pin_sessions ps JOIN public.clinic_users cu ON cu.id=ps.staff_id AND cu.tenant_id=ps.tenant_id AND cu.is_active=true AND cu.deleted_at IS NULL WHERE ps.tenant_id=p_tenant_id AND ps.token_hash=extensions.digest(p_session_token,'sha256') AND ps.deleted_at IS NULL AND ps.expires_at>NOW() LIMIT 1;
  IF v_staff_id IS NULL OR v_role NOT IN ('receptionist','clinic_admin','super_admin') THEN RAISE EXCEPTION 'Unauthorized: invalid or expired reception session'; END IF;
  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('cash','card_visa','card_mastercard','bank_transfer','installment','mixed') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  SELECT total_subunits INTO v_total FROM public.clinic_invoices WHERE id=p_invoice_id AND tenant_id=p_tenant_id AND deleted_at IS NULL FOR UPDATE;
  IF v_total IS NULL THEN RETURN false; END IF;
  UPDATE public.clinic_invoices SET amount_paid_subunits=v_total,amount_due_subunits=0,invoice_status='paid',payment_method=COALESCE(p_payment_method,payment_method),collected_reception=true,collected_by=v_staff_id,updated_at=NOW()
  WHERE id=p_invoice_id AND tenant_id=p_tenant_id AND deleted_at IS NULL;
  RETURN FOUND;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reorder_reception_queue_for_pin_session(uuid,text,uuid,integer) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_reception_session_lock_for_pin_session(uuid,text,uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_reception_session_lock_for_pin_session(uuid,text,uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_reception_hot_swap_suggestions_for_pin_session(uuid,text) TO anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_reception_invoice_paid_for_pin_session(uuid,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_reception_invoice_paid_for_pin_session(uuid,text,uuid,text) TO anon,authenticated,service_role;
