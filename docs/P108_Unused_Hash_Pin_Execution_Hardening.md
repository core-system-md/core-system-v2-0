# CORE SYSTEM v2.1 — P108 Unused `hash_pin` Execution Hardening

## Claim
The Production `public.hash_pin(text)` SECURITY DEFINER function has no evidenced active application caller. Client-role EXECUTE can therefore be removed without changing the active authentication/PIN contract.

## Evidence
- Production exposes exactly one `public.hash_pin(p_pin text)` SECURITY DEFINER function with explicit `search_path=public`.
- Initial Production ACL allowed PUBLIC, `anon`, and `authenticated` EXECUTE.
- Repository search for `hash_pin` found only historical migrations and generated database types; no active application caller was found.
- Direct active RPC searches for `rpc('hash_pin'` and `.rpc("hash_pin"` returned no matches.
- The function definition/signature remains unchanged and only computes `crypt(p_pin, gen_salt('bf'))`.

## Classification
CONFIRMED.

## Change
EXECUTE was revoked from `PUBLIC`, `anon`, and `authenticated` for `public.hash_pin(text)`. `postgres` and `service_role` remain executable. No Auth, RLS, tenant, PIN validation flow, schema, function signature/body, or business rule was changed.

## Verification
- Production migration `20260909082349 / p108_restrict_unused_hash_pin_execute` is registered.
- Production ACL read-back: PASS — `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`, `postgres_execute=true`.
- No active application caller was found.
- Supabase Security Advisor anonymous SECURITY DEFINER findings decreased from 16 to 15; authenticated SECURITY DEFINER findings decreased from 14 to 13.
- Vercel Production deployment for source commit `aa153114986c636a1568a1fad4b6e3bb4ac2c9e9` is `READY`. Errors-only build logs show no build failure; only the known `esbuild@0.25.12` install-script warning and standard chunk-size warning remain.
- Deployment-scoped Production runtime error/fatal verification returned no logs.
- Repository migration recorded as `supabase/migrations/065_p108_restrict_unused_hash_pin_execute.sql`.

## Closure
**CLOSED — CONFIRMED.**

P108 is closed because the access-contract evidence, Production ACL change, migration registration, Advisor reduction, successful Vercel deployment, build verification, and runtime verification are complete. No active PIN/authentication behavior or database business contract was changed.