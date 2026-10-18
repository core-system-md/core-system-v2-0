-- Disposable PostgreSQL fixture for FIX-002 and the credential-rotation rehearsal.
-- The two create_pin_session definitions are installed by the real forward migration;
-- this file intentionally defines no login-function stubs.
DO $roles$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END
$roles$;

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid LANGUAGE sql STABLE SET search_path = ''
AS $auth_uid$
  SELECT NULLIF(pg_catalog.current_setting('request.jwt.claim.sub', true), '')::uuid
$auth_uid$;

CREATE TABLE public.master_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE public.clinic_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.master_tenants(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  employee_code TEXT NOT NULL,
  pin_code TEXT NULL,
  full_name_ar TEXT,
  specialization TEXT,
  phone TEXT,
  password TEXT,
  deleted_at TIMESTAMPTZ,
  pin_hash TEXT,
  UNIQUE (tenant_id, employee_code)
);

CREATE TABLE public.pin_attempt_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.master_tenants(id),
  staff_id UUID NULL REFERENCES public.clinic_users(id),
  attempted_pin VARCHAR(4) NOT NULL,
  success BOOLEAN,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.pin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.master_tenants(id),
  staff_id UUID NOT NULL REFERENCES public.clinic_users(id),
  token_hash BYTEA NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ NULL
);

-- Only runtime-generated synthetic values and hashes are stored here.
-- The state table is not granted to anon/authenticated and no values are emitted.
CREATE TABLE public.rotation_rehearsal_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  tenant_id UUID NOT NULL,
  original_license_key TEXT NOT NULL,
  staged_license_key TEXT NOT NULL,
  synthetic_pin_a TEXT NOT NULL,
  synthetic_pin_b TEXT NOT NULL,
  original_hash_a TEXT NOT NULL,
  original_hash_b TEXT NOT NULL,
  staged_hash_a TEXT NOT NULL,
  staged_hash_b TEXT NOT NULL
);

ALTER TABLE public.master_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_attempt_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_rehearsal_state ENABLE ROW LEVEL SECURITY;

