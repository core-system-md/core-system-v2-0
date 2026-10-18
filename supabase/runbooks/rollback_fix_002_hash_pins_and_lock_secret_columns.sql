-- MANUAL ROLLBACK FOR MDCORE-FIX-002 — NEVER AUTO-RUN.
-- This intentionally restores the pre-FIX-002 production function bodies and
-- client SELECT grants, including unsafe plaintext PIN comparisons and logging.
-- It therefore reopens the original credential exposure. Run only in an isolated
-- rehearsal unless the owner gives explicit written approval for this exact rollback.
-- The rollback does not NULL/drop pin_code, drop password, purge history, or change
-- Supabase Auth. It intentionally leaves pin_code nullable: Production was nullable,
-- and re-applying NOT NULL could fail or conflict with hash-only rows.
BEGIN;

CREATE OR REPLACE FUNCTION public.create_pin_session(p_tenant_id uuid, p_pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_user public.clinic_users%ROWTYPE; v_token TEXT;
BEGIN
  IF p_tenant_id IS NULL OR p_pin IS NULL OR length(p_pin) <> 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'MISSING_PARAMETERS');
  END IF;
  IF NOT public.check_pin_rate_limit(p_tenant_id) THEN
    INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, NULL, p_pin, false, NULL);
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Too many PIN attempts. Try again later.';
  END IF;
  SELECT * INTO v_user FROM public.clinic_users
  WHERE tenant_id = p_tenant_id AND pin_code = p_pin
    AND is_active = true AND deleted_at IS NULL
  ORDER BY created_at ASC, id ASC LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
    VALUES (p_tenant_id, NULL, p_pin, false, NULL);
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CREDENTIALS');
  END IF;
  INSERT INTO public.pin_attempt_log (tenant_id, staff_id, attempted_pin, success, ip_address)
  VALUES (p_tenant_id, v_user.id, p_pin, true, NULL);
  v_token := pg_catalog.encode(extensions.gen_random_bytes(32), 'hex');
  UPDATE public.pin_sessions SET deleted_at = pg_catalog.now()
  WHERE staff_id = v_user.id AND tenant_id = p_tenant_id;
  INSERT INTO public.pin_sessions (tenant_id, staff_id, token_hash, expires_at)
  VALUES (p_tenant_id, v_user.id, extensions.digest(v_token, 'sha256'), pg_catalog.now() + INTERVAL '8 hours');
  UPDATE public.clinic_users SET last_login_at = pg_catalog.now() WHERE id = v_user.id;
  RETURN jsonb_build_object(
    'success', true, 'session_token', v_token, 'user_id', v_user.id,
    'full_name', v_user.full_name, 'full_name_ar', v_user.full_name_ar,
    'role', v_user.role, 'tenant_id', v_user.tenant_id,
    'employee_code', v_user.employee_code, 'email', v_user.email,
    'phone', v_user.phone, 'specialization', v_user.specialization
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_pin_session(p_tenant_id uuid, p_employee_code text, p_pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE v_user public.clinic_users%ROWTYPE; v_token TEXT;
BEGIN
  IF p_tenant_id IS NULL OR p_employee_code IS NULL OR p_pin IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','MISSING_PARAMETERS');
  END IF;
  IF NOT public.check_pin_rate_limit(p_tenant_id) THEN
    INSERT INTO public.pin_attempt_log(tenant_id,staff_id,attempted_pin,success,ip_address)
    VALUES(p_tenant_id,NULL,p_pin,false,NULL);
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Too many PIN attempts. Try again later.';
  END IF;
  SELECT * INTO v_user FROM public.clinic_users
  WHERE tenant_id=p_tenant_id AND employee_code=p_employee_code
    AND pin_code=p_pin AND is_active=true AND deleted_at IS NULL LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.pin_attempt_log(tenant_id,staff_id,attempted_pin,success,ip_address)
    VALUES(p_tenant_id,NULL,p_pin,false,NULL);
    RETURN jsonb_build_object('success',false,'error','INVALID_CREDENTIALS');
  END IF;
  INSERT INTO public.pin_attempt_log(tenant_id,staff_id,attempted_pin,success,ip_address)
  VALUES(p_tenant_id,v_user.id,p_pin,true,NULL);
  v_token := pg_catalog.encode(extensions.gen_random_bytes(32),'hex');
  UPDATE public.pin_sessions SET deleted_at=pg_catalog.now()
  WHERE staff_id=v_user.id AND tenant_id=p_tenant_id;
  INSERT INTO public.pin_sessions(tenant_id,staff_id,token_hash,expires_at)
  VALUES(p_tenant_id,v_user.id,extensions.digest(v_token,'sha256'),pg_catalog.now()+INTERVAL '8 hours');
  UPDATE public.clinic_users SET last_login_at=pg_catalog.now() WHERE id=v_user.id;
  RETURN jsonb_build_object(
    'success',true,'session_token',v_token,'user_id',v_user.id,'full_name',v_user.full_name,
    'full_name_ar',v_user.full_name_ar,'role',v_user.role,'tenant_id',v_user.tenant_id,
    'employee_code',v_user.employee_code,'email',v_user.email,'phone',v_user.phone,
    'specialization',v_user.specialization
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_pin(p_tenant_id uuid,p_pin text)
RETURNS SETOF public.clinic_users LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_match_count int;
BEGIN
  IF NOT check_pin_rate_limit(p_tenant_id) THEN
    INSERT INTO pin_attempt_log(tenant_id,staff_id,attempted_pin,success,ip_address)
    VALUES(p_tenant_id,auth.uid(),p_pin,false,NULL);
    RAISE EXCEPTION 'RATE_LIMIT_EXCEEDED: Too many PIN attempts. Try again later.';
  END IF;
  SELECT count(*) INTO v_match_count FROM clinic_users
  WHERE tenant_id=p_tenant_id AND pin_code=p_pin AND is_active=true AND deleted_at IS NULL;
  INSERT INTO pin_attempt_log(tenant_id,staff_id,attempted_pin,success,ip_address)
  VALUES(p_tenant_id,auth.uid(),p_pin,v_match_count>0,NULL);
  RETURN QUERY SELECT * FROM clinic_users
  WHERE tenant_id=p_tenant_id AND pin_code=p_pin AND is_active=true AND deleted_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_pin(params jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_id UUID := (params->>'p_tenant_id')::UUID;
  v_pin TEXT := params->>'p_pin';
  v_role TEXT := params->>'p_role';
  v_user RECORD;
BEGIN
  IF v_tenant_id IS NULL OR v_pin IS NULL OR v_role IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','MISSING_PARAMETERS','message','tenant_id, pin, and role are required');
  END IF;
  SELECT id,full_name,role,pin_code,employee_code,is_active INTO v_user
  FROM clinic_users
  WHERE tenant_id=v_tenant_id AND pin_code=v_pin AND role=v_role
    AND deleted_at IS NULL AND is_active=true;
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success',false,'error','INVALID_CREDENTIALS','message','Invalid PIN or role for this clinic');
  END IF;
  UPDATE clinic_users SET last_login_at=NOW() WHERE id=v_user.id;
  RETURN jsonb_build_object('success',true,'user_id',v_user.id,'full_name',v_user.full_name,'role',v_user.role,'employee_code',v_user.employee_code);
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_pin_hash(p_tenant_id uuid,p_role text,p_pin text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_failed_attempts INTEGER; v_user_record RECORD; v_success BOOLEAN:=false; v_user_id UUID:=null; v_reason TEXT:=null;
BEGIN
  SELECT COUNT(*) INTO v_failed_attempts FROM pin_attempt_log
  WHERE tenant_id=p_tenant_id AND success=false AND created_at>NOW()-INTERVAL '15 minutes';
  IF v_failed_attempts>=5 THEN
    INSERT INTO pin_attempt_log(tenant_id,attempted_pin,success) VALUES(p_tenant_id,'RATE_LIMITED',false);
    RETURN jsonb_build_object('success',false,'user_id',null,'reason','RATE_LIMITED');
  END IF;
  SELECT id,pin_hash INTO v_user_record FROM clinic_users
  WHERE tenant_id=p_tenant_id AND role=p_role AND is_active=true AND deleted_at IS NULL LIMIT 1;
  IF v_user_record IS NULL THEN
    INSERT INTO pin_attempt_log(tenant_id,attempted_pin,success) VALUES(p_tenant_id,'NO_USER_FOUND',false);
    RETURN jsonb_build_object('success',false,'user_id',null,'reason','INVALID_CREDENTIALS');
  END IF;
  IF crypt(p_pin,v_user_record.pin_hash)=v_user_record.pin_hash THEN
    v_success:=true; v_user_id:=v_user_record.id; v_reason:='SUCCESS';
  ELSE v_reason:='INVALID_CREDENTIALS'; END IF;
  INSERT INTO pin_attempt_log(tenant_id,attempted_pin,success) VALUES(p_tenant_id,p_pin,v_success);
  RETURN jsonb_build_object('success',v_success,'user_id',v_user_id,'reason',v_reason);
END;
$function$;

CREATE OR REPLACE FUNCTION public.verify_pin_hash(p_tenant_id uuid,p_pin text)
RETURNS SETOF public.clinic_users LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY SELECT * FROM clinic_users
  WHERE tenant_id=p_tenant_id AND pin_hash=crypt(p_pin,pin_hash)
    AND is_active=true AND deleted_at IS NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.hash_pin(p_pin text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  RETURN crypt(p_pin,gen_salt('bf'));
END;
$function$;

GRANT SELECT ON TABLE public.clinic_users TO anon, authenticated;
GRANT SELECT (pin_code, pin_hash, password) ON TABLE public.clinic_users TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.create_pin_session(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_pin_session(uuid,text) TO anon,authenticated,service_role;
REVOKE EXECUTE ON FUNCTION public.create_pin_session(uuid,text,text) FROM PUBLIC,authenticated;
GRANT EXECUTE ON FUNCTION public.create_pin_session(uuid,text,text) TO anon,service_role;

REVOKE EXECUTE ON FUNCTION public.validate_pin(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_pin(uuid,text) TO anon,authenticated,service_role;
REVOKE EXECUTE ON FUNCTION public.validate_pin(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.validate_pin(jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pin_hash(uuid,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.verify_pin_hash(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.verify_pin_hash(uuid,text,text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.hash_pin(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.hash_pin(text) TO service_role;

COMMIT;
