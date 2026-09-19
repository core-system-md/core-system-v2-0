-- P-AuthSchema: align PIN-attempt audit schema with the active client/RPC contract.
--
-- Evidence:
-- - database.types.ts and active PIN functions use pin_attempt_log.ip_address.
-- - The migration chain replayed successfully but the isolated E2E login failed with:
--   column "ip_address" does not exist.
-- - The column is nullable because existing callers intentionally pass NULL when the
--   request IP is unavailable.
--
-- No existing rows are modified; this is additive and forward-only.

ALTER TABLE public.pin_attempt_log
  ADD COLUMN IF NOT EXISTS ip_address INET;
