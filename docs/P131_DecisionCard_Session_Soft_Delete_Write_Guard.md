# P131 — DecisionCard Session Soft-Delete Write Guard

## Claim → Evidence → Classification → Confidence

### 1. The active DecisionCard had a direct session update path without a soft-delete predicate
**Evidence:** `src/components/doctor/DecisionCard.tsx` contained `supabase.from('clinic_visit_sessions').update(...)` in `handleSave()`, scoped by `id` and `tenant_id` but not `deleted_at IS NULL`.

**Classification:** CONFIRMED
**Confidence:** HIGH

### 2. The missing predicate belonged to the same active session write boundary established by P130
**Evidence:** P130 established the Production `visit_sessions_update` policy with `deleted_at IS NULL` in both `USING` and `WITH CHECK`, preserving tenant/role/doctor ownership semantics. The same table and the same existing `edit_sessions` UI permission govern this `handleSave()` path.

**Classification:** CONFIRMED
**Confidence:** HIGH

### 3. The repair is surgical and does not alter the Doctor business contract
**Evidence:** The only code change in P131 is adding `.is('deleted_at', null)` to the existing `clinic_visit_sessions` update predicate in `DecisionCard.handleSave()`. No scoring formula, PAR values, permissions, routing, Auth, RLS, schema, RPC contract, or archive file was changed.

**Classification:** CONFIRMED
**Confidence:** HIGH

### 4. Database authorization remains authoritative
**Evidence:** Production `visit_sessions_update` already requires `deleted_at IS NULL` in both `USING` and `WITH CHECK`. The client-side predicate aligns the active Doctor path with that existing Production boundary and prevents a misleading successful/no-row update attempt against a logically deleted session.

**Classification:** CONFIRMED
**Confidence:** HIGH

## Implementation
- Commit: `9398650f983317e723b36fa2cf8822fe4a1416b7`
- File: `src/components/doctor/DecisionCard.tsx`
- Change: `handleSave()` now includes `.is('deleted_at', null)` on the existing tenant-scoped session update.

## Verification boundary
- Production RLS baseline from P130 remains verified.
- CI verification for the P131 source must pass build, TypeScript, and Vitest before closure.
- Exact-commit Vercel Production verification remains separately required where platform rate limits permit.
