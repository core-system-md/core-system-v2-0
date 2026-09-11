-- Restore the canonical audit column referenced by PIN rate-limit/login RPCs.
-- Additive and replay-safe: existing production/local data is preserved.
ALTER TABLE public.pin_attempt_log
  ADD COLUMN IF NOT EXISTS ip_address inet;
