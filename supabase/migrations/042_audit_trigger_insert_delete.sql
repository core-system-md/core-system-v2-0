-- 042_audit_trigger_insert_delete.sql
-- P38-C: Extend fn_audit_sensitive_changes to cover INSERT and DELETE
-- Existing UPDATE behavior is preserved. Existing triggers are NOT modified.

CREATE OR REPLACE FUNCTION fn_audit_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $\$
DECLARE
  v_tenant_id UUID;
  v_record_id UUID;
BEGIN
  -- Safely extract tenant_id
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_tenant_id := OLD.tenant_id;
    ELSE
      v_tenant_id := NEW.tenant_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_tenant_id := NULL;
  END;

  -- Safely extract record_id
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_record_id := OLD.id;
    ELSE
      v_record_id := NEW.id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_record_id := NULL;
  END;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_trail (
      tenant_id, actor_id, actor_role, action, table_name, record_id, old_values, new_values
    ) VALUES (
      v_tenant_id,
      auth.uid(),
      (auth.jwt()->>'user_role')::TEXT,
      'UPDATE',
      TG_TABLE_NAME,
      v_record_id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_trail (
      tenant_id, actor_id, actor_role, action, table_name, record_id, old_values, new_values
    ) VALUES (
      v_tenant_id,
      auth.uid(),
      (auth.jwt()->>'user_role')::TEXT,
      'INSERT',
      TG_TABLE_NAME,
      v_record_id,
      NULL,
      to_jsonb(NEW)
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_trail (
      tenant_id, actor_id, actor_role, action, table_name, record_id, old_values, new_values
    ) VALUES (
      v_tenant_id,
      auth.uid(),
      (auth.jwt()->>'user_role')::TEXT,
      'DELETE',
      TG_TABLE_NAME,
      v_record_id,
      to_jsonb(OLD),
      NULL
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$\$;

-- INSERT trigger for clinic_visit_sessions
DROP TRIGGER IF EXISTS tr_audit_sessions_insert ON clinic_visit_sessions;
CREATE TRIGGER tr_audit_sessions_insert
AFTER INSERT ON clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION fn_audit_sensitive_changes();

-- DELETE trigger for clinic_visit_sessions
DROP TRIGGER IF EXISTS tr_audit_sessions_delete ON clinic_visit_sessions;
CREATE TRIGGER tr_audit_sessions_delete
AFTER DELETE ON clinic_visit_sessions
FOR EACH ROW EXECUTE FUNCTION fn_audit_sensitive_changes();

-- INSERT trigger for clinic_invoices
DROP TRIGGER IF EXISTS tr_audit_invoices_insert ON clinic_invoices;
CREATE TRIGGER tr_audit_invoices_insert
AFTER INSERT ON clinic_invoices
FOR EACH ROW EXECUTE FUNCTION fn_audit_sensitive_changes();

-- DELETE trigger for clinic_invoices
DROP TRIGGER IF EXISTS tr_audit_invoices_delete ON clinic_invoices;
CREATE TRIGGER tr_audit_invoices_delete
AFTER DELETE ON clinic_invoices
FOR EACH ROW EXECUTE FUNCTION fn_audit_sensitive_changes();
