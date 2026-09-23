-- P104: queue RPCs are authenticated application contracts, not public
-- anonymous APIs. Active repository source does not establish an anon caller.
-- Preserve authenticated/service_role execution and function bodies.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.get_queue_for_tenant(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_queue_with_details(uuid) FROM PUBLIC, anon;

COMMIT;
