-- P0 security alignment: JWT authorization claims must come from app_metadata.
-- Backfill existing clinic staff, then make tenant/role helpers read server-managed claims.

-- Evidence-backed compatibility repair:
-- migration 002 creates clinic_users without deleted_at, while the canonical
-- Blueprint and later repository migrations already require deleted_at for
-- soft-delete filtering. Add the canonical column before it is referenced below.
ALTER TABLE public.clinic_users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Evidence-backed compatibility repair:
-- the canonical Blueprint and active auth/session code require employee_code,
-- but migration 002 does not create it. Keep it nullable here because older
-- rows can predate the employee-code contract; later application flows can
-- populate it without making this historical migration destructive.
ALTER TABLE public.clinic_users
  ADD COLUMN IF NOT EXISTS employee_code TEXT;

UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'tenant_id', cu.tenant_id::text,
  'user_role', cu.role,
  'full_name', cu.full_name,
  'employee_code', cu.employee_code
)
FROM public.clinic_users cu
WHERE cu.id = u.id
  AND cu.deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN NULLIF(auth.jwt()->'app_metadata'->>'tenant_id', '')::UUID;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN NULLIF(auth.jwt()->'app_metadata'->>'user_role', '');
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$;
