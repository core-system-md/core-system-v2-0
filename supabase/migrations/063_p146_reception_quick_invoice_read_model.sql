-- P146 — Reception QuickInvoice read-model enrichment.
-- Keeps PIN-session authorization and soft-delete boundary intact while adding patient display names.

CREATE OR REPLACE FUNCTION public.get_reception_invoices_for_pin_session(p_tenant_id uuid,p_session_token text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_staff_id uuid; v_role text; v_result jsonb;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token)<32 THEN RAISE EXCEPTION 'Unauthorized: invalid reception session'; END IF;
  SELECT ps.staff_id,cu.role INTO v_staff_id,v_role
  FROM public.pin_sessions ps JOIN public.clinic_users cu ON cu.id=ps.staff_id AND cu.tenant_id=ps.tenant_id AND cu.is_active=true AND cu.deleted_at IS NULL
  WHERE ps.tenant_id=p_tenant_id AND ps.token_hash=extensions.digest(p_session_token,'sha256') AND ps.deleted_at IS NULL AND ps.expires_at>NOW() LIMIT 1;
  IF v_staff_id IS NULL OR v_role NOT IN ('receptionist','clinic_admin','super_admin') THEN RAISE EXCEPTION 'Unauthorized: invalid or expired reception session'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id',i.id,'patient_id',i.patient_id,'patient_name',coalesce(p.full_name,p.first_name||' '||p.last_name),'patient_name_ar',p.full_name_ar,
    'session_id',i.session_id,'invoice_date',i.invoice_date,'invoice_status',i.invoice_status,
    'subtotal_subunits',i.subtotal_subunits,'tax_subunits',i.tax_subunits,'discount_subunits',i.discount_subunits,'total_subunits',i.total_subunits,
    'amount_paid_subunits',i.amount_paid_subunits,'amount_due_subunits',i.amount_due_subunits,'payment_method',i.payment_method,'collected_reception',i.collected_reception
  ) ORDER BY i.invoice_date DESC,i.created_at DESC),'[]'::jsonb)
  INTO v_result
  FROM public.clinic_invoices i
  LEFT JOIN public.clinic_patients p ON p.id=i.patient_id AND p.deleted_at IS NULL
  WHERE i.tenant_id=p_tenant_id AND i.deleted_at IS NULL;
  RETURN v_result;
END;
$function$;
