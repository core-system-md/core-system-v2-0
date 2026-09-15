-- CORE SYSTEM v2.1 — foundational PIN-session table
-- This table is referenced by migration 044 for governance soft-delete columns,
-- while the later migration 047 adds the full PIN-session runtime functions.
-- Keep the schema identical to the established 047 definition so the later
-- CREATE TABLE IF NOT EXISTS remains compatible.

CREATE TABLE IF NOT EXISTS public.pin_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.master_tenants(id),
  staff_id UUID NOT NULL REFERENCES public.clinic_users(id),
  token_hash BYTEA NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
