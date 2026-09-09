# P128 — Admin Schedule Soft-Delete Filter

## Claim
The active Clinic Admin Schedule queried `master_agenda_events` by tenant and date but did not exclude soft-deleted events. P128 adds the existing soft-delete predicate so deleted agenda events cannot appear in the active schedule.

## Evidence
- `docs/Constitution.md` requires operational queries to filter soft-deleted rows with `deleted_at IS NULL`.
- `master_agenda_events` is an operational scheduling table in the Constitution/Blueprint.
- Production confirms `public.master_agenda_events.deleted_at` exists as a nullable `timestamp with time zone` column.
- The active Reception agenda contract already filters `master_agenda_events` with `a.deleted_at IS NULL`.
- `src/features/clinic-admin/AdminSchedulePage.tsx` previously queried `master_agenda_events` without a `deleted_at` predicate.
- P128 adds only `.is('deleted_at', null)` to that existing event query. Tenant filter, selected fields, date boundaries, ordering, doctor/room/patient queries, displayed statuses, time formatting, permissions, and all scheduling semantics remain unchanged.
- No schema, migration, RLS, Auth, RPC, scoring, financial, routing, or permission contract changed.

## Verification
- Implementation commit: `52e55c7ff6e58a1a36b02321b0deee684b160d39`.
- GitHub Actions Build Test run: `34343102871`.
- CI verification is required before closure; Production deployment verification is subject to the active Vercel deployment-rate limit observed for the previous commits.

## Classification
- Contract mismatch: `CONFIRMED`
- Implementation: `CONFIRMED`
- Production verification: `INSUFFICIENT EVIDENCE` until the exact commit is deployed and checked.
- Overall P128 status: **IMPLEMENTED — PRODUCTION VERIFICATION PENDING**
- Confidence: `HIGH` for source/DB/contract evidence.

## Scope protection
No timezone/day-boundary reinterpretation, status localization, patient-name localization, or schedule business-rule change was introduced.