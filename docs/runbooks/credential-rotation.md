# CORE SYSTEM v2.1 — Credential Rotation Runbook (FIX-001)

**Status: PREPARED — NOT EXECUTED.** This is an operational runbook, not an automatic migration. Never run it on production until FIX-002 is merged and verified and the owner has given explicit written approval for the production rotation.

## Scope and prerequisites

- Rotate credentials for one explicitly selected tenant only.
- Use a disposable local PostgreSQL database or an approved isolated database branch for rehearsal.
- Confirm every `public.create_pin_session` overload uses the hashed PIN contract and contains no plaintext comparison against `pin_code`. The apply script enforces this gate.
- Confirm the new login contract accepts the approved PIN length and the stored hash format is compatible with the function that verifies it.
- Verify `public.clinic_users` contains `id`, `tenant_id`, `employee_code`, `pin_code`, `pin_hash`, `is_active`, `deleted_at`, and `updated_at`; verify `public.master_tenants` contains `id`, `license_key`, `is_active`, and `deleted_at`; verify `public.pin_sessions` has `tenant_id` and `deleted_at`.
- Review database logging configuration before staging data. Do not proceed where statements or bound parameters containing credentials could be captured by query/audit logs.
- Populate staging tables through a trusted database client using parameter binding. Never interpolate credentials into SQL strings or paste them into a SQL editor.

## Hash generation compatibility

The repository's legacy `hash_pin` helper uses PostgreSQL `pgcrypto` `crypt()` with bcrypt (`bf`). For the isolated rehearsal, use `extensions.crypt(pin, extensions.gen_salt('bf', 12))` and verify with `extensions.crypt(input_pin, stored_hash) = stored_hash`.

The rehearsal verifies that the installed PostgreSQL `pgcrypto` build emits the expected `$2a$` bcrypt prefix for `gen_salt('bf', 12)` and confirms `crypt()` accepts that generated hash. This rehearsal does not certify hashes produced by unrelated external libraries, including the `$2b$` variant. FIX-002 must establish the production hash producer, verifier, and cost parameter are compatible before rotation.

## Explicit exclusions — tracked in FIX-002

This FIX-001 rotation changes only the staged staff PIN hash and legacy PIN field, the tenant license key, and live PIN sessions. It does **not** clean or rotate the following:

- `public.clinic_users.password`: the legacy password column is left unchanged.
- `public.pin_attempt_log.attempted_pin`: historical attempt values are retained; this runbook does not purge or rewrite audit history.
- Supabase Auth email/password accounts: users, password hashes, identities, and existing Supabase Auth sessions are outside this PIN/license rotation.
- Git history: this task removes references from current tracked files but does not rewrite public commit history or force-push rewritten commits.

These exclusions are tracked under FIX-002. Any legacy password cleanup, audit-history policy, Supabase Auth account rotation, or Git-history remediation must be planned and approved separately. Do not include such actions implicitly in this runbook.

## Generate credentials outside the repository

1. Use a cryptographically secure generator approved by the owner. Generate a numeric PIN of at least six digits independently for each active, non-deleted staff account; use the length approved by FIX-002.
2. Ensure all PINs are unique. Do not use sequential, repeated, tenant-derived, employee-derived, or publicly documented values.
3. Generate a high-entropy tenant license key with at least 32 random bytes encoded in a URL-safe format, using the approved secret manager.
4. Store plaintext PINs and the new license key only in the approved secret manager/secure delivery workflow. Never write plaintext PINs to staging files, source code, SQL, terminal arguments, logs, tickets, or CI output.
5. Create PIN hashes using the exact producer approved by FIX-002. Stage hashes and PIN lengths only. Associate each staged PIN with an unambiguous staff ID and tenant ID; do not rely solely on a name or email address.

## Isolated rehearsal — independent of the full migration chain

