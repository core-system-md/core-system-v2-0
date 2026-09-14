-- CORE SYSTEM v2.1 — reception inquiry schema compatibility
-- Evidence-backed additive repair for the active P143/P144 RPC contract.
-- Restore canonical inquiry fields required by the runtime RPCs and database types.
-- Idempotent: safe for clean migration replay and existing environments.

BEGIN;

ALTER TABLE public.clinic_inquiries
  ADD COLUMN IF NOT EXISTS procedures_requested TEXT[],
  ADD COLUMN IF NOT EXISTS initial_disc_guess TEXT,
  ADD COLUMN IF NOT EXISTS expected_objection TEXT;

COMMIT;
