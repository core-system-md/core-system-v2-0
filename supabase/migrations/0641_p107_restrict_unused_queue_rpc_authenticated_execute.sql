-- P107: Restrict execution of legacy queue RPCs with no active client callers.
-- Evidence: repository search found no active application caller for either
-- public.get_queue_for_tenant(uuid) or public.get_queue_with_details(uuid).
-- Queue consumers in the active source use current queue/session paths instead.
-- Preserve both RPC definitions/signatures; remove client-role execution only.

REVOKE EXECUTE ON FUNCTION public.get_queue_for_tenant(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_queue_with_details(uuid) FROM PUBLIC, anon, authenticated;
