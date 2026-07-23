-- 036_audit_function_fix.sql
-- Fix fn_audit_sensitive_changes column names to match actual audit_trail schema
-- Migration 021 used actor_id/actor_role/table_name/record_id
-- Actual columns: user_id/actor_type/entity_type/entity_id

CREATE OR REPLACE FUNCTION fn_audit_sensitive_changes()
RETURNS TRIGGER AS $$$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_trail (
      tenant_id, user_id, actor_type,
      action, entity_type, entity_id,
      old_values, new_values
    ) VALUES (
      COALESCE(NEW.tenant_id, OLD.tenant_id),
      auth.uid(),
      (auth.jwt()->>'user_role')::TEXT,
      'UPDATE', TG_TABLE_NAME, OLD.id,
      to_jsonb(OLD), to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$$$ LANGUAGE plpgsql SECURITY DEFINER;
