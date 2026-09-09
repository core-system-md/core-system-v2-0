# CORE SYSTEM v2.1 — P103 Internal SECURITY DEFINER Access Hardening

## Claim
Two `public` SECURITY DEFINER functions exposed to `anon` and `authenticated` were not established as application RPC contracts and could be restricted without changing the active authentication, PIN, Survey, RLS, or financial contracts.

## Evidence
- Production `public.is_super_admin()` was SECURITY DEFINER and explicitly executable by `anon` and `authenticated`.
- Production policy inspection found no active RLS policy depending on the public `is_super_admin()` function; active policy authorization uses the auth-schema helper instead.
- Repository search found the public helper only in historical migrations/types, not in active application source.
- Production `public.prevent_protected_clinic_user_changes()` is a SECURITY DEFINER trigger function attached to `clinic_users.trg_protect_clinic_user_identity` and is not a client RPC contract.
- Both functions had explicit `anon` and `authenticated` EXECUTE grants in addition to the default PUBLIC grant.
- Production migrations `p103_restrict_internal_security_definer_rpcs` and the corrective `p103_restrict_internal_security_definer_rpcs_explicit_grants` removed `anon` and `authenticated` EXECUTE while preserving `postgres` and `service_role` access.
- Production `pg_proc.proacl` read-back confirms both functions now have only `postgres` and `service_role` EXECUTE entries.
- Supabase Security Advisor SECURITY DEFINER executable findings decreased from 20 to 18 for both anonymous and authenticated categories after this change.
- Vercel Production deployment for commit `f498d61a388cc6a7ac946b7e0ddc73e3136b93d3` is READY.
- Vercel Production build completed successfully; the only error-filtered output is the existing chunk-size warning.
- Vercel Production runtime error verification returned no runtime errors in the selected one-hour window.
- No GitHub Actions workflow run was exposed for this direct `main` commit, so CI is not claimed for P103.

## Classification
CONFIRMED.

## Scope
Changed only function EXECUTE ACLs for the two evidence-backed internal functions.

Not changed:
- function signatures or bodies
- PIN/Survey public RPCs
- Auth/JWT contract
- RLS policies
- tenant isolation
- financial RPCs
- schema/data
- active Doctor files
- Archive content

## Advisor status after P103
Remaining SECURITY DEFINER findings are evidence-gated. The remaining functions include the verified public PIN/Survey authentication/session flows and functions whose active/external intent must be established before any access restriction. Unused-index findings are also not treated as defects without workload evidence.
