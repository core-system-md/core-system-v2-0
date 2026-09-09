# CORE SYSTEM v2.1 — P107 Unused Queue RPC Authenticated Execution Hardening

## Claim
The Production `get_queue_for_tenant(uuid)` and `get_queue_with_details(uuid)` SECURITY DEFINER RPCs have no evidenced active application callers. Their client-role execution can therefore be removed without changing the active queue contract.

## Evidence
- Repository search found no active application call to `get_queue_for_tenant` or `get_queue_with_details`; the matches are limited to migrations and generated database types.
- P104 already removed anonymous/PUBLIC execution from both functions and preserved authenticated execution pending further evidence.
- Active queue/session source uses direct query paths rather than these RPCs; no active wrapper was found that calls either RPC.
- Function definitions/signatures were not changed.

## Classification
CONFIRMED.

## Change
EXECUTE was revoked from `PUBLIC`, `anon`, and `authenticated` for both exact queue RPC signatures. `postgres` and `service_role` execution remain available. No RLS, Auth, tenant, schema, queue data, or business rule was changed.

## Verification
- Production migration `20260909082053 / p107_restrict_unused_queue_rpc_authenticated_execute` is registered.
- Production ACL read-back: PASS — both functions have `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`, and `postgres_execute=true`.
- No active RPC caller was found.
- Active queue/session source remains on direct query paths and is unaffected by the ACL change.
- Supabase Security Advisor authenticated SECURITY DEFINER findings decreased from 16 to 14.
- Vercel Production deployment for source commit `3706540df2d020589d256c4bf25acd556a803df7` is `READY`. Errors-only build logs show no build failure; only the known `esbuild@0.25.12` install-script warning and standard chunk-size warning remain.
- Deployment-scoped Production runtime error/fatal verification returned no logs.
- Repository migration recorded as `supabase/migrations/064_p107_restrict_unused_queue_rpc_authenticated_execute.sql`.

## Closure
**CLOSED — CONFIRMED.**

P107 is closed because the access-contract evidence, Production ACL change, migration application, Advisor reduction, successful Vercel deployment, and runtime verification are complete. No active queue behavior or database business contract was changed.