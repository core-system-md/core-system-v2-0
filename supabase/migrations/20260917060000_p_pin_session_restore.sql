-- P-PinSessionRestore: Restore an active PIN session after browser reload.
--
-- Evidence:
-- - PIN authentication intentionally uses pin_sessions/sessionStorage, not Supabase Auth.
-- - AuthProvider currently rehydrates persisted user state but does not validate the
--   PIN bearer token after reload, so protected routes redirect to /login.
-- - Existing PIN-session RPCs already validate token_hash, tenant_id, deleted_at,
--   and expiry against clinic_users.
--
-- Return only the authenticated staff identity needed by the client state machine.
-- The bearer token itself remains client-held and is never returned by this RPC.

CREATE OR REPLACE FUNCTION public.restore_pin_session(
  p_tenant_id UUID,
  p_session_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user public.clinic_users%ROWTYPE;
BEGIN
  IF p_tenant_id IS NULL OR p_session_token IS NULL OR length(p_session_token) < 32 THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_PARAMETERS');
  END IF;

  SELECT cu.*
    INTO v_user
  FROM public.pin_sessions ps
  JOIN public.clinic_users cu
    ON cu.id = ps.staff_id
   AND cu.tenant_id = ps.tenant_id
  WHERE ps.tenant_id = p_tenant_id
    AND ps.token_hash = extensions.digest(p_session_token, 'sha256')
    AND ps.deleted_at IS NULL
    AND ps.expires_at > NOW()
    AND cu.is_active = true
    AND cu.deleted_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_OR_EXPIRED_PIN_SESSION');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user.id,
    'full_name', v_user.full_name,
    'full_name_ar', v_user.full_name_ar,
    'role', v_user.role,
    'tenant_id', v_user.tenant_id,
    'employee_code', v_user.employee_code,
    'email', v_user.email,
    'phone', v_user.phone,
    'specialization', v_user.specialization
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restore_pin_session(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_pin_session(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.restore_pin_session(UUID, TEXT) TO authenticated;