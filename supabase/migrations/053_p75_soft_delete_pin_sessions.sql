-- P75: enforce Constitution soft-delete semantics for active PIN-session lifecycle.
-- Evidence: production create_pin_session implementations physically DELETE prior
-- sessions, while active PIN-session readers query pin_sessions by token/expiry.
-- Keep all RPC signatures and return contracts unchanged. Replace the physical
-- session DELETE with deleted_at and make every active-session lookup exclude
-- soft-deleted rows.

DO $$
DECLARE
  v_oid oid;
  v_def text;
BEGIN
  FOR v_oid IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname IN (
        'broadcast_pin_queue_change',
        'create_pin_session',
        'create_reception_quick_booking_for_pin_session',
        'get_queue_for_pin_session',
        'get_reception_dashboard_for_pin_session',
        'search_reception_patient_for_pin_session'
      )
  LOOP
    v_def := pg_get_functiondef(v_oid);
    v_def := replace(v_def,'DELETE FROM public.pin_sessions' || chr(10) || '  WHERE staff_id','UPDATE public.pin_sessions' || chr(10) || '  SET deleted_at = pg_catalog.now()' || chr(10) || '  WHERE staff_id');
    v_def := replace(v_def,'DELETE FROM public.pin_sessions WHERE staff_id','UPDATE public.pin_sessions SET deleted_at = pg_catalog.now() WHERE staff_id');
    v_def := replace(v_def,'AND ps.expires_at > NOW()','AND ps.deleted_at IS NULL' || chr(10) || '    AND ps.expires_at > NOW()');
    v_def := replace(v_def,'AND ps.expires_at>NOW()','AND ps.deleted_at IS NULL AND ps.expires_at>NOW()');
    v_def := replace(v_def,'AND ps.expires_at > pg_catalog.now()','AND ps.deleted_at IS NULL' || chr(10) || '      AND ps.expires_at > pg_catalog.now()');
    EXECUTE v_def;
  END LOOP;
END;
$$;
