-- 039_tr_audit_tenants.sql
-- P37-B: Add audit trigger for master_tenants

CREATE OR REPLACE FUNCTION fn_audit_tenants_changes()
RETURNS TRIGGER AS $\$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_trail (
      tenant_id, actor_id, actor_role, action, table_name, record_id, old_values, new_values
    ) VALUES (
      NEW.id, auth.uid(), (auth.jwt()->>'user_role')::TEXT, 'UPDATE', TG_TABLE_NAME, OLD.id,
      to_jsonb(OLD), to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_trail (
      tenant_id, actor_id, actor_role, action, table_name, record_id, old_values, new_values
    ) VALUES (
      OLD.id, auth.uid(), (auth.jwt()->>'user_role')::TEXT, 'DELETE', TG_TABLE_NAME, OLD.id,
      to_jsonb(OLD), NULL
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_trail (
      tenant_id, actor_id, actor_role, action, table_name, record_id, old_values, new_values
    ) VALUES (
      NEW.id, auth.uid(), (auth.jwt()->>'user_role')::TEXT, 'INSERT', TG_TABLE_NAME, NEW.id,
      NULL, to_jsonb(NEW)
    );
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$\$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_audit_tenants ON master_tenants;
CREATE TRIGGER tr_audit_tenants
AFTER INSERT OR UPDATE OR DELETE ON master_tenants
FOR EACH ROW EXECUTE FUNCTION fn_audit_tenants_changes();
