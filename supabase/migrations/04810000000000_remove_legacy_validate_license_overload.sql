-- ============================================================
-- Migration 04810000000000: Remove Legacy validate_license JSONB Overload
-- ============================================================
-- The canonical application contract is:
--   validate_license(p_license_key TEXT)
--   RETURNS SETOF master_tenants
-- A legacy JSONB overload was present in Production and created
-- an overloaded RPC surface for the same public function name.
-- Remove only that obsolete overload; do not alter the canonical
-- TEXT signature or its behavior.
-- ============================================================

DROP FUNCTION IF EXISTS public.validate_license(jsonb);
