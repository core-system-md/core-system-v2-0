# P101 — User Lookup RPC Access Hardening

## Claim
The unused `public.get_user_by_email(text)` SECURITY DEFINER RPC no longer grants direct EXECUTE to `authenticated`.

## Evidence
- Production inspection showed `get_user_by_email(text)` is `SECURITY DEFINER` and originally had explicit `authenticated` EXECUTE access.
- Active repository search found no application caller for `get_user_by_email`; the only code match was the historical RPC definition/database types.
- Production migration `p101_restrict_unused_user_lookup_rpc` revoked EXECUTE from `authenticated` without changing the function body or signature.
- Production `pg_proc.proacl` read-back now contains only `postgres=X/postgres, service_role=X/postgres` for the function.
- Supabase security Advisor no longer lists `get_user_by_email` in the authenticated SECURITY DEFINER findings.
- Repository migration: `supabase/migrations/062_p101_restrict_unused_user_lookup_rpc.sql`.
- Vercel Production deployment for commit `876be6112fb8ebd812504edc4a4717fec03edcff` is READY; build completed successfully and the existing chunk-size warning is non-blocking.

## Classification
`CONFIRMED`

## Confidence
High. The function ACL was read directly from Production before and after the change, and no active application caller was found.

## Scope preservation
No function body, signature, schema, RLS policy, Auth behavior, permission matrix, scoring logic, or financial-unit contract was changed.