# P116 — Admin Surface Header Role Identity

## Claim
The active Clinic Admin shell could display the wrong role identity when the authenticated viewer is `super_admin` and no name is available.

## Evidence
- `src/router.tsx` authorizes `/admin` for `clinic_admin` and `super_admin`.
- `src/shared/store/authStore.ts` provides the authenticated role plus `full_name` and optional `full_name_ar`.
- Before P116, `src/features/clinic-admin/AdminLayout.tsx` used `user?.full_name || "مدير العيادة"`, which made the fallback role identity incorrect for a super-admin viewer.
- P116 changed only `AdminLayout.tsx`: added a static Arabic role map for `clinic_admin` / `super_admin`, and derives the greeting display name from `full_name_ar`, then `full_name`, then the role label.
- No route, permission, Auth, RLS, Supabase, schema, RPC, scoring, financial, or business-rule contract changed.
- GitHub Actions Build Test run `34335680348` completed successfully for build, TypeScript, and tests.

## Classification
`CONFIRMED`

## Confidence
`HIGH`

## Implementation
Commit: `3a7224cbdf8bd9298b32efc40685fbbdbfcbd084`

## Production deployment verification
Not independently verified in this stage because the connected Vercel deployment-list scope returned `403 Forbidden`. No claim of Production deployment readiness is made here.
