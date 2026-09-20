-- Migration 033: Seed demo users
--
-- The historical file content was replaced by a non-SQL placeholder, which
-- breaks a clean PostgreSQL migration replay at statement 0.
--
-- Demo data is maintained separately under supabase/seed/demo_data.sql.
-- Keep this migration intentionally side-effect free so the migration chain
-- remains replayable without inventing credentials or duplicating seed data.

DO $$
BEGIN
  RAISE NOTICE 'Migration 033: demo users are provided by supabase/seed/demo_data.sql';
END;
$$;
