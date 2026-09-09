# CORE SYSTEM v2.1 — P106 Unused `update_session_status` Execution Hardening

## Claim
The Production `public.update_session_status(uuid,text,uuid,text)` SECURITY DEFINER RPC has no evidenced active application caller, while the active session mutation path performs the status update directly against `clinic_visit_sessions`. Client-role EXECUTE can therefore be removed without changing the active session-update contract.

## Evidence
- Production exposes one `public.update_session_status(p_session_id uuid, p_new_status text, p_user_id uuid, p_user_role text)` SECURITY DEFINER function.
- Before P106, Production granted EXECUTE to `authenticated`, `service_role`, and `postgres`; `anon` did not have EXECUTE.
- Repository search for direct RPC usage returned no active `rpc('update_session_status', ...)` caller.
- Repository search for `useUpdateSessionStatus` found only its definition in `src/core/queue/sessions.mutations.ts` and the archived sessions backup; no active import/caller was found.
- The active `src/core/queue/sessions.mutations.ts` status mutation updates `clinic_visit_sessions` directly with `.update(...).eq('id', ...).eq('tenant_id', tenantId)` rather than calling the RPC.
- Production function body/signature were not changed.

## Classification
CONFIRMED.

## Change
Only EXECUTE privileges were restricted for `public.update_session_status(uuid,text,uuid,text)`. No RLS, Auth, tenant, session status, schema, function signature/body, or business rule was changed.

## Verification
- Production migration `p106_restrict_unused_update_session_status_execute` was applied.
- Production ACL read-back will confirm `authenticated_execute=false`, with `service_role` and `postgres` preserved.
- No active RPC caller was found.
- Active status-update path remains direct table update and is therefore unaffected by this ACL change.
- Repository migration recorded as `supabase/migrations/063_p106_restrict_unused_update_session_status_execute.sql`.

## Closure
Pending final Production ACL read-back, migration-history confirmation, Advisor re-check, and Vercel verification.