# CORE SYSTEM v2.1 — Credential Rotation Runbook (FIX-001)

**Status: PREPARED — NOT EXECUTED.** This is an operational runbook, not an automatic migration.
Never run it on production until FIX-002 is merged and verified and the owner has given explicit written approval for the production rotation.

## Scope and prerequisites

- Rotate credentials only for one explicitly selected tenant.
- Use a disposable local Supabase stack or a separately approved isolated Supabase branch for rehearsal.
- Confirm the deployed/login SQL contract after FIX-002: every `public.create_pin_session` overload must use the new hashed PIN contract, and the UI/API must accept the new PIN length.
- Confirm the stored hash format matches the existing bcrypt-style contract and verify function. Do not guess or change the hash format in this task.
- Verify `public.clinic_users` contains `id`, `tenant_id`, `employee_code`, `pin_code`, `pin_hash`, `is_active`, `deleted_at`, and `updated_at`; verify `public.master_tenants` contains `id`, `license_key`, `is_active`, and `deleted_at`.
- Review database logging configuration before staging data. Do not proceed where statements or bound parameters containing credentials could be captured by query/audit logs.
- The current repository's legacy `hash_pin` helper uses PostgreSQL `pgcrypto` `crypt()` with bcrypt (`bf`). For the isolated rehearsal, the recommended producer is `extensions.crypt(pin, extensions.gen_salt('bf', 12))`; verify with `extensions.crypt(input_pin, stored_hash) = stored_hash`. The rehearsal asserts the exact bcrypt prefix emitted by the installed PostgreSQL's `pgcrypto` (the documented Blowfish variant is `$2a# CORE SYSTEM v2.1 — Credential Rotation Runbook (FIX-001)

**Status: PREPARED — NOT EXECUTED.** This is an operational runbook, not an automatic migration.
Never run it on production until FIX-002 is merged and verified and the owner has given explicit written approval for the production rotation.

## Scope and prerequisites

- Rotate credentials only for one explicitly selected tenant.
- Use a disposable local Supabase stack or a separately approved isolated Supabase branch for rehearsal.
- Confirm the deployed/login SQL contract after FIX-002: every `public.create_pin_session` overload must use the new hashed PIN contract, and the UI/API must accept the new PIN length.
- Confirm the stored hash format matches the existing bcrypt-style contract and verify function. Do not guess or change the hash format in this task.
- Verify `public.clinic_users` contains `id`, `tenant_id`, `employee_code`, `pin_code`, `pin_hash`, `is_active`, `deleted_at`, and `updated_at`; verify `public.master_tenants` contains `id`, `license_key`, `is_active`, and `deleted_at`.
- Review database logging configuration before staging data. Do not proceed where statements or bound parameters containing credentials could be captured by query/audit logs.
- The current repository's legacy `hash_pin` helper uses PostgreSQL `pgcrypto` `crypt()` with bcrypt (`bf`). For the isolated rehearsal, the recommended producer is `extensions.crypt(pin, extensions.gen_salt('bf', 12))`; verify with `extensions.crypt(input_pin, stored_hash) = stored_hash`. ) and confirms `crypt()` accepts that generated hash. The rehearsal does not certify hashes from an external bcrypt library that emits `$2b# CORE SYSTEM v2.1 — Credential Rotation Runbook (FIX-001)

**Status: PREPARED — NOT EXECUTED.** This is an operational runbook, not an automatic migration.
Never run it on production until FIX-002 is merged and verified and the owner has given explicit written approval for the production rotation.

## Scope and prerequisites

- Rotate credentials only for one explicitly selected tenant.
- Use a disposable local Supabase stack or a separately approved isolated Supabase branch for rehearsal.
- Confirm the deployed/login SQL contract after FIX-002: every `public.create_pin_session` overload must use the new hashed PIN contract, and the UI/API must accept the new PIN length.
- Confirm the stored hash format matches the existing bcrypt-style contract and verify function. Do not guess or change the hash format in this task.
- Verify `public.clinic_users` contains `id`, `tenant_id`, `employee_code`, `pin_code`, `pin_hash`, `is_active`, `deleted_at`, and `updated_at`; verify `public.master_tenants` contains `id`, `license_key`, `is_active`, and `deleted_at`.
- Review database logging configuration before staging data. Do not proceed where statements or bound parameters containing credentials could be captured by query/audit logs.
- The current repository's legacy `hash_pin` helper uses PostgreSQL `pgcrypto` `crypt()` with bcrypt (`bf`). For the isolated rehearsal, the recommended producer is `extensions.crypt(pin, extensions.gen_salt('bf', 12))`; verify with `extensions.crypt(input_pin, stored_hash) = stored_hash`. ; FIX-002 must keep the producer and verifier compatible and confirm the production schema and hashing cost before actual rotation.

## Explicit exclusions — tracked in FIX-002

This FIX-001 rotation changes only the staged staff PIN hash / legacy PIN field, tenant license key, and live PIN sessions. It does **not** clean or rotate the following:

- `public.clinic_users.password`: legacy password column is left unchanged.
- `public.pin_attempt_log.attempted_pin`: historical attempt values are retained; this runbook does not purge or rewrite the audit history.
- Supabase Auth email/password accounts: users, password hashes, identities, and existing Auth sessions are outside this PIN/license rotation.
- Git history: this task removes references from current tracked files but does not rewrite public commit history or force-push rewritten commits.

These exclusions are tracked under FIX-002. Any history remediation, legacy password cleanup, audit-history policy, or Supabase Auth account rotation must be planned and approved separately; do not include such changes in this runbook implicitly.

## Generate credentials outside the repository

1. Select a cryptographically secure password manager or credential generator approved by the owner. Generate a numeric PIN of at least six digits per active, non-deleted staff account; eight digits is preferred while the approved FIX-002 login contract permits it.
2. Generate all PINs independently. Check uniqueness before hashing; do not reuse a value across staff members. Do not use sequential, repeated, tenant-derived, employee-derived, or publicly documented values.
3. Generate a new, high-entropy tenant license key (at least 32 random bytes, encoded with a URL-safe format) using the approved secret manager. Never include actual credentials in source files, SQL text, terminal arguments, logs, tickets, CI output, or this document.
4. Save plaintext PINs and the new license key only in the approved secret manager / secure delivery workflow. Do not write plaintext PINs to a staging file. Create the hash values through the hashing mechanism confirmed by FIX-002; the staging rows contain hashes and PIN lengths only.
5. Assign each staged PIN to an unambiguous staff row by the verified database user ID and tenant ID. Do not rely only on employee names or email addresses.

## Isolated rehearsal — independent of the full migration chain

The repository's full migration replay currently fails at `supabase/migrations/012_rls.sql` because that migration creates functions in the `auth` schema, which the current Supabase local replay environment does not permit. This existing issue is tracked by FIX-005. Do **not** edit migration 012 or use the full migration runner to validate FIX-001's rotation SQL.

Instead, the repository includes a minimal PostgreSQL schema fixture and an isolated rehearsal runner:

1. Create an empty, disposable PostgreSQL database with `pgcrypto` available. Do not point the runner at production, a shared database, or a database containing application tables.
2. Run `npm run test:rotation-rehearsal` with local connection variables set. The runner refuses non-local `PGHOST` values and refuses to start if `public.master_tenants`, `public.clinic_users`, or `public.pin_sessions` already exist.
3. The runner creates only a minimal fixture for `master_tenants`, `clinic_users`, `pin_sessions`, and the hashed-contract test RPCs; it enables RLS on the fixture tables and seeds only runtime-generated synthetic rows. It does not apply the full application migration chain.
4. It verifies the bcrypt hash prefix produced by `pgcrypto` and verifies that `crypt()` accepts that hash; tests that a function definition containing both a hash reference and a plaintext PIN comparison is rejected; tests rejection of an incomplete staff stage; and forces a postflight mismatch to prove the PIN, license, and session updates roll back.
5. It then executes the apply script twice in one session using the exact same generated staged hashes, compares user/license/session snapshots before and after the second run, and asserts that all existing live PIN sessions for the staged tenant were soft-revoked.
6. The runner prints only phase outcomes and never returns credential values. It is a disposable rehearsal only; it does not validate the application-wide role routes or replace FIX-005's migration-chain repair.

For a Unix local PostgreSQL service, an example is to run the script as the local database owner with `PGHOST=/var/run/postgresql`, `PGUSER=postgres`, and `PGDATABASE=postgres`. Always select an empty, disposable database. Do not use production connection strings or production credentials.

## Secure handover

1. Deliver each staff member's PIN individually through an approved, authenticated channel (for example, a secure one-time secret-sharing link). Do not send multiple staff PINs in one group message.
2. Deliver the tenant license only to the owner/authorized administrator through the approved secret manager. It is not a staff PIN and must not be placed in a public frontend variable.
3. Require each staff member to acknowledge receipt through the approved workflow; instruct them not to forward, reuse, or store the PIN in an unapproved location.
4. On suspected exposure, disable access through the approved account process and issue a new credential. Do not delete staff or clinic records as part of rotation.
5. After successful handover and owner confirmation, securely expire one-time links and temporary credential material according to policy.

## Production execution — requires explicit owner approval

Only after FIX-002 is merged and its login/authentication tests pass:

1. Review the final SQL diff and the isolated rehearsal evidence.
2. Obtain explicit written approval for the target tenant, staff scope, license rotation, planned time window, and rollback/recovery procedure.
3. Confirm current backups and a tested recovery path. Confirm no active staff row is missing from the rotation set.
4. Run the prepared SQL from an approved privileged session, with parameter values supplied through the reviewed secure client. Never paste credentials into a committed file or report.
5. Confirm each role can authenticate with the new credential and that the old credential no longer authenticates. Verify the new tenant license works and the old license does not.
6. If any check fails, stop rollout and use the owner-approved recovery procedure; do not weaken RLS, disable rate limiting, or revert to default credentials.

## Reversibility and idempotence

The SQL uses guarded updates only and does not delete rows or disable RLS. It requires staging for exactly one tenant and all active non-deleted staff in that tenant. Reapplying the same staged values leaves already-rotated rows unchanged. A different later rotation requires a new approved stage set and owner review; do not reuse previously issued PINs.
