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
- Production ACL read-back: PASS.
- Active-source caller search: no active caller found.
- `validate_license` active contract preserved.
- Repository migration recorded as `supabase/migrations/062_p105_restrict_dead_validate_email_password_execute.sql`.

## Closure note
Production ACL state is verified. The Production migration-history row for P105 is pending formal registration because the current surfaced Supabase migration action was not available for this turn; P105 therefore remains evidence-complete but roadmap-closure pending until migration history is registered.
