# CORE SYSTEM v2.1 — P109 `check_pin_rate_limit` Execution Hardening

## Claim
The Production `public.check_pin_rate_limit(uuid,text)` SECURITY DEFINER function has no evidenced active application RPC caller. It is used internally by the existing PIN validation functions, so client-role EXECUTE can be removed without changing the internal rate-limiting contract.

## Evidence
- Repository search found no active `rpc('check_pin_rate_limit', ...)` caller.
- Repository search shows the function is invoked inside existing `validate_pin` database functions, preserving an internal dependency.
- Production function is SECURITY DEFINER with explicit `search_path=public`.
- The change therefore targets only direct client execution and does not alter the function body/signature or its internal callers.

## Classification
CONFIRMED.

## Change
EXECUTE was revoked from `PUBLIC`, `anon`, and `authenticated` for `public.check_pin_rate_limit(uuid,text)`. `postgres` and `service_role` remain executable. No Auth, RLS, tenant, PIN validation, schema, function signature/body, or business rule was changed.

## Verification
- Production migration `p109_restrict_unused_check_pin_rate_limit_execute` applied.
- Production ACL read-back is required to confirm client roles have no EXECUTE and internal roles remain intact.
- Security Advisor re-check is required to confirm anonymous and authenticated SECURITY DEFINER findings each decrease by one.
- Vercel deployment/build/runtime verification is required before closure.

## Closure
Pending final Production ACL read-back, migration-history confirmation, Advisor verification, and Vercel verification.