-- CORE SYSTEM v2.1 — P142 Staff Role Update RPC
-- Evidence-backed narrow contract: role changes from Staff Management must not use
-- direct client UPDATE. Existing P86/P88 trigger and RLS remain authoritative.

CREATE OR REPLACE FUNCTION public.update_clinic_user_role(
  p_user_id uuid,
  p_role text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role text;
  target_tenant_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  IF p_role NOT IN ('super_admin', 'clinic_admin', 'doctor', 'receptionist') THEN
    RAISE EXCEPTION 'INVALID_ROLE';
  END IF;

  SELECT role
    INTO caller_role
  FROM public.clinic_users
  WHERE id = auth.uid()
    AND deleted_at IS NULL
    AND is_active = true;

  IF caller_role IS NULL OR caller_role NOT IN ('clinic_admin', 'super_admin') THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'SELF_ROLE_CHANGE_FORBIDDEN';
  END IF;

  SELECT tenant_id
    INTO target_tenant_id
  FROM public.clinic_users
  WHERE id = p_user_id
    AND deleted_at IS NULL;

  IF target_tenant_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  IF target_tenant_id <> (SELECT tenant_id FROM public.clinic_users WHERE id = auth.uid() AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'TENANT_MISMATCH';
  END IF;

  IF caller_role <> 'super_admin' AND p_role = 'super_admin' THEN
    RAISE EXCEPTION 'SUPER_ADMIN_ROLE_FORBIDDEN';
  END IF;

  UPDATE public.clinic_users
  SET role = p_role,
      updated_at = NOW()
  WHERE id = p_user_id
    AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.update_clinic_user_role(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_clinic_user_role(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_clinic_user_role(uuid, text) TO authenticated;
