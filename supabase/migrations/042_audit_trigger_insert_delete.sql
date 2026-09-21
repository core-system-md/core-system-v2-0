-- 042_audit_trigger_insert_delete.sql
-- P38-C: Extend fn_audit_sensitive_changes to cover INSERT/UPDATE/DELETE
-- using the actual audit_trail schema.

CREATE OR REPLACE FUNCTION public.fn_audit_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $p042$
DECLARE
  v_tenant_id UUID;
  v_record_id UUID;
BEGIN
  BEGIN
    IF TG_OP = 'DELETE' THEN v_tenant_id := OLD.tenant_id; ELSE v_tenant_id := NEW.tenant_id; END IF;
  EXCEPTION WHEN OTHERS THEN v_tenant_id := NULL;
  END;

  BEGIN
    IF TG_OP = 'DELETE' THEN v_record_id := OLD.id; ELSE v_record_id := NEW.id; END IF;
  EXCEPTION WHEN OTHERS THEN v_record_id := NULL;
  END;

  INSERT INTO public.audit_trail (
    tenant_id,
    user_id,
    actor_type,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values
  ) VALUES (
    v_tenant_id,
    auth.uid(),
    CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END,
    CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' WHEN 'DELETE' THEN 'delete' END,
    TG_TABLE_NAME,
    v_record_id,
    CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$p042$;

DROP TRIGGER IF EXISTS tr_audit_sessions_insert ON public.clinic_visit_sessions;
CREATE TRIGGER tr_audit_sessions_insert
AFTER INSERT ON public.clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_sensitive_changes();

DROP TRIGGER IF EXISTS tr_audit_sessions_delete ON public.clinic_visit_sessions;
CREATE TRIGGER tr_audit_sessions_delete
AFTER DELETE ON public.clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_sensitive_changes();

DROP TRIGGER IF EXISTS tr_audit_invoices_insert ON public.clinic_invoices;
CREATE TRIGGER tr_audit_invoices_insert
AFTER INSERT ON public.clinic_invoices
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_sensitive_changes();

DROP TRIGGER IF EXISTS tr_audit_invoices_delete ON public.clinic_invoices
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_sensitive_changes();