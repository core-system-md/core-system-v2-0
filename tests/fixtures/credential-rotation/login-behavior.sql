-- Behavioural check against the isolated pgcrypto-generated $2a$ hash and
-- minimal hashed-PIN stubs. No credential values are emitted.
DO $login_contract$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM public.rotation_rehearsal_state
  WHERE singleton = TRUE;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Login contract fixture tenant is missing.';
  END IF;

  IF NOT public.create_pin_session(v_tenant_id, 'synthetic prior staff secret A') THEN
    RAISE EXCEPTION 'Correct synthetic PIN failed the pin-only login stub.';
  END IF;

  IF public.create_pin_session(v_tenant_id, 'synthetic incorrect login probe') THEN
    RAISE EXCEPTION 'Incorrect synthetic PIN unexpectedly passed the pin-only login stub.';
  END IF;

  IF NOT public.create_pin_session(v_tenant_id, 'REHEARSAL-A', 'synthetic prior staff secret A') THEN
    RAISE EXCEPTION 'Correct synthetic PIN failed the employee-code login stub.';
  END IF;

  IF public.create_pin_session(v_tenant_id, 'REHEARSAL-A', 'synthetic incorrect login probe') THEN
    RAISE EXCEPTION 'Incorrect synthetic PIN unexpectedly passed the employee-code login stub.';
  END IF;
END;
$login_contract$;
