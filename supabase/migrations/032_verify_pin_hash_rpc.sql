-- Migration 032: Verify PIN hash RPC
-- Evidence: Constitution §9.6 requires verify_pin_hash RPC for PIN authentication.
-- Migration 034 restores the same canonical implementation later in the chain;
-- this early definition keeps the migration chain executable from scratch.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION verify_pin_hash(
  p_tenant_id UUID,
  p_pin TEXT
)
RETURNS SETOF clinic_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM clinic_users
  WHERE tenant_id = p_tenant_id
    AND pin_hash = crypt(p_pin, pin_hash)
    AND is_active = true
    AND deleted_at IS NULL;
END;
$$;
