# P139 — License Validator Device Soft-Delete Write Guard

## Claim → Evidence → Classification → Confidence

### 1. The active license-validator device heartbeat update omitted the existing soft-delete predicate
**Evidence:** `supabase/functions/license-validator/index.ts` first reads `tenant_devices` with `.is('deleted_at', null)`, but its existing-device `last_seen_at` UPDATE was scoped only by `id`.
**Classification:** CONFIRMED
**Confidence:** HIGH

### 2. The repair preserves the existing device/license contract and closes the stale-row update window
**Evidence:** Commit `4340344beeac700be6e7504403e3d9e7efc1670c` adds `.is('deleted_at', null)` to the existing `tenant_devices` UPDATE. No request fields, response contract, device-count rule, tenant validation, Auth flow, or schema was changed.
**Classification:** CONFIRMED
**Confidence:** HIGH

### 3. Automated validation is pending
**Evidence:** The implementation commit was created on `main`; GitHub Actions had not yet produced a check run at the time this evidence file was recorded.
**Classification:** INSUFFICIENT EVIDENCE
**Confidence:** HIGH

## Scope
- Active Supabase Edge Function only: `supabase/functions/license-validator/index.ts`.
- No migration or database schema change.
- No RLS/Auth/RPC contract change.
- No permission-matrix change.
- No scoring or financial logic change.
- No archive changes.
