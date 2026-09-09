# P129 — Super Admin Billing Soft-Delete Update Guard

## Claim
The active Super Admin clinic subscription-management screen already excluded soft-deleted tenants during reads, but its subscription-tier and activation updates matched tenant rows by `id` only. P129 adds the existing `deleted_at IS NULL` predicate to both update paths so logically deleted tenants cannot be modified by stale UI state.

## Evidence
- Production confirms `public.master_tenants.deleted_at` exists as a nullable timestamp with time zone column.
- `TenantBillingAdminPage.tsx` reads active tenants with `.is('deleted_at', null)`.
- Before P129, both `updateTier()` and `activateTenant()` updated `master_tenants` with only `.eq('id', tenantId)`.
- The Constitution's soft-delete contract distinguishes active rows (`deleted_at IS NULL`) from logically deleted rows and requires active operational access to exclude deleted rows.
- P129 adds `.is('deleted_at', null)` to both existing update predicates. No update fields, permission guard, RLS, Auth, RPC, schema, subscription semantics, activation semantics, or UI labels were changed.

## Verification
- Implementation commit: `4264b21addfeb52a6e5f6cb5dbdc1a70c491454c`.
- GitHub Actions Build Test run: `34343447815`.
- CI completed successfully for build, TypeScript, and Vitest.
- Production deployment verification is pending for the exact commit; the project has an active Vercel deployment-rate limit affecting recent commits.

## Classification
- Contract mismatch: `CONFIRMED`
- Implementation: `CONFIRMED`
- CI verification: `CONFIRMED`
- Production verification: `INSUFFICIENT EVIDENCE` until the exact commit is deployed and verified.
- Overall P129 status: **IMPLEMENTED — PRODUCTION VERIFICATION PENDING**
- Confidence: `HIGH` for source/Production schema/CI evidence.

## Scope protection
No database migration, RLS policy, RPC, Auth, permission matrix, scoring, financial, routing, or business rule was changed.