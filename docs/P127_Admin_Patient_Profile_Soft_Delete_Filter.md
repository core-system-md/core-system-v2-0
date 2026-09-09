# P127 — Admin Patient Profile Soft-Delete Filter

## Claim
The active Clinic Admin Patient Directory filtered soft-deleted `clinic_patients` rows but did not filter soft-deleted `patient_longitudinal_profiles` rows. P127 adds the existing soft-delete predicate to the profile query so deleted longitudinal profiles cannot feed the active patient directory.

## Evidence
- `docs/Constitution.md` states that soft-deleted operational rows must be queried with `deleted_at IS NULL`.
- The Constitution explicitly includes `patient_longitudinal_profiles` in the operational soft-delete model.
- Production confirms `public.patient_longitudinal_profiles.deleted_at` exists as a nullable `timestamp with time zone` column.
- `src/features/clinic-admin/AdminPatientsPage.tsx` already filtered `clinic_patients` with `.is('deleted_at', null)` but the `patient_longitudinal_profiles` query previously stopped at `.eq('tenant_id', tenantId)`.
- P127 adds only `.is('deleted_at', null)` to the existing profile query. Tenant filtering, selected fields, patient/profile join-by-map behavior, LTV conversion, CORE display, permissions, and all business behavior remain unchanged.
- No schema, migration, RLS, Auth, RPC, scoring, financial, routing, or permission contract changed.

## Verification
- Implementation commit: `291e8d3136d66d9d748bfff2bdb4c3f1cfdc1087`.
- GitHub Actions Build Test run: `34342803619`.
- CI completed successfully for build, TypeScript, and Vitest.
- GitHub Vercel status for this exact commit reports `Deployment rate limited — retry in 24 hours`; therefore no P127 Production deployment is claimed yet.

## Classification
- Contract mismatch: `CONFIRMED`
- Implementation: `CONFIRMED`
- CI verification: `CONFIRMED`
- Production verification: `INSUFFICIENT EVIDENCE`
- Overall P127 status: **IMPLEMENTED — PRODUCTION VERIFICATION BLOCKED**
- Confidence: `HIGH` for source/DB/CI evidence; `INSUFFICIENT` for Production evidence.

## Scope protection
No patient-status localization was introduced because no established Arabic status mapping was evidenced in active code. No changes were made to patient tenant RLS or longitudinal profile schema.