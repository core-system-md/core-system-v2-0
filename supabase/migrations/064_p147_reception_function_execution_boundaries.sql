-- P147 — Reception RPC execution boundaries and invoice state guard.

REVOKE EXECUTE ON FUNCTION public.reorder_reception_queue_for_pin_session(uuid,text,uuid,integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.acquire_reception_session_lock_for_pin_session(uuid,text,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.release_reception_session_lock_for_pin_session(uuid,text,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_reception_hot_swap_suggestions_for_pin_session(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_reception_queue_for_pin_session(uuid,text,uuid,integer) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_reception_session_lock_for_pin_session(uuid,text,uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.release_reception_session_lock_for_pin_session(uuid,text,uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_reception_hot_swap_suggestions_for_pin_session(uuid,text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.mark_reception_invoice_paid_for_pin_session(p_tenant_id uuid,p_session_token text,p_invoice_id uuid,p_payment_method text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_staff_id uuid; v_role text; v_total integer;
BEGIN
  SELECT ps.staff_id,cu.role INTO v_staff_id,v_role FROM public.pin_sessions ps JOIN public.clinic_users cu ON cu.id=ps.staff_id AND cu.tenant_id=ps.tenant_id AND cu.is_active=true AND cu.deleted_at IS NULL WHERE ps.tenant_id=p_tenant_id AND ps.token_hash=extensions.digest(p_session_token,'sha256') AND ps.deleted_at IS NULL AND ps.expires_at>NOW() LIMIT 1;
  IF v_staff_id IS NULL OR v_role NOT IN ('receptionist','clinic_admin','super_admin') THEN RAISE EXCEPTION 'Unauthorized: invalid or expired reception session'; END IF;
  IF p_payment_method IS NOT NULL AND p_payment_method NOT IN ('cash','card_visa','card_mastercard','bank_transfer','installment','mixed') THEN RAISE EXCEPTION 'Invalid payment method'; END IF;
  SELECT total_subunits INTO v_total FROM public.clinic_invoices WHERE id=p_invoice_id AND tenant_id=p_tenant_id AND deleted_at IS NULL AND invoice_status NOT IN ('cancelled','refunded','paid') FOR UPDATE;
  IF v_total IS NULL THEN RETURN false; END IF;
  UPDATE public.clinic_invoices SET amount_paid_subunits=v_total,amount_due_subunits=0,invoice_status='paid',payment_method=COALESCE(p_payment_method,payment_method),collected_reception=true,collected_by=v_staff_id,updated_at=NOW() WHERE id=p_invoice_id AND tenant_id=p_tenant_id AND deleted_at IS NULL AND invoice_status NOT IN ('cancelled','refunded','paid');
  RETURN FOUND;
END;
$function$;
REVOKE EXECUTE ON FUNCTION public.mark_reception_invoice_paid_for_pin_session(uuid,text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_reception_invoice_paid_for_pin_session(uuid,text,uuid,text) TO anon,authenticated,service_role;
