# P117 — Patient LTV Display Unit Alignment

## Claim
The active Clinic Admin patient directory displayed `patient_longitudinal_profiles.total_revenue_subunits` directly in the LTV column, exposing stored subunits instead of the established display amount.

## Evidence
- `src/features/clinic-admin/AdminPatientsPage.tsx` reads `total_revenue_subunits` from `patient_longitudinal_profiles` and labels the column `LTV`.
- `src/features/clinic-admin/RevenueCards.tsx` uses the existing `subunitsToDisplay()` utility for the same financial-unit convention in active revenue UI.
- P117 changed only the patient-directory LTV presentation to `subunitsToDisplay(profile?.total_revenue_subunits ?? 0)`.
- Stored values, database schema, financial calculations, tenant filters, permissions, Auth, RLS, RPCs, and business rules are unchanged.
- GitHub Actions is required to verify build, TypeScript, and tests for the resulting source state.

## Classification
`CONFIRMED`

## Confidence
`HIGH`

## Implementation
Commit: `e51df06a877ba64751f99fc78f213fa25bef27ab`
