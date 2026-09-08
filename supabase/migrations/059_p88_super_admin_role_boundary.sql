-- P88: prevent clinic admins from assigning or changing super_admin roles.
-- Keeps super_admin role changes exclusively under super_admin authority.

BEGIN;

CREATE OR REPLACE FUNCTION public.prevent_protected_clinic_user_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_role text := public.get_current_user_role();
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
     OR NEW.role IS DISTINCT FROM OLD.role THEN
    IF v_role NOT IN ('clinic_admin', 'super_admin') THEN
      RAISE EXCEPTION 'Unauthorized: staff role or tenant cannot be changed';
    END IF;

    IF (OLD.role = 'super_admin' OR NEW.role = 'super_admin')
       AND v_role <> 'super_admin' THEN
      RAISE EXCEPTION 'Unauthorized: only super_admin can assign or change a super_admin role';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role
       AND OLD.id = auth.uid()
       AND v_role <> 'super_admin' THEN
      RAISE EXCEPTION 'Unauthorized: cannot change your own role';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

COMMIT;
