-- Migration 031: RLS policy reconciliation for reference/analytics tables
--
-- The required policies are already created explicitly by migration 022 with
-- the canonical access contract (including TO authenticated for analytics and
-- global reference reads). PostgreSQL does not support CREATE POLICY IF NOT
-- EXISTS, so repeating those CREATE POLICY statements here would fail replay
-- and could also change the established policy semantics.
--
-- Keep this migration intentionally idempotent/no-op for historical replay.
SELECT 1;
