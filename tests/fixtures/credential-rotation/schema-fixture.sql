-- Minimal throwaway PostgreSQL fixture for credential-rotation rehearsal.
-- Creates only the tenant/user/session relations and hashed-contract RPC stubs needed
-- by the runbook. Use an EMPTY temporary database, never the production project.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.master_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ NULL
);

CREATE TABLE public.clinic_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.master_tenants(id),
  employee_code TEXT NOT NULL,
  pin_code TEXT NULL,
  pin_hash TEXT NULL,
  role TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, employee_code)
);

CREATE TABLE public.pin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.master_tenants(id),
  staff_id UUID NOT NULL REFERENCES public.clinic_users(id),
  token_hash BYTEA NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  deleted_at TIMESTAMPTZ NULL
);

-- Test-only state for assertions. All key material and hashes are generated in
-- the database during the run; no PIN or license literal is stored in source.
CREATE TABLE public.rotation_rehearsal_state (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (singleton),
  tenant_id UUID NOT NULL,
  original_license_key TEXT NOT NULL,
  staged_license_key TEXT NOT NULL,
  original_hash_a TEXT NOT NULL,
  original_hash_b TEXT NOT NULL,
  staged_hash_a TEXT NOT NULL,
  staged_hash_b TEXT NOT NULL
);

ALTER TABLE public.master_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinic_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rotation_rehearsal_state ENABLE ROW LEVEL SECURITY;

DO $bcrypt_probe$
DECLARE
  v_synthetic_sample TEXT := 'synthetic-only-hash-contract-probe';
  v_hash TEXT;
BEGIN
  -- Recommended hash producer for this rehearsal: pgcrypto bcrypt via crypt().
  v_hash := extensions.crypt(v_synthetic_sample, extensions.gen_salt('bf', 12));
  IF v_hash !~ '^\$22a\$[0-9]{2}\$[./A-Za-z0-9]{53}$' THEN
    RAISE EXCEPTION 'pgcrypto produced an unexpected bcrypt hash format.';
  END IF;
  IF extensions.crypt(v_synthetic_sample, v_hash) IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'pgcrypto crypt() did not verify its generated bcrypt hash.';
  END IF;
END;
$bcrypt_probe$;

INSERT INTO public.rotation_rehearsal_state (
  singleton, tenant_id, original_license_key, staged_license_key,
  original_hash_a, original_hash_b, staged_hash_a, staged_hash_b
)
SELECT
  TRUE,
  gen_random_uuid(),
  'initial-' || encode(extensions.gen_random_bytes(32), 'hex'),
  'rotated-' || encode(extensions.gen_random_bytes(32), 'hex'),
  extensions.crypt('synthetic prior staff secret A', extensions.gen_salt('bf', 8)),
  extensions.crypt('synthetic prior staff secret B', extensions.gen_salt('bf', 8)),
  extensions.crypt('synthetic rotated staff secret A', extensions.gen_salt('bf', 12)),
  extensions.crypt('synthetic rotated staff secret B', extensions.gen_salt('bf', 12));

INSERT INTO public.master_tenants (id, license_key, is_active)
SELECT tenant_id, original_license_key, TRUE
FROM public.rotation_rehearsal_state;

INSERT INTO public.clinic_users (tenant_id, employee_code, pin_code, pin_hash, role, is_active)
SELECT tenant_id, 'REHEARSAL-A', 'legacy-fixture-value-a', original_hash_a, 'doctor', TRUE
FROM public.rotation_rehearsal_state
UNION ALL
SELECT tenant_id, 'REHEARSAL-B', 'legacy-fixture-value-b', original_hash_b, 'receptionist', TRUE
FROM public.rotation_rehearsal_state;

INSERT INTO public.pin_sessions (tenant_id, staff_id, token_hash, expires_at)
SELECT u.tenant_id, u.id, extensions.digest(extensions.gen_random_bytes(32), 'sha256'), NOW() + INTERVAL '8 hours'
FROM public.clinic_users u;

CREATE OR REPLACE FUNCTION public.verify_pin_hash(p_tenant_id UUID, p_pin TEXT)
RETURNS SETOF public.clinic_users
LANGUAGE sql
STABLE
SET search_path = ''
AS $verify$
  SELECT u.*
  FROM public.clinic_users u
  WHERE u.tenant_id = p_tenant_id
    AND u.pin_hash = extensions.crypt(p_pin, u.pin_hash)
    AND u.is_active = TRUE
    AND u.deleted_at IS NULL
$verify$;

CREATE OR REPLACE FUNCTION public.create_pin_session(p_tenant_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $pin_only$
  SELECT EXISTS (
    SELECT 1 FROM public.verify_pin_hash(p_tenant_id, p_pin)
  )
$pin_only$;

CREATE OR REPLACE FUNCTION public.create_pin_session(p_tenant_id UUID, p_employee_code TEXT, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $employee_pin$
  SELECT EXISTS (
    SELECT 1
    FROM public.verify_pin_hash(p_tenant_id, p_pin) u
    WHERE u.employee_code = p_employee_code
  )
$employee_pin$;

CREATE OR REPLACE FUNCTION public.validate_license(p_license_key TEXT)
RETURNS SETOF public.master_tenants
LANGUAGE sql
STABLE
SET search_path = ''
AS $license$
  SELECT t.*
  FROM public.master_tenants t
  WHERE t.license_key = p_license_key
    AND t.is_active = TRUE
    AND t.deleted_at IS NULL
$license$;