The full application migration replay currently fails at `supabase/migrations/012_rls.sql`, which creates functions in the `auth` schema and is blocked by the current local Supabase replay environment. This pre-existing issue is tracked in FIX-005. Do not edit migration 012 as part of FIX-001 and do not depend on the full migration runner to validate this runbook.

The repository contains a minimal PostgreSQL schema fixture and a standalone rehearsal runner:

1. Create an empty, disposable local PostgreSQL database with `pgcrypto` available. Never point the runner at production, a shared database, or a database containing application tables.
2. Run `npm run test:rotation-rehearsal`. The runner accepts only a local socket or loopback host and refuses to continue when application tables are already present.
3. The fixture creates only the minimal `master_tenants`, `clinic_users`, and `pin_sessions` tables, a synthetic rehearsal-state table, and stub `create_pin_session`/`validate_license` definitions for the hashed contract. RLS is enabled on fixture tables. Synthetic rows and cryptographic values are generated at runtime.
4. The rehearsal verifies bcrypt hash generation and verification with `pgcrypto`; rejects an overload that both references a PIN hash and compares the plaintext input against `pin_code`; and rejects a staging set that omits an active staff row.
5. It forces a postflight mismatch to verify the transaction rolls back staff PIN fields, tenant license, and session changes.
6. It then executes the same staged rotation twice in one database session, snapshots rows after the first run, and asserts the second run changes none of those snapshots.
7. It verifies all live `public.pin_sessions` rows for the target tenant were soft-revoked by setting `deleted_at`. It does not physically delete sessions or other records.
8. The runner prints only phase outcomes. This isolated fixture does not validate application-wide role routes and does not replace FIX-005's migration-chain repair.

For a Unix local PostgreSQL service, the CI example uses `PGHOST=/var/run/postgresql`, the local runner's database role, and an empty local database. Never use production connection strings or production credentials.

## Secure handover

1. Deliver each staff member's PIN individually via an approved authenticated channel, such as a secure one-time secret-sharing link. Do not send multiple staff PINs in a group message.
2. Deliver the tenant license only to the owner/authorized administrator using the approved secret manager. Do not expose it in a public frontend variable.
3. Require each staff member to acknowledge receipt through the approved workflow. Instruct them not to forward or reuse the PIN and not to store it in unapproved locations.
4. On suspected exposure, follow the approved access recovery process and issue a new credential. Do not delete staff or clinic records as part of rotation.
5. After successful handover and owner confirmation, expire one-time links and temporary credential material according to policy.

## Production execution — explicit owner approval required

Only after FIX-002 is merged and its login/authentication tests pass:

1. Review the exact final SQL diff and successful isolated rehearsal evidence.
2. Obtain written owner approval for the target tenant, staff scope, license rotation, execution window, and rollback/recovery procedure.
3. Confirm current backups and a tested recovery path. Verify the staging set includes every active, non-deleted user in the target tenant and no user from any other tenant.
4. Execute the prepared script from an approved privileged session with staging values supplied through the reviewed secure client. Do not paste credentials into committed files or reports.
5. The transaction updates the PIN hash and clears the legacy plaintext PIN field, updates the tenant license, and sets `deleted_at = now()` for every currently live `pin_sessions` row belonging to the rotated tenant. Its postflight check refuses to commit if any live PIN session remains.
6. Confirm all relevant staff can authenticate with the new credentials and that the old PINs no longer authenticate. Verify the new tenant license works and the old license no longer does.
7. If any check fails, stop and use the owner-approved recovery procedure. Do not weaken RLS, disable rate limiting, delete rows, or return to default credentials.

## Reversibility and idempotence

The SQL uses guarded updates in a transaction and does not physically delete records or disable RLS. It requires exactly one tenant and a staged hash for every active, non-deleted staff user in that tenant. Reapplying the same staged values leaves staff and tenant rows unchanged, and already-revoked sessions remain revoked. A later rotation requires a new approved staging set; never reuse previously issued PINs.
