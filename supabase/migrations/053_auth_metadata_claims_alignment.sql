-- P0 security alignment: JWT authorization claims must come from app_metadata.
-- Backfill existing clinic staff, then make tenant/role helpers read server-managed claims.
--
-- Migration 002 is the authoritative schema at this point in the replay chain and
-- clinic_users does not yet have deleted_at or employee_code. Later migrations
-- introduce the PIN/session compatibility fields. The authorization helpers only
-- require tenant_id and role, so this backfill must not reference later-only fields.

UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
  'tenant_id', cu.tenant_id::text,
  'user_role', cu.role,
  'full_name', cu.full_name
)
FROM public.clinic_users cu
WHERE cu.id = u.id;

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
