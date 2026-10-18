# FIX-002 follow-ups — approval-gated only

This document is a plan, not executable migration SQL. FIX-002 retains pin_code values and the legacy password column. It does not purge attempt-log history or modify Supabase Auth. None of the statements below may be executed until the owner approves the exact statement and a separate migration / rollback plan is reviewed.

## Current FIX-002 scope

- Build and verify pin_hash as $2a$ bcrypt with extensions.crypt / extensions.gen_salt.
- Restrict ordinary client roles from reading pin_code, pin_hash, password.
- Ensure new pin_attempt_log.attempted_pin values are the fixed four-character redaction marker ****. Production defines the column NOT NULL, and older migration chains use VARCHAR(4).
- Preserve existing legacy values, historical rows, RLS, write privileges, trigger, and role-update RPC.

## Separate approval-gated migrations

### A. Null retained legacy PIN values

Only after a verified backup, successful rollout, a measured login success window, and written owner approval for the exact operation:

\`\`\`sql
-- PROPOSAL ONLY — do not run as part of FIX-002.
UPDATE public.clinic_users
SET pin_code = NULL
WHERE pin_code IS NOT NULL;
\`\`\`

This irreversibly removes the current legacy PIN values from live rows. Before approval, confirm every active account has a valid $2a$ hash and both live login overloads pass correct/wrong PIN tests. This may also affect any uninspected legacy integration; audit first.

### B. Drop the legacy PIN column

Only after A is separately approved and verified, and code/schema searches prove no remaining dependency:

\`\`\`sql
-- PROPOSAL ONLY — destructive schema change.
ALTER TABLE public.clinic_users DROP COLUMN pin_code;
\`\`\`

This is a separate breaking migration. Do not combine it with FIX-002 or run it before all consumers and rollback requirements are reconciled.

### C. Drop the legacy password column

Only after inspecting all branches, Auth synchronization code, triggers, policies, SQL functions, generated database types, and external integrations, and receiving written approval:

\`\`\`sql
-- PROPOSAL ONLY — destructive schema change.
ALTER TABLE public.clinic_users DROP COLUMN password;
\`\`\`

The column is not a substitute for Supabase Auth credentials. This proposal does not alter or delete any Supabase Auth account.

### D. Historical plaintext attempt-log cleanup

FIX-002 stops adding PINs to attempted_pin but does not purge historical records. Any removal requires an owner-approved retention period, audit/legal review, and a separate migration. Example only:

\`\`\`sql
-- PROPOSAL ONLY. The retention horizon must be approved first.
DELETE FROM public.pin_attempt_log
WHERE attempted_pin IS NOT NULL
  AND created_at < :approved_cutoff_timestamp;
\`\`\`

Do not execute without a named cutoff, row-count preview, backup/retention confirmation, and written approval for the exact DELETE predicate.

### E. Repository history and copied artifacts

Historical PIN/password literals in Git history, backups, downloaded archives, logs, or chat exports are a separate incident-response workstream. Do not rewrite shared Git history or delete archival material under FIX-002. First locate every copy, rotate any credentials that may have been disclosed, determine retention obligations, and obtain explicit approval for the exact removal plan.

## Required preconditions for any later destructive step

1. FIX-002 is merged and its deployed migration is verified using read-only catalog checks.
2. Correct/wrong PIN behavior has passed through both actual create_pin_session overloads.
3. All four application roles complete route and workflow regression on an isolated stack.
4. A deployment/rollback plan and recoverable backup exist.
5. The owner approves the exact SQL statement and scope in writing.

No destructive step above is authorized merely because it appears in this runbook.
