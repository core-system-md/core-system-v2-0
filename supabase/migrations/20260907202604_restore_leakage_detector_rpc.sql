-- Restore the RPC used by the production leakage-detector Edge Function.
-- The function had been dropped as dead code before the Edge Function became active.

CREATE OR REPLACE FUNCTION public.detect_leakage_gaps()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gaps integer;
BEGIN
  SELECT COUNT(*) INTO v_gaps
  FROM clinic_visit_sessions s
  WHERE s.session_status = 'completed'
    AND NOT EXISTS (
      SELECT 1 FROM clinic_invoices i
      WHERE i.session_id = s.id
    )
    AND s.created_at < NOW() - INTERVAL '7 days';

  RETURN v_gaps;
END;
$$;

REVOKE ALL ON FUNCTION public.detect_leakage_gaps() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_leakage_gaps() TO service_role;