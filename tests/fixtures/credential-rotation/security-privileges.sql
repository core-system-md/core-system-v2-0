-- PostgreSQL 16/17 isolated role/column security test.
-- All temporary staff rows and the role/claim mutations are rolled back at end.
BEGIN;

CREATE TEMP TABLE fix002_role_matrix (
  app_role text PRIMARY KEY,
  user_id uuid NOT NULL
) ON COMMIT DROP;

WITH roles AS (
  SELECT unnest(ARRAY['super_admin','clinic_admin','doctor','receptionist']) AS app_role
), inserted AS (
  INSERT INTO public.clinic_users(
    id,tenant_id,email,full_name,role,employee_code,is_active,pin_hash
  )
  SELECT
    extensions.gen_random_uuid(),
    s.tenant_id,
    'fix002-' || r.app_role || '@invalid',
    'FIX002 transient role test',
    r.app_role,
    'FIX002-ROLE-' || r.app_role,
    true,
    extensions.crypt(lpad((floor(random()*10000)::int)::text,4,'0'),extensions.gen_salt('bf',12))
  FROM roles r
  CROSS JOIN public.rotation_rehearsal_state s
  WHERE s.singleton=true
  RETURNING role, id
)
INSERT INTO pg_temp.fix002_role_matrix(app_role,user_id)
SELECT role,id FROM inserted;

GRANT SELECT ON TABLE pg_temp.fix002_role_matrix TO authenticated;

DO $fixture_context$
BEGIN
  PERFORM set_config('fix002.tenant_id',(SELECT tenant_id::text FROM public.rotation_rehearsal_state WHERE singleton),true);
END
$fixture_context$;

SET ROLE anon;
DO $anon_checks$
DECLARE v_column text;
BEGIN
  FOREACH v_column IN ARRAY ARRAY['pin_code','pin_hash','password'] LOOP
    BEGIN
      EXECUTE format('SELECT %I FROM public.clinic_users LIMIT 1',v_column);
      RAISE EXCEPTION 'anon unexpectedly read a clinic_users secret column';
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END LOOP;

  BEGIN
    PERFORM * FROM public.validate_pin(NULL::uuid,NULL::text);
    RAISE EXCEPTION 'anon unexpectedly executed validate_pin(uuid,text)';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
  BEGIN
    PERFORM public.validate_pin('{}'::jsonb);
    RAISE EXCEPTION 'anon unexpectedly executed validate_pin(jsonb)';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;

  BEGIN
    EXECUTE 'SELECT id, tenant_id, role FROM public.clinic_users LIMIT 1';
    RAISE EXCEPTION 'anon unexpectedly selected clinic_users without a verified anonymous flow';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$anon_checks$;
RESET ROLE;

-- Exercise the same column ACL for authenticated JWTs representing each app role.
-- Each loop iteration uses a real transient clinic_users row with that DB role.
SET ROLE authenticated;
DO $authenticated_checks$
DECLARE
  v_role text;
  v_tenant uuid := current_setting('fix002.tenant_id')::uuid;
  v_user uuid;
  v_admin uuid;
  v_doctor uuid;
  v_count bigint;
  v_column text;
BEGIN
  FOREACH v_role IN ARRAY ARRAY['super_admin','clinic_admin','doctor','receptionist'] LOOP
    SELECT user_id INTO v_user FROM pg_temp.fix002_role_matrix WHERE app_role=v_role;
    PERFORM set_config('test.tenant_id',v_tenant::text,true);
    PERFORM set_config('request.jwt.claim.sub',v_user::text,true);
    PERFORM set_config('request.jwt.claim.role','authenticated',true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object(
      'sub',v_user::text,'role','authenticated','user_role',v_role,'tenant_id',v_tenant::text
    )::text,true);

    SELECT count(*) INTO v_count FROM public.clinic_users
    WHERE tenant_id=v_tenant AND employee_code='REHEARSAL-A';
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'authenticated non-secret profile read failed for application role %',v_role;
    END IF;

    FOREACH v_column IN ARRAY ARRAY['pin_code','pin_hash','password'] LOOP
      BEGIN
        EXECUTE format('SELECT %I FROM public.clinic_users LIMIT 1',v_column);
        RAISE EXCEPTION 'authenticated role % unexpectedly read a clinic_users secret column',v_role;
      EXCEPTION WHEN insufficient_privilege THEN
        NULL;
      END;
    END LOOP;

    BEGIN
      PERFORM * FROM public.validate_pin(NULL::uuid,NULL::text);
      RAISE EXCEPTION 'authenticated role % unexpectedly executed validate_pin(uuid,text)',v_role;
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
    BEGIN
      PERFORM public.validate_pin('{}'::jsonb);
      RAISE EXCEPTION 'authenticated role % unexpectedly executed validate_pin(jsonb)',v_role;
    EXCEPTION WHEN insufficient_privilege THEN
      NULL;
    END;
  END LOOP;

  IF NOT has_table_privilege('authenticated','public.clinic_users','INSERT')
     OR NOT has_table_privilege('authenticated','public.clinic_users','UPDATE') THEN
    RAISE EXCEPTION 'FIX-002 unexpectedly removed existing staff write grants';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='clinic_users' AND policyname='rls_users_insert_admin')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policies WHERE schemaname='public' AND tablename='clinic_users' AND policyname='rls_users_update_admin') THEN
    RAISE EXCEPTION 'FIX-002 unexpectedly removed the existing staff write policies';
  END IF;

  SELECT user_id INTO v_admin FROM pg_temp.fix002_role_matrix WHERE app_role='clinic_admin';
  SELECT user_id INTO v_doctor FROM pg_temp.fix002_role_matrix WHERE app_role='receptionist';
  PERFORM set_config('request.jwt.claim.sub',v_admin::text,true);
  PERFORM set_config('request.jwt.claims',jsonb_build_object(
    'sub',v_admin::text,'role','authenticated','user_role','clinic_admin','tenant_id',v_tenant::text
  )::text,true);

  -- The client role must not need USAGE on extensions to perform an ordinary staff insert.
  -- Hash creation is owned by the trusted service-role path; NULL is safe for this rollback-only profile.
  INSERT INTO public.clinic_users(id,tenant_id,email,full_name,role,employee_code,is_active,pin_hash)
  VALUES (pg_catalog.gen_random_uuid(),v_tenant,'fix002-test@invalid','FIX002 rollback-only insert',
          'receptionist','FIX002-TRANSIENT',true,NULL);

  -- The SECURITY DEFINER role-update RPC and identity-protection trigger must remain usable.
  PERFORM public.update_clinic_user_role(v_doctor,'doctor');
END
$authenticated_checks$;
RESET ROLE;

ROLLBACK;
