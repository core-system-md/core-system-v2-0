-- P51: Secure low-latency queue invalidation for PIN-only reception.
-- PIN sessions do not have Supabase Auth JWTs, so private Realtime Authorization
-- cannot be used directly. Each active PIN session receives a public Broadcast
-- on a topic derived from its SHA-256 session token hash. The payload contains
-- no patient/queue data; the client must re-read the queue through the existing
-- PIN-session RPC, preserving tenant isolation.

CREATE OR REPLACE FUNCTION public.broadcast_pin_queue_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_tenant_id uuid;
  v_topic text;
BEGIN
  v_tenant_id := COALESCE(NEW.tenant_id, OLD.tenant_id);

  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  FOR v_topic IN
    SELECT 'reception_queue:' || v_tenant_id::text || ':' || encode(ps.token_hash, 'hex')
    FROM public.pin_sessions ps
    JOIN public.clinic_users cu
      ON cu.id = ps.staff_id
     AND cu.tenant_id = ps.tenant_id
     AND cu.is_active = true
     AND cu.deleted_at IS NULL
     AND cu.role IN ('receptionist', 'clinic_admin', 'super_admin')
    WHERE ps.tenant_id = v_tenant_id
      AND ps.expires_at > pg_catalog.now()
  LOOP
    PERFORM realtime.send(
      pg_catalog.jsonb_build_object('tenant_id', v_tenant_id, 'refresh', true),
      'queue_changed',
      v_topic,
      false
    );
  END LOOP;

  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.broadcast_pin_queue_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS clinic_visit_sessions_pin_queue_broadcast ON public.clinic_visit_sessions;

CREATE TRIGGER clinic_visit_sessions_pin_queue_broadcast
AFTER INSERT OR UPDATE OR DELETE ON public.clinic_visit_sessions
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_pin_queue_change();
