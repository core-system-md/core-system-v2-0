# P126 — Super Admin Billing Arabic Clinic Name Alignment

## Claim
The active Super Admin clinic subscription-management surface displayed `clinic_name` only, while the established active Super Admin tenant surfaces prefer `clinic_name_ar` and fall back to `clinic_name`. P126 aligns this display path without changing stored values or subscription behavior.

## Evidence
- `src/features/super-admin/TenantRegistry.tsx` displays `clinic_name_ar || clinic_name` for the clinic identity.
- `src/features/super-admin/TenantDetailPanel.tsx` displays `clinic_name_ar || clinic_name` for the tenant identity.
- `src/features/super-admin/TenantBillingAdminPage.tsx` previously selected only `clinic_name` and rendered `clinic_name || name || id`.
- The Blueprint defines both `clinic_name` and optional `clinic_name_ar` on `master_tenants`.
- P126 changes only the presentation/data-selection path in `TenantBillingAdminPage.tsx`:
  - selects `clinic_name_ar`;
  - stores it in the local tenant row type;
  - renders `clinic_name_ar || clinic_name || name || id`.
- Subscription tier values, tier updates, activation behavior, permission guard, tenant filtering, soft-delete handling, and all database contracts remain unchanged.

## Verification
- Implementation commit: `9bf6ca37bce78d5aba30a3afee62bd803d91ea74`.
- GitHub Actions Build Test run: `34342314177`.
- CI completed successfully for build, TypeScript, and Vitest.
- Production verification is pending because Vercel is still subject to the active deployment-rate limit previously reported for P125.

## Classification
- Implementation: `CONFIRMED`
- CI verification: `CONFIRMED`
- Production verification: `INSUFFICIENT EVIDENCE`
- Overall P126 status: **IMPLEMENTED — PRODUCTION VERIFICATION BLOCKED**
- Confidence: `HIGH` for source and CI evidence; `INSUFFICIENT` for Production evidence.

## Scope protection
No schema, migration, RLS, Auth, RPC, permission, scoring, financial, routing, or business-rule change was introduced.