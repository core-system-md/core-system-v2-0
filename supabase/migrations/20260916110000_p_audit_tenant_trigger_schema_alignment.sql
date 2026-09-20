-- P-Audit: Align the tenant audit trigger with the canonical audit_trail schema.
--
-- Evidence:
-- - audit_trail defines user_id / actor_type / entity_type / entity_id.
-- - Migration 039 still writes legacy actor_id / actor_role / table_name / record_id.
-- - audit_trail.action accepts create/update/delete, not INSERT.
-- - Master tenant INSERT/UPDATE/DELETE triggers therefore fail E2E seeding
--   before the tenant row can be written.
--
-- Keep this as a forward migration so historical migrations remain untouched.

CREATE OR REPLACE FUNCTION public.fn_audit_tenants_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_action TEXT;
  v_actor_type TEXT;
BEGIN
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'create'
    WHEN 'UPDATE' THEN 'update'
    WHEN 'DELETE' THEN 'delete'
    ELSE 'other'
  END;

  v_actor_type := CASE
    WHEN auth.uid() IS NULL THEN 'system'
    ELSE 'user'
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
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    auth.uid(),
    v_actor_type,
    v_action,
    TG_TABLE_NAME,
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_tenants ON public.master_tenants;

CREATE TRIGGER tr_audit_tenants
AFTER INSERT OR UPDATE OR DELETE ON public.master_tenants
FOR EACH ROW EXECUTE FUNCTION public.fn_audit_tenants_changes();
