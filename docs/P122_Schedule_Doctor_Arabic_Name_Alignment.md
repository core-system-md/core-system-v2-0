# P122 — Schedule Doctor Arabic Name Alignment

## Claim
The active Clinic Admin Schedule loaded doctor names from `clinic_users.full_name` only, while the established active Arabic clinic-management surfaces prefer `full_name_ar` and fall back to `full_name`.

## Evidence
- `src/features/clinic-admin/AdminSchedulePage.tsx` previously selected only `id, full_name` for doctors and rendered that value in the `الطبيب` column.
- Active `src/features/clinic-admin/StaffPerformance.tsx` already selects both name fields and uses `full_name_ar || full_name` for doctor presentation.
- P122 changes only the doctor display path in the schedule to select `full_name_ar` and prefer it with fallback to `full_name`.
- No scheduling timestamps, filtering semantics, database schema, RLS, Auth, permissions, RPCs, tenant boundary, scoring, financial values, routing, or business rules changed.

## Classification
`CONFIRMED`

## Confidence
`HIGH`

## Scope
UI name presentation only.

## Implementation
Commit: `ee320349c9f1e8cd1ba25504e108e30b20c88230`
