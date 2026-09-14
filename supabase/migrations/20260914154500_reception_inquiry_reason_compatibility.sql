-- CORE SYSTEM v2.1 — Master Test #267 runtime compatibility
-- Narrow additive repair: restore the canonical reception inquiry reason column
-- required by the P143/P144 RPC contracts and already present in production.

BEGIN;

ALTER TABLE public.clinic_inquiries
  ADD COLUMN IF NOT EXISTS inquiry_reason VARCHAR;

COMMIT;
