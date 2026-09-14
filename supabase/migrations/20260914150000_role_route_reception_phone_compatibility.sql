-- CORE SYSTEM v2.1 — Master Test #265 runtime compatibility
-- Narrow additive repair: restore the reception inquiry phone column required
-- by Blueprint/P143/P144 RPC contracts and already present in production.

BEGIN;

ALTER TABLE public.clinic_inquiries
  ADD COLUMN IF NOT EXISTS temp_phone VARCHAR(20);

COMMIT;
