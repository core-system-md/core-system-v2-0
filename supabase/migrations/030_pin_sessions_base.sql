-- Restore the canonical PIN session table to the replayable migration chain.
-- Evidence: later migrations (P74/P75/P83 and reception PIN RPCs) depend on
-- public.pin_sessions, while its creation currently occurs only in migration 047.
-- Create-if-missing only; existing Production schema is left unchanged.

CREATE TABLE IF NOT EXISTS public.pin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.master_tenants(id),
    staff_id UUID NOT NULL REFERENCES public.clinic_users(id),
    token_hash BYTEA NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pin_sessions_lookup
    ON public.pin_sessions(tenant_id, staff_id, expires_at);
