-- Migration 033: demo-user compatibility marker
--
-- Demo/E2E records are seeded explicitly by e2e/seed.mjs with the service
-- role and immutable E2E identifiers. Keep this historical migration valid
-- without introducing a second seed contract into the migration chain.

DO $$
BEGIN
  RAISE NOTICE 'Demo users are seeded by the explicit E2E fixture workflow';
END;
$$;
