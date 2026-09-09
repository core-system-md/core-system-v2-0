# P111 — Revenue Screen Permission Alignment

## Claim
The active Clinic Admin Revenue screen must use the established `view_invoices` permission contract.

## Evidence
- `docs/Master_Repair_Roadmap.md` records under P84 that clinic revenue uses `view_invoices`.
- `src/core/permissions/permissionMatrix.ts` defines the existing `view_invoices` permission for `super_admin`, `clinic_admin`, and `receptionist`; `doctor` does not receive it.
- Before P111, `src/features/clinic-admin/AdminRevenuePage.tsx` wrapped `RevenueCards` with `PermissionGuard required="view_analytics"`.
- P111 changed only that guard to `PermissionGuard required="view_invoices"`.
- Implementation commit: `501c76ec44c8a0fad5f4a1c9f61d6e63781614d5`.
- Vercel Production deployment for the commit: `dpl_51UBQ31vNCEWZnXj2pufLpyzGjkM` (`READY`).
- Vercel build completed successfully: TypeScript build plus Vite production build; `1971 modules transformed`.
- Build warnings were limited to the existing `esbuild@0.25.12` install-script allow-list warning and the standard Vite chunk-size warning.
- Deployment-scoped Production runtime verification returned no `error` or `fatal` entries in the checked 24-hour window.
- GitHub combined status for the implementation commit is `success` through Vercel.

## Classification
`CONFIRMED`

## Confidence
`HIGH`

## Scope protection
No DB, migration, RLS, Auth, tenant boundary, scoring, financial calculation, router, or permission-matrix semantics were changed. Only the existing screen guard was corrected to the already-established permission contract.

## Closure
P111 implementation and Production verification are complete. The Master Repair Roadmap must record this closure before treating the repair stage as administratively closed.
