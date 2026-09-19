-- P-AuditSessions: Align the shared session/invoice audit trigger with audit_trail.
--
-- Evidence:
-- - audit_trail canonical columns are user_id / actor_type / entity_type / entity_id.
-- - Migration 042 overwrites fn_audit_sensitive_changes() with legacy
--   actor_id / actor_role / table_name / record_id and uppercase actions.
-- - E2E session INSERT reaches that trigger and currently fails because
--   audit_trail.actor_id does not exist in the isolated canonical schema.
-- - The function is shared by clinic_visit_sessions and clinic_invoices.
--
-- Keep this as a forward migration so historical migrations remain untouched.

CREATE OR REPLACE FUNCTION public.fn_audit_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_entity_id UUID;
  v_actor_type TEXT;
  v_action TEXT;
BEGIN
  v_tenant_id := CASE TG_OP WHEN 'DELETE' THEN OLD.tenant_id ELSE NEW.tenant_id END;
  v_entity_id := CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END;
  v_actor_type := CASE
    WHEN auth.uid() IS NULL THEN 'system'
    ELSE 'user'
  END;
  v_action := CASE TG_OP
    WHEN 'INSERT' THEN 'create'
    WHEN 'UPDATE' THEN 'update'
    WHEN 'DELETE' THEN 'delete'
    ELSE 'other'
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
    v_actor_type,
    v_action,
    TG_TABLE_NAME,
    v_entity_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;