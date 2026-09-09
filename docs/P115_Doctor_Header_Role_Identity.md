# P115 — Doctor Surface Header Role Identity

## Claim → Evidence → Classification → Confidence

### Claim
The active Doctor surface is routed to `doctor`, `clinic_admin`, and `super_admin`, so its header must not falsely label every authenticated viewer as a doctor.

### Evidence
- `src/router.tsx` allows `doctor`, `clinic_admin`, and `super_admin` on `/doctor`.
- `src/features/doctor/DoctorLayout.tsx` previously rendered a fixed `طبيب` label regardless of the active role.
- The same `authStore` already exposes the authenticated user's role and is used by the component for the existing idle-lock behavior.

### Classification
CONFIRMED

### Confidence
HIGH

## Implementation
The fixed header role label was replaced with a small static mapping from the existing authenticated role to its Arabic label. No route, permission, Auth, RLS, Supabase, schema, scoring, or clinical behavior was changed.

Implementation commit: `2e26b5d99d909122f5eb1a1dec8f33a416ca36d7`.

## Verification requirements
- GitHub Actions Build Test must pass build, TypeScript, and tests.
- Vercel Production deployment for the implementation commit must reach `READY`.
- Deployment-scoped runtime error/fatal inspection must return no entries.
