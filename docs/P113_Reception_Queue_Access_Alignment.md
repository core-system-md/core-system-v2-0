# CORE SYSTEM v2.1 — P113 Reception Queue Access Alignment

## Claim
The active Reception queue must not expose a navigation path to a clinical session screen that its verified Reception access contract does not authorize.

## Evidence
- `src/features/reception/ReceptionDashboard.tsx` previously passed `onSelectSession={(id) => navigate(`/doctor/session/${id}`)}` into `LiveQueueBoard`.
- `src/router.tsx` authorizes `/doctor/*` for `doctor`, `clinic_admin`, and `super_admin`; `receptionist` is intentionally excluded under the established P84 session-detail scope.
- `src/features/doctor/DoctorSessionView.tsx` independently rejects any role outside `doctor`, `clinic_admin`, and `super_admin`, confirming that Reception does not have an evidenced clinical-session-detail contract there.
- Production `clinic_visit_sessions` SELECT RLS permits `receptionist` at the row layer, but that does not by itself establish a UI contract for clinical session-detail access.
- `docs/Blueprint.md` identifies `LiveQueueBoard` as a Reception queue surface; it does not establish Reception access to the Doctor clinical session view.

## Classification
`CONFIRMED`

## Surgical repair
- Removed the unused `useNavigate` import and `navigate` instance from `ReceptionDashboard`.
- Removed only the `onSelectSession` callback from the Reception `LiveQueueBoard` invocation.
- `LiveQueueBoard` itself still selects the queue item through its existing `queueStore` selection behavior.
- No router, permission matrix, RLS, Auth, DB schema, RPC, scoring, or clinical-detail access contract was changed.

## Verification target
- Vercel Production build must complete successfully.
- Production deployment must reach `READY`.
- Deployment runtime error/fatal check must return no entries in the checked window.
- The next roadmap entry must record the verified scope and any remaining browser-E2E limitations.

## Confidence
`HIGH`
