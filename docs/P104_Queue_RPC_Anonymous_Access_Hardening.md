# CORE SYSTEM v2.1 — P104 Queue RPC Anonymous Access Hardening

## Claim
The legacy queue SECURITY DEFINER RPCs `get_queue_for_tenant(uuid)` and `get_queue_with_details(uuid)` do not have an evidenced anonymous application contract and should not remain executable by `anon`.

## Evidence
- Repository search found these function names in migration/type history but no active application caller establishing an anonymous contract.
- Production ACL read-back showed `get_queue_for_tenant(uuid)` had PUBLIC plus explicit `anon` and `authenticated` execution; `get_queue_with_details(uuid)` had PUBLIC plus explicit `authenticated` execution.
- The active queue model is part of the authenticated application surface; no public anonymous queue route was established by the active repository evidence.
- Production migration `p104_restrict_queue_rpc_anonymous_execution` revoked EXECUTE from PUBLIC and `anon` for both exact signatures while preserving `authenticated`, `service_role`, and `postgres` access.
- Production `pg_proc.proacl` read-back confirms both functions now have only `postgres`, `authenticated`, and `service_role` EXECUTE entries.
- Supabase Security Advisor anonymous SECURITY DEFINER finding count decreased from 18 to 17 after the change.
- No function body, signature, RLS policy, Auth contract, tenant predicate, or application queue behavior was changed.

## Classification
CONFIRMED.

## Verification state
- Production migration applied successfully.
- Production ACL read-back passed.
- Supabase Security Advisor re-check passed for the intended reduction.
- Vercel Production deployment for commit `dd2a993b66fb8b5f27f47dcf38fb195c4cb311eb` is currently `BUILDING`; final Vercel readiness/runtime verification remains pending.
- Therefore P104 is **not yet CLOSED** until Vercel reaches READY and the final runtime check is completed.