-- This stub models the existing rate-limit entry point only. It deliberately does
-- not redesign rate limiting (FIX-004); the real login functions still call it.
CREATE OR REPLACE FUNCTION public.check_pin_rate_limit(p_tenant_id uuid, p_ip_address text DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $rate_limit$
  SELECT true
$rate_limit$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $get_role$
  SELECT u.role FROM public.clinic_users u WHERE u.id = auth.uid() LIMIT 1
$get_role$;

CREATE OR REPLACE FUNCTION public.prevent_protected_clinic_user_changes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $protect_identity$
DECLARE v_role text := public.get_current_user_role();
BEGIN
  IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id OR NEW.role IS DISTINCT FROM OLD.role THEN
    IF v_role NOT IN ('clinic_admin','super_admin') THEN
      RAISE EXCEPTION 'Unauthorized: staff role or tenant cannot be changed';
    END IF;
    IF (OLD.role='super_admin' OR NEW.role='super_admin') AND v_role <> 'super_admin' THEN
      RAISE EXCEPTION 'Unauthorized: only super_admin can assign or change a super_admin role';
    END IF;
    IF NEW.role IS DISTINCT FROM OLD.role AND OLD.id=auth.uid() AND v_role <> 'super_admin' THEN
      RAISE EXCEPTION 'Unauthorized: cannot change your own role';
    END IF;
  END IF;
  RETURN NEW;
END;
$protect_identity$;

CREATE TRIGGER trg_protect_clinic_user_identity
BEFORE UPDATE ON public.clinic_users
FOR EACH ROW EXECUTE FUNCTION public.prevent_protected_clinic_user_changes();

CREATE OR REPLACE FUNCTION public.update_clinic_user_role(p_user_id uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $role_update$
DECLARE caller_role text; caller_tenant_id uuid; target_tenant_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF p_role NOT IN ('super_admin','clinic_admin','doctor','receptionist') THEN RAISE EXCEPTION 'INVALID_ROLE'; END IF;
  SELECT role,tenant_id INTO caller_role,caller_tenant_id FROM public.clinic_users
    WHERE id=auth.uid() AND deleted_at IS NULL AND is_active=true;
  IF caller_role IS NULL OR caller_role NOT IN ('clinic_admin','super_admin') THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_user_id=auth.uid() THEN RAISE EXCEPTION 'SELF_ROLE_CHANGE_FORBIDDEN'; END IF;
  SELECT tenant_id INTO target_tenant_id FROM public.clinic_users WHERE id=p_user_id AND deleted_at IS NULL;
  IF target_tenant_id IS NULL THEN RAISE EXCEPTION 'USER_NOT_FOUND'; END IF;
  IF target_tenant_id<>caller_tenant_id THEN RAISE EXCEPTION 'TENANT_MISMATCH'; END IF;
  IF caller_role<>'super_admin' AND p_role='super_admin' THEN RAISE EXCEPTION 'SUPER_ADMIN_ROLE_FORBIDDEN'; END IF;
  UPDATE public.clinic_users SET role=p_role,updated_at=NOW() WHERE id=p_user_id AND deleted_at IS NULL;
END;
$role_update$;

CREATE POLICY clinic_users_select_tenant ON public.clinic_users
  FOR SELECT TO authenticated
  USING (tenant_id = NULLIF(current_setting('test.tenant_id', true), '')::uuid);
CREATE POLICY rls_users_insert_admin ON public.clinic_users
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = NULLIF(current_setting('test.tenant_id', true), '')::uuid
    AND public.get_current_user_role() IN ('clinic_admin','super_admin')
  );
CREATE POLICY rls_users_update_admin ON public.clinic_users
  FOR UPDATE TO authenticated
  USING (
    tenant_id = NULLIF(current_setting('test.tenant_id', true), '')::uuid
    AND public.get_current_user_role() IN ('clinic_admin','super_admin')
  )
  WITH CHECK (
    tenant_id = NULLIF(current_setting('test.tenant_id', true), '')::uuid
    AND public.get_current_user_role() IN ('clinic_admin','super_admin')
  );

-- Emulate the broad pre-FIX-002 table grants observed in the read-only production audit.
GRANT ALL PRIVILEGES ON TABLE public.clinic_users TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_clinic_user_role(uuid,text) TO authenticated, service_role;

DO $bcrypt_probe$
DECLARE v_sample text := encode(extensions.gen_random_bytes(8),'hex'); v_hash text;
BEGIN
  v_hash := extensions.crypt(v_sample,extensions.gen_salt('bf',12));
  IF v_hash !~ '^\$2a\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$'
     OR extensions.crypt(v_sample,v_hash) IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'pgcrypto $2a$ generation/verification fixture failed.';
  END IF;
END;
$bcrypt_probe$;

WITH raw AS (
  SELECT
    gen_random_uuid() AS tenant_id,
    'initial-' || encode(extensions.gen_random_bytes(24),'hex') AS original_license_key,
    'rotated-' || encode(extensions.gen_random_bytes(24),'hex') AS staged_license_key,
    lpad((floor(random()*10000)::int)::text,4,'0') AS pin_a,
    lpad((floor(random()*10000)::int)::text,4,'0') AS pin_b0
),
pins AS (
  SELECT *, CASE WHEN pin_b0=pin_a
    THEN lpad(((pin_a::integer+1)%10000)::text,4,'0') ELSE pin_b0 END AS pin_b
  FROM raw
),
hashed AS (
  SELECT *,
    extensions.crypt(pin_a,extensions.gen_salt('bf',12)) AS hash_a,
    extensions.crypt(pin_b,extensions.gen_salt('bf',12)) AS hash_b,
    extensions.crypt(lpad((100000+floor(random()*900000)::int)::text,6,'0'),extensions.gen_salt('bf',12)) AS staged_a,
    extensions.crypt(lpad((100000+floor(random()*900000)::int)::text,6,'0'),extensions.gen_salt('bf',12)) AS staged_b
  FROM pins
)
INSERT INTO public.rotation_rehearsal_state(
  singleton,tenant_id,original_license_key,staged_license_key,
  synthetic_pin_a,synthetic_pin_b,original_hash_a,original_hash_b,staged_hash_a,staged_hash_b
)
SELECT TRUE,tenant_id,original_license_key,staged_license_key,pin_a,pin_b,hash_a,hash_b,staged_a,staged_b FROM hashed;

INSERT INTO public.master_tenants(id,license_key,is_active)
SELECT tenant_id,original_license_key,true FROM public.rotation_rehearsal_state;

INSERT INTO public.clinic_users(
  id,tenant_id,email,full_name,full_name_ar,role,employee_code,pin_code,pin_hash,is_active
)
SELECT gen_random_uuid(),s.tenant_id,'rehearsal-a@invalid','Rehearsal A','فحص A','clinic_admin',
       'REHEARSAL-A',s.synthetic_pin_a,s.original_hash_a,true
FROM public.rotation_rehearsal_state s
UNION ALL
SELECT gen_random_uuid(),s.tenant_id,'rehearsal-b@invalid','Rehearsal B','فحص B','receptionist',
       'REHEARSAL-B',s.synthetic_pin_b,'not-a-bcrypt-hash',true
FROM public.rotation_rehearsal_state s;

INSERT INTO public.pin_sessions(tenant_id,staff_id,token_hash,expires_at)
SELECT u.tenant_id,u.id,extensions.digest(extensions.gen_random_bytes(32),'sha256'),NOW()+INTERVAL '8 hours'
FROM public.clinic_users u WHERE u.employee_code IN ('REHEARSAL-A','REHEARSAL-B');
