-- 036_audit_function_fix.sql
-- Align audit trigger payload fields with public.audit_trail.

CREATE OR REPLACE FUNCTION public.fn_audit_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $p140$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_trail (
      tenant_id, user_id, actor_type,
      action, entity_type, entity_id,
      old_values, new_values
    ) VALUES (
      COALESCE(NEW.tenant_id, OLD.tenant_id),
      auth.uid(),
      COALESCE((auth.jwt()->>'user_role')::TEXT, 'system'),
      'UPDATE', TG_TABLE_NAME, OLD.id,
      to_jsonb(OLD), to_jsonb(NEW)
    );
  END IF;
  RETURN NEW;
END;
$p140$;