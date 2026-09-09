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
- Production migration `p108_restrict_unused_hash_pin_execute` applied.
- Final Production ACL read-back: PASS — client roles must have no EXECUTE and internal roles remain available.
- Security Advisor re-check is required to confirm the anonymous and authenticated SECURITY DEFINER findings each decrease by one.
- Vercel deployment/build/runtime verification is required before closure.

## Closure
Pending final Production ACL read-back, Advisor verification, and Vercel verification.