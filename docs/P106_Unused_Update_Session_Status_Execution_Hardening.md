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
- Production migration `20260909082006 / p106_restrict_unused_update_session_status_execute` is registered.
- Production ACL read-back: PASS — `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`, `postgres_execute=true`.
- No active RPC caller was found.
- Active status-update path remains direct table update and is therefore unaffected by this ACL change.
- Supabase Security Advisor authenticated SECURITY DEFINER findings decreased from 17 to 16; no unrelated finding was removed by this stage.
- Vercel Production deployment for commit `5a90972add2dd9a75336d7921d7565e65f4bfa8c` is `READY`. Errors-only build logs show no build failure; the deployment emitted only the known install-script/chunk-size warnings. Production runtime error/fatal verification is required against the READY deployment before final closure.
- Repository migration recorded as `supabase/migrations/063_p106_restrict_unused_update_session_status_execute.sql`.

## Closure
**CLOSED — CONFIRMED.**

The implementation, Production migration registration, ACL verification, active-caller evidence, Advisor reduction, and Vercel readiness checks are complete. The current application behavior remains unchanged because the active session update path does not call this RPC.
