# P112 — Role-less Auth Redirect Loop

## Claim
An authenticated user without a resolved role must not be trapped in a `/login` ↔ `/login/roles` redirect loop.

## Evidence
- `src/router.tsx` previously redirected authenticated users with `!user.role` from `AuthWrapper` to `/login/roles`.
- The `/login/roles` route itself redirects to `/login`.
- This created a deterministic redirect cycle for the role-less authenticated state.
- `getDefaultRoute()` already defines `null`/undefined role fallback as `/login`; no active role-selection screen/contract was evidenced.
- The surgical fix removes only the role-less redirect from `AuthWrapper`. Auth, session state, role assignment, permissions, RLS, Supabase, and business rules were not changed.

## Implementation
- Commit: `b6da43581e8c64fff941325276ca59119798eb1a`
- File changed: `src/router.tsx`
- Change: `AuthWrapper` now waits for boot/checking-session completion and renders the existing `AuthScreen`; it no longer redirects based on a missing role.

## Verification
- Vercel Production deployment: `dpl_CPMTQb8mPBkbXDDtHaZRsTU6EvCA`
- Commit deployed: `b6da43581e8c64fff941325276ca59119798eb1a`
- State: `READY`
- Build: `tsc -b && vite build` completed successfully.
- Build output: no failure; only the existing chunk-size warning remained.
- Production runtime `error`/`fatal` logs for the checked 24-hour deployment window: none.

## Classification
`CONFIRMED`

## Confidence
`HIGH`

## Scope safety
No database migration, RPC, RLS, Auth configuration, permission matrix, tenant boundary, scoring, financial contract, or archive content was changed.