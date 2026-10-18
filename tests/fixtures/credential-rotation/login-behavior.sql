-- Real FIX-002 function behavior against the isolated database after migration.
-- PINs are generated at fixture runtime and never emitted.
BEGIN;

DO $login_contract$
DECLARE
  v_state public.rotation_rehearsal_state%ROWTYPE;
  v_wrong_a text;
  v_wrong_b text;
  v_result jsonb;
  v_hash text;
  v_expected_keys text[] := ARRAY[
    'success','session_token','user_id','full_name','full_name_ar','role',
    'tenant_id','employee_code','email','phone','specialization'
  ];
  v_actual_keys text[];
BEGIN
  SELECT * INTO v_state FROM public.rotation_rehearsal_state WHERE singleton=true;
  IF v_state.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Login contract fixture tenant is missing.';
  END IF;

  -- Row B began with a non-bcrypt placeholder. FIX-002 must backfill it from
  -- the retained fixture PIN before this pre-rotation login probe.
  SELECT pin_hash INTO v_hash FROM public.clinic_users
  WHERE tenant_id=v_state.tenant_id AND employee_code='REHEARSAL-B';
  IF v_hash !~ '^\$2a\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$'
     OR extensions.crypt(v_state.synthetic_pin_b,v_hash) IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'Backfilled legacy test-user hash failed verification.';
  END IF;

  v_wrong_a := lpad(((v_state.synthetic_pin_a::integer+1)%10000)::text,4,'0');
  v_wrong_b := lpad(((v_state.synthetic_pin_b::integer+1)%10000)::text,4,'0');

  v_result := public.create_pin_session(v_state.tenant_id,v_state.synthetic_pin_a);
  IF v_result->>'success' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Correct synthetic PIN failed in pin-only create_pin_session.';
  END IF;
  SELECT array_agg(k ORDER BY k) INTO v_actual_keys FROM jsonb_object_keys(v_result) k;
  IF v_actual_keys IS DISTINCT FROM (SELECT array_agg(k ORDER BY k) FROM unnest(v_expected_keys) k) THEN
    RAISE EXCEPTION 'pin-only create_pin_session JSON return shape changed.';
  END IF;
  IF length(v_result->>'session_token') <> 64
     OR v_result ? 'pin_code' OR v_result ? 'pin_hash' OR v_result ? 'password' THEN
    RAISE EXCEPTION 'pin-only create_pin_session returned an invalid token shape or secret field.';
  END IF;

  v_result := public.create_pin_session(v_state.tenant_id,v_wrong_a);
  IF v_result->>'success' IS DISTINCT FROM 'false' OR v_result->>'error' IS DISTINCT FROM 'INVALID_CREDENTIALS' THEN
    RAISE EXCEPTION 'Wrong synthetic PIN was not rejected by pin-only create_pin_session.';
  END IF;

  v_result := public.create_pin_session(v_state.tenant_id,'REHEARSAL-B',v_state.synthetic_pin_b);
  IF v_result->>'success' IS DISTINCT FROM 'true' OR v_result->>'employee_code' IS DISTINCT FROM 'REHEARSAL-B' THEN
    RAISE EXCEPTION 'Correct synthetic PIN failed in employee-code create_pin_session.';
  END IF;
  SELECT array_agg(k ORDER BY k) INTO v_actual_keys FROM jsonb_object_keys(v_result) k;
  IF v_actual_keys IS DISTINCT FROM (SELECT array_agg(k ORDER BY k) FROM unnest(v_expected_keys) k) THEN
    RAISE EXCEPTION 'employee-code create_pin_session JSON return shape changed.';
  END IF;

  v_result := public.create_pin_session(v_state.tenant_id,'REHEARSAL-B',v_wrong_b);
  IF v_result->>'success' IS DISTINCT FROM 'false' OR v_result->>'error' IS DISTINCT FROM 'INVALID_CREDENTIALS' THEN
    RAISE EXCEPTION 'Wrong synthetic PIN was not rejected by employee-code create_pin_session.';
  END IF;

  IF pg_get_functiondef('public.create_pin_session(uuid,text)'::regprocedure) ILIKE '%pin_code%'
     OR pg_get_functiondef('public.create_pin_session(uuid,text,text)'::regprocedure) ILIKE '%pin_code%' THEN
    RAISE EXCEPTION 'A create_pin_session definition still mentions pin_code.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.pin_attempt_log WHERE attempted_pin IS DISTINCT FROM '****') THEN
    RAISE EXCEPTION 'PIN attempt log does not contain the required redaction marker.';
  END IF;
  IF (SELECT count(*) FROM public.pin_attempt_log WHERE tenant_id=v_state.tenant_id) <> 4 THEN
    RAISE EXCEPTION 'Expected four logged PIN attempts with values redacted.';
  END IF;
END;
$login_contract$;

-- Login/session/log effects are observed above but must not alter the rotation baseline.
ROLLBACK;
