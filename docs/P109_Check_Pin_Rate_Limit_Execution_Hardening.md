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
- Production migration `20260909082532 / p109_restrict_unused_check_pin_rate_limit_execute` is registered.
- Production ACL read-back: PASS — `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`, `postgres_execute=true`.
- No active application RPC caller was found.
- The internal `validate_pin` database call remains valid because function-to-function execution is not dependent on the revoked client-role ACL.
- Supabase Security Advisor anonymous SECURITY DEFINER findings decreased from 15 to 14; authenticated findings decreased from 13 to 12.
- Vercel Production deployment for source commit `38ff66632f37b6cc3e40a834941cf421880b3faf` reached `READY`. Build error-only logs show no build failure; only the known `esbuild@0.25.12` install-script warning and standard chunk-size warning remain.
- Deployment-scoped Production runtime error/fatal verification returned no logs.
- Repository migration recorded as `supabase/migrations/066_p109_restrict_unused_check_pin_rate_limit_execute.sql`.

## Closure
**CLOSED — CONFIRMED.**

P109 is closed because the active access contract was preserved, client-role execution was removed with a surgical ACL change, Production migration and ACL were verified, Advisor reduction was confirmed, and Vercel build/runtime verification passed.