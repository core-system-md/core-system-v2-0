-- Migration 032: canonical legacy PIN verification RPC.
-- This function is retained for migration compatibility; active login uses
-- create_pin_session(UUID,TEXT,TEXT). The canonical function is recreated in 034.

CREATE OR REPLACE FUNCTION public.verify_pin_hash(
  p_tenant_id UUID,
  p_pin TEXT
)
RETURNS SETOF public.clinic_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.clinic_users
  WHERE tenant_id = p_tenant_id
    AND pin_hash IS NOT NULL
    AND pin_hash = crypt(p_pin, pin_hash)
    AND is_active = TRUE
    AND deleted_at IS NULL;
END;
$$;