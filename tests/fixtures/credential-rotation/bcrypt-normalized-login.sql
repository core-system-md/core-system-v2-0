-- Runtime-only compatibility probe for a real external bcrypt hash normalized to $2a$.
-- The runner supplies a random synthetic PIN, a different wrong PIN, and the hash.
-- This transaction rolls back the temporary user hash update after exercising the login stub.
BEGIN;

DO $normalized_hash_probe$
DECLARE
  v_pin TEXT := '__RUNTIME_SYNTHETIC_PIN__';
  v_wrong_pin TEXT := '__RUNTIME_WRONG_PIN__';
  v_hash TEXT := '__RUNTIME_BCRYPT_2A_HASH__';
  v_tenant_id UUID;
BEGIN
  IF v_hash !~ '^\$2a\$[0-9]{2}\$[./A-Za-z0-9]{53}$' THEN
    RAISE EXCEPTION 'Normalized hash is not in the accepted $2a$ format.';
  END IF;

  IF extensions.crypt(v_pin, v_hash) IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'The normalized hash did not verify the correct synthetic PIN.';
  END IF;

  IF extensions.crypt(v_wrong_pin, v_hash) IS NOT DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'The normalized hash incorrectly accepted the wrong synthetic PIN.';
  END IF;

  SELECT tenant_id INTO v_tenant_id
  FROM public.rotation_rehearsal_state
  WHERE singleton = TRUE;

  UPDATE public.clinic_users
  SET pin_hash = v_hash
  WHERE tenant_id = v_tenant_id
    AND employee_code = 'REHEARSAL-A';

  IF NOT public.create_pin_session(v_tenant_id, 'REHEARSAL-A', v_pin) THEN
    RAISE EXCEPTION 'Normalized external hash failed correct-PIN login via the stub.';
  END IF;

  IF public.create_pin_session(v_tenant_id, 'REHEARSAL-A', v_wrong_pin) THEN
    RAISE EXCEPTION 'Normalized external hash accepted the wrong PIN via the stub.';
  END IF;
END;
$normalized_hash_probe$;

ROLLBACK;
