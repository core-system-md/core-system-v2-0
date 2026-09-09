# CORE SYSTEM v2.1 — P105 Dead `validate_email_password` Execution Hardening

## Claim
The Production `public.validate_email_password(jsonb)` SECURITY DEFINER function is a legacy/dead RPC and does not have an evidenced active application caller, so client-role execution can be removed without changing the active authentication contract.

## Evidence
- Production exposes exactly one `public.validate_email_password(params jsonb)` function and it is SECURITY DEFINER.
- Production initially granted execution to PUBLIC, `anon`, and `authenticated`.
- Repository search found no active application caller for `validate_email_password`; the historical migration `035_drop_dead_functions.sql` explicitly documented the function as dead and dropped the earlier `(TEXT, TEXT, UUID)` overload.
- The active authentication source uses Supabase Auth and the verified `validate_license(p_license_key)` path; no active source path depends on `validate_email_password(jsonb)`.
- The function signature and body were not changed.
- Production ACL read-back after the change confirms only `postgres` and `service_role` retain EXECUTE; `anon` and `authenticated` no longer have execution privilege.
- `validate_license(p_license_key text, p_device_fingerprint text DEFAULT NULL)` remains unchanged because it has an evidenced active caller in `src/core/auth/useAuth.ts`.

## Classification
CONFIRMED.

## Change
Only the EXECUTE ACL for `public.validate_email_password(jsonb)` was restricted for client roles. No Auth, JWT, PIN, Survey, RLS, tenant, schema, financial, or function-signature contract was changed.

## Verification
- Production migration `p105_restrict_dead_validate_email_password_execute` is now registered in `supabase_migrations.schema_migrations` at version `20260909081742`.
- Production ACL read-back: PASS — `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`, `postgres_execute=true`.
- Active-source caller search: no active caller found.
- `validate_license` active contract preserved.
- Repository migration recorded as `supabase/migrations/062_p105_restrict_dead_validate_email_password_execute.sql`.
- Supabase Security Advisor now reports 16 anonymous and 17 authenticated SECURITY DEFINER functions executable, with `validate_email_password(jsonb)` removed from both findings.

## Closure
**CLOSED — CONFIRMED.**

P105 is formally closed because the implementation, Production migration registration, ACL verification, active-caller evidence, and post-change Advisor verification are all complete. No broader SECURITY DEFINER remediation is inferred from the remaining Advisor findings; each remaining function requires its own evidenced access-contract review.
