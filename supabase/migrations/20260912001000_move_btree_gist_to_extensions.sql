-- CORE SYSTEM v2.1
-- Relocate the relocatable btree_gist extension out of public.
-- pg_net is intentionally NOT moved here: the installed pg_net 0.20.3
-- is non-relocatable and currently contains retained response data.

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'btree_gist'
      AND n.nspname = 'public'
  ) THEN
    ALTER EXTENSION btree_gist SET SCHEMA extensions;
  END IF;
END
$$;
