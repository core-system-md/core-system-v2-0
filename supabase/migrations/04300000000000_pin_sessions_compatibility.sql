-- Compatibility bridge: 044 requires pin_sessions before canonical migration 047.
-- Shape intentionally matches migration 047 so that 047 remains idempotent.
CREATE TABLE IF NOT EXISTS public.pin_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES public.master_tenants(id),
  staff_id     UUID NOT NULL REFERENCES public.clinic_users(id),
  token_hash   BYTEA NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
