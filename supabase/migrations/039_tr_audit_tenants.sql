-- 039_tr_audit_tenants.sql
-- P37-B: Audit tenant INSERT/UPDATE/DELETE events.

CREATE OR REPLACE FUNCTION public.fn_audit_tenants_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $p039$
BEGIN
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
    COALESCE(NEW.id, OLD.id),
    auth.uid(),
    CASE WHEN auth.uid() IS NULL THEN 'system' ELSE 'user' END,
    CASE TG_OP WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' WHEN 'DELETE' THEN 'delete' END,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$p039$;

DROP TRIGGER IF EXISTS tr_audit_tenants ON public.master_tenants;
CREATE TRIGGER tr_audit_tenants
AFTER INSERT OR UPDATE OR DELETE ON public.master_tenants
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_tenants_changes();