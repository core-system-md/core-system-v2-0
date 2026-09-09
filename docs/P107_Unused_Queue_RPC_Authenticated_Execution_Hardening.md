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
- Production migration `p107_restrict_unused_queue_rpc_authenticated_execute` applied.
- Final ACL read-back is required to confirm client roles have no EXECUTE and internal roles remain intact.
- Security Advisor re-check is required to confirm the authenticated SECURITY DEFINER findings decrease by two.
- Vercel deployment/build/runtime verification is required before closure.

## Closure
Pending final Production ACL read-back, Advisor verification, and Vercel verification.