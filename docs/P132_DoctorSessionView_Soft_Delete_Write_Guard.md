# P132 — DoctorSessionView Clinical Notes Soft-Delete Write Guard

## Claim → Evidence → Classification → Confidence

### 1. The active DoctorSessionView clinical-notes persistence path lacked the soft-delete predicate
**Evidence:** `src/features/doctor/DoctorSessionView.tsx` function `persistNotes()` directly updated `clinic_visit_sessions` using `sessionId` and `tenantId` without `deleted_at IS NULL`.

**Classification:** CONFIRMED
**Confidence:** HIGH

### 2. The missing predicate is part of the existing P130 session write boundary
**Evidence:** Production `visit_sessions_update` requires tenant isolation, the existing role/doctor ownership rules, and `deleted_at IS NULL` in both `USING` and `WITH CHECK`. `persistNotes()` writes to the same table under the existing Doctor Session surface and its `edit_sessions` UI guard.

**Classification:** CONFIRMED
**Confidence:** HIGH

### 3. The repair is limited to the write predicate
**Evidence:** P132 adds `.is('deleted_at', null)` to the existing `clinic_visit_sessions` UPDATE in `persistNotes()`. No clinical-note structure, permissions, routing, Auth, RLS, RPC, schema, scoring, AllergyGate, CloseSession, or archive behavior was changed.

**Classification:** CONFIRMED
**Confidence:** HIGH

## Implementation
- Commit: `97a0480636f807932928eaac4cb0051cf6cc332f`
- File: `src/features/doctor/DoctorSessionView.tsx`
- Change: `persistNotes()` now filters the session update with `.is('deleted_at', null)`.

## Verification boundary
- Production RLS session write boundary remains verified from P130.
- CI must pass build, TypeScript, and Vitest on the Roadmap-tracked source before P132 closure.
- Exact-commit Vercel Production verification remains required where the current Vercel deployment-rate limit permits.
