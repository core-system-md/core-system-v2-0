-- CORE SYSTEM v2.1 — reception inquiry schema compatibility
-- Evidence-backed additive repair for the active P143/P144 RPC contract.
-- Restore every canonical inquiry field referenced by the runtime RPCs.
-- Idempotent: safe for clean migration replay and existing environments.

BEGIN;

ALTER TABLE public.clinic_inquiries
  ADD COLUMN IF NOT EXISTS temp_phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS inquiry_reason VARCHAR,
  ADD COLUMN IF NOT EXISTS procedures_requested TEXT[],
  ADD COLUMN IF NOT EXISTS initial_disc_guess TEXT,
  ADD COLUMN IF NOT EXISTS expected_objection TEXT,
  ADD COLUMN IF NOT EXISTS handled_by UUID;

COMMIT;
