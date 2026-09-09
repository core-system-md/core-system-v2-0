# P137 — Offline Sync Hard-Delete Guard

## Claim
The active offline synchronization engine no longer performs physical DELETE operations for queued offline delete mutations.

## Evidence
- Active source: `src/core/offline/SyncEngine.ts`.
- The delete branch uses a verified `SOFT_DELETE_TABLES` allowlist.
- Supported tables are updated with `deleted_at = NOW()` semantics and `.is('deleted_at', null)`.
- Tables without a verified soft-delete contract are rejected explicitly.
- Create and update synchronization paths are unchanged.
- Regression coverage exists in `tests/offline-sync.test.ts` for supported soft-delete and unsupported-table rejection.
- Implementation commit: `537f3531117fa68bb8c9eb79a5dbf4a6cf67816a`.
- Regression-test commit: `45812852978de055ab2bee09f6424e7f943cead7`.
- CI run `34348263727` passed Build, TypeScript, and Vitest.
- Vercel Production deployment `dpl_APgpThS5H5qzdXtgNmnLfRy1onQ6` is `READY` for implementation commit `537f3531117fa68bb8c9eb79a5dbf4a6cf67816a`.

## Classification
`CONFIRMED`

## Confidence
High — implementation, regression test, CI, and Production deployment evidence all agree.

## Scope / non-changes
No schema, RLS, Auth, RPC signature, permission matrix, CORE Score weighting, financial-subunit contract, or business rule was changed. Archive content was not modified.

## Closure
P137 is `CLOSED — CONFIRMED`.
