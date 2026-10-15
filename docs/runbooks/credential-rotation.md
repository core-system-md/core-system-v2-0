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

## Generate credentials outside the repository

1. Select a cryptographically secure password manager or credential generator approved by the owner. Generate a numeric PIN of at least six digits per active, non-deleted staff account; eight digits is preferred while the approved FIX-002 login contract permits it.
2. Generate all PINs independently. Check uniqueness before hashing; do not reuse a value across staff members. Do not use sequential, repeated, tenant-derived, employee-derived, or publicly documented values.
3. Generate a new, high-entropy tenant license key (at least 32 random bytes, encoded with a URL-safe format) using the approved secret manager. Never include actual credentials in source files, SQL text, terminal arguments, logs, tickets, CI output, or this document.
4. Save plaintext PINs and the new license key only in the approved secret manager / secure delivery workflow. Do not write plaintext PINs to a staging file. Create the hash values through the hashing mechanism confirmed by FIX-002; the staging rows contain hashes and PIN lengths only.
5. Assign each staged PIN to an unambiguous staff row by the verified database user ID and tenant ID. Do not rely only on employee names or email addresses.

## Isolated rehearsal

1. Start a disposable database using the repository's local Supabase workflow (`supabase start`). Never use the production project URL or production credentials.
2. Open one privileged database session and run `supabase/runbooks/prepare_credential_rotation.sql` in that same session.
3. Use a trusted database client with parameter binding to populate the temporary tables `mdcore_rotation_staff_stage` and `mdcore_rotation_license_stage` in that same session. The staff stage schema is: `tenant_id UUID`, `staff_id UUID`, `pin_hash TEXT`, `pin_length SMALLINT`; the license stage schema is: `tenant_id UUID`, `new_license_key TEXT`. Do not place raw PINs in SQL text or persistent staging.
4. Inspect target tenant and active-staff counts without returning credential values. Verify the stage includes every active, non-deleted user for that one tenant and only that tenant.
5. Review `supabase/runbooks/apply_credential_rotation.sql` before each rehearsal. It is guarded to stop unless the FIX-002 hashed-PIN contract is present. Execute only on the isolated database after that prerequisite is fulfilled.
6. Run the apply script twice with the same in-session stage values. The second application must be idempotent (no further row changes), and postflight checks must confirm every staged user's hash is stored, `pin_code` is NULL, and the tenant license matches the staged value. Do not print the values while verifying.
7. Run the application's migration, build, role-route, and authentication regression suites on the isolated stack. Verify all four roles and their allowed routes. Record command results and sanitized evidence only; never record credentials.

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
