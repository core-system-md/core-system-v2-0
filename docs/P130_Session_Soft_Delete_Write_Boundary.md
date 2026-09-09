# P130 — Session Soft-Delete Write Boundary

## Claim
Active clinic session mutations must not update logically deleted `clinic_visit_sessions` rows.

## Evidence
- `docs/Constitution.md` defines soft-delete semantics as `deleted_at`: `NULL = active`, non-NULL = soft-deleted, and requires active queries to filter `deleted_at`.
- Existing Production policy `visit_sessions_update` authorized updates by tenant/role/doctor ownership but did not require `deleted_at IS NULL`.
- Production schema contains `clinic_visit_sessions.deleted_at`.
- Production migration `p130_session_soft_delete_write_boundary` recreated `visit_sessions_update` with `deleted_at IS NULL` in both `USING` and `WITH CHECK` while preserving the existing tenant/role/doctor predicates.
- Production read-back confirmed the resulting policy contains `deleted_at IS NULL` in both predicates.
- Active client mutations in `src/core/queue/sessions.mutations.ts` now add `.is('deleted_at', null)` to status, score, doctor-assignment, and room-assignment updates as defense in depth.

## Classification
`CONFIRMED`

## Confidence
`HIGH`

## Verification status
- Production RLS change: VERIFIED by direct policy read-back.
- Client source change: VERIFIED by committed source.
- CI: pending for the final repository HEAD at time of this document.
- Vercel Production verification: pending / may be rate-limited by platform deployment limits.

## Guardrails preserved
No schema shape change, RPC signature change, Auth change, permission-matrix change, scoring change, or financial-unit change was introduced. Existing access semantics are unchanged except that logically deleted sessions are no longer writable.
