# P133 — CloseSession Soft-Delete Write Guard

## Claim → Evidence → Classification → Confidence

### 1. The active CloseSession path directly updated clinic_visit_sessions without deleted_at IS NULL
**Evidence:** `src/features/doctor/CloseSession.tsx` built an UPDATE scoped by `sessionId` and `tenantId`, and for doctors by `doctor_id`, but did not filter `deleted_at`.

**Classification:** CONFIRMED
**Confidence:** HIGH

### 2. The missing predicate is within the established session soft-delete write boundary
**Evidence:** Production `visit_sessions_update` already requires `deleted_at IS NULL` in both `USING` and `WITH CHECK`, together with the existing tenant/role/doctor ownership semantics. CloseSession is governed in the UI by `edit_sessions` and uses the established doctor ownership condition.

**Classification:** CONFIRMED
**Confidence:** HIGH

### 3. The repair is surgical
**Evidence:** P133 adds `.is('deleted_at', null)` to the existing `clinic_visit_sessions` UPDATE predicate only. No session lifecycle semantics, permission matrix, routing, Auth, RLS policy, schema, RPC, or archive behavior was changed.

**Classification:** CONFIRMED
**Confidence:** HIGH

## Implementation
- Commit: `27dd34c10bab7738afb78897351ca463e7ca0fd8`
- File: `src/features/doctor/CloseSession.tsx`
- Change: session-close UPDATE now filters `deleted_at IS NULL`.

## Verification boundary
- Production RLS soft-delete write boundary remains verified from P130.
- CI must pass build, TypeScript, and Vitest on the final Roadmap commit before P133 closure.
- Exact-commit Vercel Production verification remains pending while Vercel deployment rate limiting applies.
