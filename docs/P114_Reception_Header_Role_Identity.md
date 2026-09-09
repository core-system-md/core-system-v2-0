# CORE SYSTEM v2.1 — P114 Reception Header Role Identity

## Claim
The active Reception route permits `receptionist`, `clinic_admin`, and `super_admin`, so the Reception shell must not identify every authenticated user as a receptionist.

## Evidence
- `src/router.tsx` authorizes `/reception` for `receptionist`, `clinic_admin`, and `super_admin`.
- `src/features/reception/ReceptionLayout.tsx` previously hard-coded the role label `موظف الاستقبال` and a fixed avatar initial `س`.
- `src/shared/store/authStore.ts` already exposes the authenticated user role plus `full_name` and `full_name_ar`; no new data source or access contract is required.

## Classification
`CONFIRMED`

## Surgical repair
- Reception header role text now derives from the existing authenticated role.
- Display name/initial use the existing `full_name_ar`/`full_name` fields with a safe fallback.
- Idle timeout, routing, permissions, RLS, Auth, Supabase RPCs, DB schema, scoring, and business behavior are unchanged.

## Verification target
- GitHub Actions Build Test must pass build, TypeScript, and tests.
- Vercel Production deployment must reach `READY`.
- Deployment-scoped Production runtime `error/fatal` check must return no entries.

## Confidence
`HIGH`
