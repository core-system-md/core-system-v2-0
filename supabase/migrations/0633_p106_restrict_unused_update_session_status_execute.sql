-- P106: Restrict execution of the unused update_session_status RPC.
-- Evidence: active source search found no caller of public.update_session_status;
-- the active session mutation path updates clinic_visit_sessions directly and
-- applies the tenant boundary in the query. The active sessions.mutations.ts
-- file is not imported by an active caller.
-- Preserve the RPC definition/signature for compatibility; remove client-role
-- execution only.

REVOKE EXECUTE ON FUNCTION public.update_session_status(uuid, text, uuid, text) FROM PUBLIC, anon, authenticated;
