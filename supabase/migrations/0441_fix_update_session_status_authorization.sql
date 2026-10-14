-- ============================================================
-- Migration 044: Fix update_session_status authorization
-- Purpose: derive caller identity/tenant/role from auth.uid()
--          while preserving the existing RPC signature.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_session_status(
  p_session_id UUID,
  p_new_status TEXT,
  p_user_id UUID,
  p_user_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status TEXT;
  v_session_tenant_id UUID;
  v_caller_tenant_id UUID;
  v_caller_role TEXT;
BEGIN
  -- Legacy arguments remain for RPC compatibility; authorization is derived
  -- from the authenticated database caller instead of trusting client input.
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: caller identity mismatch';
  END IF;

  SELECT tenant_id, role::TEXT
    INTO v_caller_tenant_id, v_caller_role
  FROM clinic_users
  WHERE id = auth.uid()
    AND is_active = TRUE
    AND deleted_at IS NULL;

  IF v_caller_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: active clinic user required';
  END IF;

  SELECT session_status::TEXT, tenant_id
    INTO v_current_status, v_session_tenant_id
  FROM clinic_visit_sessions
  WHERE id = p_session_id
    AND deleted_at IS NULL;

  IF v_session_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF v_caller_role <> 'super_admin' AND v_session_tenant_id <> v_caller_tenant_id THEN
    RAISE EXCEPTION 'Unauthorized: cross-tenant access denied';
  END IF;

  IF v_current_status = 'completed' AND p_new_status <> 'completed' THEN
    RAISE EXCEPTION 'Cannot modify completed session';
  END IF;

  IF v_caller_role = 'doctor' AND NOT EXISTS (
    SELECT 1
    FROM clinic_visit_sessions
    WHERE id = p_session_id
      AND (doctor_id = auth.uid() OR primary_doctor_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not your session';
  END IF;

  UPDATE clinic_visit_sessions
  SET session_status = p_new_status::TEXT,
      updated_at = NOW()
  WHERE id = p_session_id
    AND (v_caller_role = 'super_admin' OR tenant_id = v_caller_tenant_id);

  RETURN FOUND;
END;
$$;
