-- Migration 032: verify_pin_hash RPC compatibility marker
--
-- The canonical verify_pin_hash implementation is restored in migration 034.
-- Keep this historical migration valid so the complete fresh migration chain
-- can be replayed without inventing a second RPC contract.

DO $$
BEGIN
  IF to_regprocedure('public.verify_pin_hash(uuid,text)') IS NULL THEN
    RAISE NOTICE 'verify_pin_hash(uuid,text) will be created by migration 034';
  ELSE
    RAISE NOTICE 'verify_pin_hash(uuid,text) already exists';
  END IF;
END;
$$;
