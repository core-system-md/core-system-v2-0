# CORE SYSTEM v2.1 — MASTER REPAIR ROADMAP

## Source of truth
- `docs/Constitution.md` — immutable technical rules.
- `docs/Blueprint.md` — implementation architecture and DB contract.
- GitHub `main` — authoritative active code.
- Production Supabase `gobdznqbdaklkkqbkynx` — DB/runtime contract when inspected.
- Vercel Production — deployment/runtime state when inspected.

## Execution method
`Evidence First → Constitution First → Blueprint First → Minimal → Surgical → Verification Before Closure`

Report format: `Claim → Evidence → Classification → Confidence`.
Allowed classifications: `CONFIRMED | LIKELY | INSUFFICIENT EVIDENCE | NOT FOUND | NOT APPLICABLE`.

## Guardrails
- No invented business rules.
- No framework/state/auth/RLS redesign.
- No schema/RPC/RLS/Auth change outside an explicitly scoped, evidence-backed stage.
- No physical DELETE; use soft-delete when the table contract requires it.
- Financial values remain integer/bigint subunits.
- CORE weights remain APS 0.28, DRI 0.24, RVS 0.20, URI 0.15, TSI 0.13.
- Protected active Doctor files remain untouched unless directly scoped.
- Archive content is read-only unless explicit evidence-backed disposition is approved.
- No new npm dependency.
- No `git add .` / `git add -A`.

## Closed baseline
P0–P19, P22, P28, P30-B, P31, P32, P33, P35, P36, P38, P39-C, P40-B, P41-B, P42-E — CLOSED.

Additional closed repairs: P0-1, P0-2, P0-3, Reception PIN-session operations, Reception Queue Realtime Broadcast, Auth/JWT app_metadata alignment, Core Score authorization and LTV hardening, cron request/auth fixes, leakage RPC restoration, Doctor score path through CoreScoreEngine, production score-calculator JWT authorization, notification false-success repair, P54, P55, P59, P60, P61.

### P84 — Screen Permission & Session Access Reconciliation
`CLOSED — CONFIRMED`.
Active screen guards were aligned to the existing Blueprint permission model: clinic analytics uses `view_analytics`, clinic revenue uses `view_invoices`, and clinic staff uses `view_staff`. Doctor session list/detail now apply role scope consistently: doctors are restricted to their own sessions while `clinic_admin` and `super_admin` can access tenant sessions. Session close is guarded by `edit_sessions` and uses doctor ownership only for the doctor role. Production `clinic_visit_sessions` SELECT RLS was repaired to require current-tenant isolation plus either the administrative/reception roles or `doctor_id = auth.uid()`. Production read-back confirmed the resulting policy and the migration `20260908151404 / p84_session_select_role_boundary` is present. Archive remains unchanged.

### P85 — Patient Access Tenant Boundary
`CLOSED — CONFIRMED`.
Production evidence showed `clinic_patients.rls_patients_isolation` previously used `tenant_id IS NOT NULL`, while the Blueprint requires `tenant_id = get_current_tenant_id()`. Production migration `20260908153034 / p85_patient_rls_tenant_boundary` replaced the policy with the tenant boundary, and read-back confirmed the exact resulting policy. Repository migration `supabase/migrations/055_p85_patient_rls_tenant_boundary.sql` is present. Final verified source line has a READY Production deployment.

### P86 — Staff Identity & Session Write Boundaries
`CLOSED — CONFIRMED`.
Production evidence confirmed `clinic_users` previously exposed a tenant-only `FOR ALL` policy with no role-change protection and `clinic_visit_sessions` UPDATE did not constrain doctors to their own sessions or exclude completed sessions. Production migration `20260908204532 / p86_staff_session_write_boundaries` replaced the staff `FOR ALL` policy with tenant-scoped SELECT, admin-only INSERT/UPDATE, and DELETE denial; added the `BEFORE UPDATE` identity-protection trigger; and replaced session UPDATE authorization with current-tenant plus `(clinic_admin|super_admin|receptionist)` or `(doctor AND doctor_id = auth.uid() AND session_status <> 'completed')`. Production read-back confirmed the resulting policies and trigger. Repository migration `supabase/migrations/056_p86_staff_session_write_boundaries.sql` is present. Vercel Production deployment for commit `9f7366a21d8ee37f053dde6639e766d21f5ef284` was READY. The active reception PIN flow remains mediated by the existing verified RPC contract.

### P87 — Hard-Delete Governance Boundary
`CLOSED — CONFIRMED`.
Production RLS review established that permissive tenant `FOR ALL` policies would otherwise allow physical DELETE. The first deny policy was corrected to a `RESTRICTIVE` deny so it cannot be bypassed by existing permissive policies. Production read-back confirmed `rls_deny_hard_delete` with `cmd = DELETE`, `permissive = false`, and `USING (false)` across the targeted tenant operational tables. Repository migrations `supabase/migrations/057_p87_deny_hard_delete_tenant_data.sql` and `supabase/migrations/058_p87_hard_delete_restrictive_guard.sql` are present. Vercel Production deployment for commit `8189bdbae0fb17acfbdc515529aea091f15a7bdf` was READY.

### P88 — Super-Admin Role Assignment Boundary
`CLOSED — CONFIRMED`.
Production read-back of the P86 trigger showed that `clinic_admin` could still change another employee's role to `super_admin`, even though self-role changes were blocked. Production migration `p88_super_admin_role_boundary` tightened the trigger so any transition from or to `super_admin` is restricted to an existing `super_admin`. The active Staff Management UI now hides `super_admin` as an assignable option for non-super-admin users while preserving it for super-admin administration. Repository migration `supabase/migrations/059_p88_super_admin_role_boundary.sql` is present. Vercel Production deployment for commit `a5158baa7a234d7c8a3bc323055b14bd0cbbc12f` is `READY`.

### P89 — Kiosk Entry & Production PIN Path
`CLOSED — CONFIRMED` for the verified scope.
The active `PinPad` was found to use a mock doctor identity and a fake delayed success path. It was replaced with the existing production `loginWithPin()` authentication contract, including the existing server-side PIN/session flow and lock state. `AmbientKioskView` now opens the production PIN screen, and `/kiosk` is connected in the active router. Vercel Production deployment for cumulative commit `e77e1594fb3b4ca7e933bdf408a704dcdade2631` is `READY`. Blueprint-level `StaffAvatarRail` remains unimplemented because no verified active data/interaction contract was established; no fabricated roster behavior was added.

### P90 — Doctor Financial Dead-Code Removal
`CLOSED — CONFIRMED`.
`src/features/doctor/SimpleInvoice.tsx` was verified to have no active imports or router usage and exposed financial UI before its final action guard. It was removed from active Doctor features. Financial access remains in the existing protected billing surfaces; no DB financial contract was changed. Vercel Production deployment for cumulative commit `e77e1594fb3b4ca7e933bdf408a704dcdade2631` is `READY`.

### P91 — Staff Management Surface
`CLOSED — CONFIRMED`.
An active permission-gated `StaffManagement` surface was added under Clinic Admin Staff and exposed through `AdminStaffPage`. It supports editing existing `clinic_users` records for name, Arabic name, phone, specialization, role, and active state. Access requires `edit_staff`; existing RLS/trigger boundaries remain authoritative. No PIN/password values are exposed and no unsupported Auth-account creation flow was invented. Vercel Production deployment for the implementation was READY.

### P92 — Clinic Admin Analytics Data Integrity
`CLOSED — CONFIRMED`.
Active `AnalyticsOverview` previously used the count of currently active sessions as a fallback for the KPI `الزيارات اليوم`, which conflated two different measures. The fallback was removed; the KPI now uses the existing daily snapshot contract only. The snapshot query now excludes soft-deleted snapshots and reports query failures explicitly. Active `RevenueCards` now excludes soft-deleted analytics snapshots and invoices and surfaces data-query failures instead of silently rendering partial financial data. Production schema verification confirmed `deleted_at` exists on both `analytics_daily_snapshots` and `clinic_invoices`. No schema, RPC, RLS, Auth, or financial-subunit contract was changed. Latest source commits are `2fbdff76e99637d80553233aefcf47df26371302` and `f16666727a92cf44f02553b441285609335c4732`; the latter was the source HEAD before the subsequent feature-flag repairs. Vercel Production deployment `dpl_ETpMmtGodBro2fjLqYEUzSE5TU94` is `READY`, and its Production runtime error/fatal count is zero. GitHub Actions did not expose an independent workflow run for this direct `main` commit, so closure is based on source inspection, Production schema read-back, successful Vercel build/deployment, and Production runtime-error verification.

### P93 — Feature Flag Management Data Integrity
`CLOSED — CONFIRMED`.
The active Super Admin `FeatureFlagManager` now excludes `deleted_at IS NOT NULL` rows from operational reads, checks every seed insert for returned errors, awaits refresh before reporting success, and preserves the existing super-admin-only write contract. Production read-back confirmed 8 active and 6 soft-deleted `feature_flags` rows, with existing RLS restricting INSERT/UPDATE to `super_admin`. Implementation commit: `c845fd4cd7a3cb44893a80c55738f83a66a0c8a9`. Vercel Production deployment `dpl_DQCUc1sWqmSWkpDqqSGT2oCWyq3n` is `READY`; checked build error-only logs contained only the existing `esbuild@0.25.12` install-script warning, and no Production error/fatal runtime entries were found in the checked window. No DB schema, RPC, RLS, Auth, permission, scoring, or financial-unit contract changed.

### P94 — Feature Flag Consumer Soft-Delete Integrity
`CLOSED — CONFIRMED`.
The active `useFeatureFlag`/`useFeatureFlags` hooks and `featureFlagStore.fetchFlags` now exclude soft-deleted `feature_flags` rows before applying the existing tenant-specific-over-global precedence and tier validation. Production contains active and soft-deleted rows for the same global keys, so the filter is evidence-backed operational behavior. Implementation commits: `64642af7479def3ddac386461fcea0a770b638` and `3701ec14473e829dafff8311795e9ae1d6537d54`. Vercel Production deployment for the final store commit is `READY`; build error-only logs show no build failure, only the existing `esbuild@0.25.12` warning, and Production error/fatal runtime logs returned no entries for the deployment. No schema, migration, RPC, RLS, Auth, permission, scoring, or financial-unit contract changed.

### P95 — Revenue Chart Theme Token Integrity
`CLOSED — CONFIRMED`.
The active `RevenueCards` SVG chart previously hard-coded the primary color `#1B2A4A` and gray guide colors. Those semantic presentation values now use the existing CSS tokens `--primary`, `--border`, and `--muted-foreground`; revenue calculations, integer subunit handling, tenant/date/status filters, and financial contracts are unchanged. The canonical active stylesheet defines `--primary: 219 54% 20%` with the established dark-mode override. Implementation commit: `80cf3942ff2cad4abc295da63f5eb6bffc9b9edc`. Vercel Production deployment `dpl_3fteqTR8TgEaNaGBFJ8v6mvcgvWs` is `READY`. Build and deployment logs showed no build failure; the existing `esbuild@0.25.12` install-script warning remains the only error-only log item observed. P95 is therefore fully verified and closed.

### P96 — Super Admin Theme Token Alignment
`CLOSED — CONFIRMED`.
Three active Super Admin surfaces were aligned with the existing canonical `primary` token without changing data access, business logic, schema, RPC, RLS, Auth, permissions, scoring, or financial contracts: `TenantRegistry`, `TenantDetailPanel`, and `CoreRulesConfigManager`. Their previously hard-coded `#1B2A4A` presentation values were replaced with the existing semantic Tailwind/theme token forms (`text-primary`, `bg-primary`, `border-primary`, `hover:bg-primary/90`, and tokenized focus styles). Protected Doctor files, Archive files, and functional fallback literals were intentionally not changed. Implementation commits: `478d7fdb51b919999c8dbf8c1faa57df5f94b4e0`, `280b906519d445a4012adf4f8b0219a1f3d2e91e`, and `e9c20a3d6e4b23a991b917d560497c15476fc2f5`. Vercel Production deployments for all three source commits are `READY`; the final deployment is `dpl_6GLtytuXQUfUs4b5ZSyycu7Pc46c`. Its combined GitHub status is `success`, and the build error-only log contains no build failure; only the existing `esbuild@0.25.12` install-script warning and the standard chunk-size warning were observed. No Production runtime errors/fatals were found in the checked 24-hour window. P96 is fully verified and closed.

### P97 — Clinic Session RLS Evaluation Optimization
`CLOSED — CONFIRMED`.
Supabase Performance Advisor identified two active `clinic_visit_sessions` policies, `rls_sessions_select` and `visit_sessions_update`, for row-by-row re-evaluation of tenant/role/auth lookups. The policies were recreated with scalar `SELECT` wrappers around `get_current_tenant_id()`, `get_current_user_role()`, and `auth.uid()` so the existing authorization predicates remain unchanged while enabling statement-level evaluation optimization. Production read-back confirmed both policies and the migration `p97_session_rls_initplan_optimization` (`20260909074808`) is present. The Performance Advisor no longer reports the `auth_rls_initplan` finding; only the pre-existing unused-index advisories remain. Repository migration: `supabase/migrations/060_p97_session_rls_initplan_optimization.sql`. Vercel Production deployment for commit `8c93dc5774a03f64481ff9ca5636b9f7379c7a1f` is `READY`, and its Production runtime error/fatal check returned no entries. No schema, RPC signature, Auth, scoring, financial-unit, or business access semantics were changed.

### P98 — Tenant-Aware PIN Pad Theme Alignment
`CLOSED — CONFIRMED`.
The active `AmbientKioskView` already consumes the tenant `primaryColor`, while `PinPad` previously rendered a fixed `#1B2A4A → #243656` gradient and therefore ignored the tenant-specific primary color already available in `tenantStore`. `PinPad` now reads the existing `primaryColor` state and applies it to its background, preserving the current fallback `#1B2A4A`. PIN validation, lockout behavior, allowed-role checks, RPC contracts, and navigation behavior were unchanged. Implementation commit: `094c4e3dc469e89fbbae6b9bdae86dbe76c88d0b`. Vercel Production deployment `dpl_CzXxxuWCupdiYhYUER4DHVVD6M4M` is `READY`; the build completed `1971 modules transformed` with no build failure, and the only observed warning was the existing `esbuild@0.25.12` install-script allow-list warning. Production runtime-error verification returned no errors in the selected window.

### P99 — Tenant Store Console Cleanup
`CLOSED — CONFIRMED`.
The active `tenantStore` contained three debug-only `console.log` calls and a `DEBUG` trace comment in the tenant fetch/set path. Those diagnostics were removed while existing `console.error`/`console.warn` handling for invalid IDs, Supabase failures, missing tenants, and fetch exceptions was preserved. The existing tenant fallback/default values and data-access behavior remain unchanged; the asynchronous fallback fetch is now explicitly invoked with `void`. Implementation commit: `b4e7eb42be59f87533b6f4ba2a70ca67ef53e441`. Vercel Production deployment `dpl_EiVuqv8UsStpGrCxj38QKoTBRAeh` is `READY`; the Production build transformed `1971 modules`, completed successfully, and retained only the pre-existing `esbuild@0.25.12` install-script warning and standard Vite chunk-size warning. Production runtime-error verification returned no errors in the selected window.

### P100 — Financial RPC Direct-Execution Boundary
`CLOSED — CONFIRMED`.
Production inspection found `public.create_invoice(uuid, uuid, integer, integer, integer, text)` and `public.mark_invoice_paid(uuid, integer, uuid)` implemented as `SECURITY DEFINER` functions with direct `authenticated` EXECUTE privileges, while their active source usage was not found outside archived QuickInvoice and the current application exposes invoice access through permission-gated surfaces. Their function bodies and signatures were not rewritten. Production migration `p100_restrict_financial_rpc_execute` revoked `EXECUTE` for `authenticated` on both exact function signatures, leaving `postgres` and `service_role` as the remaining explicit ACL entries. Direct `pg_proc` read-back confirmed `authenticated` is absent from both ACLs. The Supabase security Advisor authenticated SECURITY DEFINER finding count decreased by two after the change. Repository migration: `supabase/migrations/061_p100_restrict_financial_rpc_execute.sql`. Vercel Production deployment for commit `e3e8c3ea471e819ecee7b18bdfec5863ffdc0be7` is `READY`; build error-only logs contain no build failure, only the existing chunk-size warning, and Production runtime-error verification returned no entries. A second application of the same named migration was intentionally not hidden: Production migration history now contains two timestamped rows with the name `p100_restrict_financial_rpc_execute` (`20260909075549` and `20260909075645`). No historical row was deleted or rewritten; this duplicate-name history item is tracked as reconciliation-only.

### P101 — User Lookup RPC Execution Hardening
`CLOSED — CONFIRMED`.
The legacy unused user-lookup SECURITY DEFINER RPC was restricted to internal execution after active-source inspection found no client caller. The Production ACL and migration history were verified, and the active authentication/user lookup contract remained unchanged. The repository and deployed source were synchronized without modifying Auth, RLS, tenant boundaries, or active user-management behavior.

### P102 — Audit Read Authenticated-Only
`CLOSED — CONFIRMED`.
Production `audit_trail.rls_audit_read` was tightened from a public-role SELECT policy to `TO authenticated` while preserving the existing current-tenant plus `clinic_admin/super_admin` predicate. Repository migration/documentation were synchronized and Vercel deployment for the verified source reached `READY` with no runtime errors in the checked window. No audit schema, tenant predicate, or permission model beyond the role boundary was changed.

### P103 — Internal SECURITY DEFINER Access Hardening
`CLOSED — CONFIRMED`.
The Production internal `is_super_admin()` and `prevent_protected_clinic_user_changes()` SECURITY DEFINER functions were verified as non-client RPC contracts: the first had no active application caller, while the second is trigger-only. Anonymous/authenticated EXECUTE was revoked and Production read-back confirmed only `postgres` and `service_role` retain execution. Security Advisor SECURITY DEFINER findings decreased accordingly. No function body/signature, RLS, Auth, or active role/permission semantics were changed. Repository evidence is documented in `docs/P103_Internal_Security_Definer_Access.md`.

### P104 — Queue RPC Anonymous Access Hardening
`CLOSED — CONFIRMED`.
Production `get_queue_for_tenant(uuid)` and `get_queue_with_details(uuid)` had no evidenced anonymous application caller. Their anonymous/PUBLIC execution privileges were removed while authenticated/service-role/postgres execution was preserved. Function bodies, signatures, tenant predicates, RLS, Auth, and active queue behavior were unchanged. Production ACL read-back and Security Advisor verification confirmed the expected reduction; the verified Vercel deployment reached `READY` with no Production runtime errors. Repository evidence is documented in `docs/P104_Queue_RPC_Anonymous_Access_Hardening.md`.

### P105 — Dead `validate_email_password` Execution Hardening
`CLOSED — CONFIRMED`.
Production `public.validate_email_password(jsonb)` is a legacy/dead SECURITY DEFINER RPC with no evidenced active application caller. The historical migration `035_drop_dead_functions.sql` explicitly documented the function as dead and dropped the earlier overload. Only the client-role EXECUTE ACL was restricted; the function body/signature and active authentication contract were unchanged. Production migration `20260909081742 / p105_restrict_dead_validate_email_password_execute` is registered. Final `pg_proc` read-back confirms `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`, and `postgres_execute=true`. `validate_license(...)` remains unchanged because it has an active caller. Supabase Security Advisor now reports 16 anonymous and 17 authenticated SECURITY DEFINER executable findings, with `validate_email_password(jsonb)` removed from both. Repository migration: `supabase/migrations/062_p105_restrict_dead_validate_email_password_execute.sql`; detailed evidence: `docs/P105_Dead_Validate_Email_Password_Execution_Hardening.md`.

### P106 — Unused `update_session_status` Execution Hardening
`CLOSED — CONFIRMED`.
Production `public.update_session_status(uuid,text,uuid,text)` has no evidenced active application caller. Repository search found no active direct RPC usage or active import/caller of `useUpdateSessionStatus`; the active session status mutation updates `clinic_visit_sessions` directly with an explicit tenant filter. Production migration `20260909082006 / p106_restrict_unused_update_session_status_execute` removed client-role EXECUTE while preserving `postgres` and `service_role`. Final ACL read-back confirms `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`, and `postgres_execute=true`. Security Advisor authenticated SECURITY DEFINER findings decreased from 17 to 16. Vercel Production deployment for the verified source commit `5a90972add2dd9a75336d7921d7565e65f4bfa8c` reached `READY`; no build failure or Production `error/fatal` runtime entries were found in the checked window. Repository migration: `supabase/migrations/063_p106_restrict_unused_update_session_status_execute.sql`; detailed evidence: `docs/P106_Unused_Update_Session_Status_Execution_Hardening.md`.

### P107 — Unused Queue RPC Authenticated Execution Hardening
`CLOSED — CONFIRMED`.
Active-source search found no active caller for `get_queue_for_tenant(uuid)` or `get_queue_with_details(uuid)`. P104 had removed anonymous/PUBLIC execution while preserving authenticated execution pending further evidence. P107 then removed authenticated/client-role EXECUTE for both exact signatures, preserving `postgres` and `service_role`. Production migration `20260909082053 / p107_restrict_unused_queue_rpc_authenticated_execute` is registered. Production ACL read-back confirms both functions have `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`, and `postgres_execute=true`. Supabase Security Advisor authenticated SECURITY DEFINER findings decreased from 16 to 14. Vercel Production deployment for source commit `3706540df2d020589d256c4bf25acd556a803df7` reached `READY`; build error-only inspection showed no build failure, only known warnings, and deployment-scoped Production runtime error/fatal verification returned no logs. Repository migration `supabase/migrations/064_p107_restrict_unused_queue_rpc_authenticated_execute.sql` and evidence document `docs/P107_Unused_Queue_RPC_Authenticated_Execution_Hardening.md` are synchronized. No active queue behavior or database business contract was changed.

### P108 — Unused `hash_pin` Execution Hardening
`CLOSED — CONFIRMED`.
Production `public.hash_pin(text)` is a SECURITY DEFINER function with explicit `search_path=public` and no evidenced active application caller. Repository search found only historical migrations and generated database types; direct RPC caller searches returned no active usage. P108 revoked `EXECUTE` for `PUBLIC`, `anon`, and `authenticated`, preserving `postgres` and `service_role` and leaving the function body/signature unchanged. Production migration `20260909082349 / p108_restrict_unused_hash_pin_execute` is registered. Final ACL read-back confirms `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`, and `postgres_execute=true`. Supabase Security Advisor anonymous SECURITY DEFINER findings decreased from 16 to 15 and authenticated findings from 14 to 13. Vercel Production deployment for source commit `aa153114986c636a1568a1fad4b6e3bb4ac2c9e9` reached `READY`; build error-only logs show no build failure, only the known `esbuild@0.25.12` install-script warning and standard chunk-size warning, and deployment-scoped Production runtime error/fatal verification returned no logs. Repository migration `supabase/migrations/065_p108_restrict_unused_hash_pin_execute.sql` and evidence document `docs/P108_Unused_Hash_Pin_Execution_Hardening.md` are synchronized. No Auth, RLS, tenant, schema, PIN validation, scoring, financial, or business contract changed.

### P109 — `check_pin_rate_limit` Execution Hardening
`CLOSED — CONFIRMED`.
Production `public.check_pin_rate_limit(uuid,text)` is a SECURITY DEFINER function with explicit `search_path=public`. Active application source contains no direct RPC caller, while existing `validate_pin` database functions invoke it internally for the established rate-limiting behavior. P109 removed client-role `EXECUTE` while preserving `postgres` and `service_role`, so the internal PIN rate-limiting contract remains intact. Production migration `20260909082532 / p109_restrict_unused_check_pin_rate_limit_execute` is registered. Final ACL read-back confirms `anon_execute=false`, `authenticated_execute=false`, `service_role_execute=true`, and `postgres_execute=true`. Supabase Security Advisor anonymous SECURITY DEFINER findings decreased from 15 to 14 and authenticated findings from 13 to 12. Vercel Production deployment for source commit `38ff66632f37b6cc3e40a834941cf421880b3faf` reached `READY`; build error-only logs show no build failure, only the known `esbuild@0.25.12` install-script warning and standard chunk-size warning, and deployment-scoped Production runtime error/fatal verification returned no logs. Repository migration `supabase/migrations/066_p109_restrict_unused_check_pin_rate_limit_execute.sql` and evidence document `docs/P109_Check_Pin_Rate_Limit_Execution_Hardening.md` are synchronized. No Auth, RLS, tenant, PIN validation, schema, function signature/body, or business rule was changed.

### P110 — Document Language & Direction Metadata Alignment
`CLOSED — CONFIRMED`.
The active application shell in `src/App.tsx` renders the product as RTL and includes Arabic UI/error content, while the document root in `index.html` incorrectly declared `lang="en"`. P110 changed only the document root metadata to `<html lang="ar" dir="rtl">`; no routing, state, permissions, Auth, RLS, Supabase, scoring, financial, or business logic changed. Implementation commit: `c42dbba49b09cb919881e7bf45b69014f6c6cd72`. Vercel Production deployment `dpl_AEEs3G8Tpu1VbBEyBxL91SZoBeo6` is `READY`; the build completed without failure (existing `esbuild@0.25.12` install-script and chunk-size warnings only), Production runtime error/fatal verification returned no entries, and a live Production fetch returned HTTP 200 with `<html lang="ar" dir="rtl">`.

### P111 — Revenue Screen Permission Alignment
`CLOSED — CONFIRMED`.
The active Clinic Admin Revenue screen was using `view_analytics` while the established permission contract requires `view_invoices`. P111 changed only the screen guard in `src/features/clinic-admin/AdminRevenuePage.tsx` to `PermissionGuard required="view_invoices"`. The existing permission matrix already grants `view_invoices` to `super_admin`, `clinic_admin`, and `receptionist`, while `doctor` does not receive it. A regression test was added at `tests/permission-matrix.test.ts` to lock the revenue/invoice permission contract and preserve separation from analytics permissions. Implementation commit: `501c76ec44c8a0fad5f4a1c9f61d6e63781614d5`; regression-test commit: `084af5a122641081c39249b77a13d0b8f81b6e5a`. Vercel Production deployment for the verified HEAD reached `READY`; build completed successfully with TypeScript and Vite (`1971 modules transformed`), only the existing `esbuild@0.25.12` install-script warning and standard chunk-size warning remain, and deployment-scoped Production runtime verification returned no `error` or `fatal` entries. No DB, migration, RLS, Auth, tenant boundary, scoring, financial calculation, router, or business-rule contract changed.

### P112 — Role-less Auth Redirect Loop
`CLOSED — CONFIRMED`.
The active `AuthWrapper` previously redirected an authenticated user with no resolved role to `/login/roles`, while the active `/login/roles` route immediately redirected to `/login`, creating a deterministic redirect loop. No active role-selection screen or alternate role-resolution contract was evidenced, so no new screen or Auth behavior was invented. The surgical fix removed only the role-less redirect from `AuthWrapper`; the existing `AuthScreen`, Auth state, permissions, and route contracts were otherwise unchanged. Implementation commit: `b6da43581e8c64fff941325276ca59119798eb1a`; evidence: `docs/P112_Roleless_Auth_Redirect_Loop.md`. Vercel Production deployment `dpl_CPMTQb8mPBkbXDDtHaZRsTU6EvCA` for the code fix was `READY`, with successful `tsc -b && vite build`; subsequent evidence commit also deployed `READY` and the root returned HTTP 200 with `<html lang="ar" dir="rtl">`. No Production DB/Auth/RLS/permission changes were made.

### P113 — Reception Queue Access Alignment
`CLOSED — CONFIRMED`.
The active Reception dashboard passed a queue-card click callback that navigated `receptionist` users to `/doctor/session/:id`, while the established route and `DoctorSessionView` restrict clinical session detail to `doctor`, `clinic_admin`, and `super_admin`. The surgical fix removed only the Reception `onSelectSession` navigation callback, leaving queue behavior intact. No router, permission matrix, RLS, Auth, DB schema, RPC, scoring, or clinical-detail access semantics were expanded. Implementation commit: `48325de4c623eb9df954b3131cdff31fbcc31d4c`; evidence: `docs/P113_Reception_Queue_Access_Alignment.md`; Vercel Production `dpl_59zw46Eim6pbyTcQmMstpSqjNMd3` reached `READY` with no deployment-scoped runtime error/fatal entries.

### P114 — Reception Header Role Identity
`CLOSED — CONFIRMED`.
The active `/reception` route is authorized for `receptionist`, `clinic_admin`, and `super_admin`, while the Reception shell previously hard-coded the identity label. The fix derives the displayed role identity from the existing auth state. Implementation commit `9e8acfe5bd34a5b88cb34f6cf7014e8a84190698`; evidence commit `67af71ff2e7a38c80f6f5045faf6c314791ed335`; CI `34334823679` passed; Vercel `dpl_HkMQ1tEd8quBcGdFgrQwn9fgkjni` reached `READY` with no deployment-scoped runtime errors.

### P115 — Doctor Surface Header Role Identity
`CLOSED — CONFIRMED`.
The active `/doctor` route is authorized for `doctor`, `clinic_admin`, and `super_admin`, while the Doctor shell previously hard-coded `طبيب`. The fix derives the role label from the existing auth state through a static Arabic mapping. Implementation `2e26b5d99d909122f5eb1a1dec8f33a416ca36d7`; evidence `963f40cd61fde0151192d91f0f2a61113c511ac7`; CI `34335199744` passed; Vercel `dpl_5SJvFdy1GE5s2J2q9JMskjJDQawx` reached `READY` with no deployment-scoped runtime errors.

### P116 — Admin Surface Header Role Identity
`CLOSED — CONFIRMED`.
The active `/admin` route is authorized for `clinic_admin` and `super_admin`, while the Admin shell previously defaulted to `مدير العيادة`. The fix derives the display name from `full_name_ar`, then `full_name`, then the role label. Implementation `3a7224cbdf8bd9298b32efc40685fbbdbfcbd084`; evidence `ee76d648b44e06b1e35417048a4ceeec9b048fbf`; CI `34335680348` passed; cumulative Vercel deployment `dpl_7LQ9XW6CxFhc5BtwyKeJwRxgKZqs` is `READY`.

### P117 — Patient LTV Display Unit Alignment
`CLOSED — CONFIRMED`.
The patient directory now presents `total_revenue_subunits` through the established `subunitsToDisplay` helper. Implementation `e51df06a877ba64751f99fc78f213fa25bef27ab`; evidence `docs/P117_Admin_Patient_LTV_Display.md`; CI `34337500502` passed; cumulative Vercel `dpl_7LQ9XW6CxFhc5BtwyKeJwRxgKZqs` is `READY` with no runtime errors.

### P118 — Staff Role Label Alignment
`CLOSED — CONFIRMED`.
`receptionist` and `super_admin` labels were aligned to `موظف الاستقبال` and `مشرف عام`. Implementation `1904013e615de11af79a58be044489c75cb85f23`; evidence `e510296934adbef72ebe3cf1e8d9eee424680a95`; CI passed; cumulative Production `dpl_7LQ9XW6CxFhc5BtwyKeJwRxgKZqs` is `READY`.

### P119 — Audit Role Label Alignment
`CLOSED — CONFIRMED`.
Stored `actor_role` values now render through the established Arabic role mapping with raw fallback for unknown roles. Implementation `105d9fe86f327242bbeee24ed54688dfc74c719b`; evidence `9908e4e93ba78e209335a9aa6399f16350b62b9e`; CI `34337500502` passed; Production `dpl_7LQ9XW6CxFhc5BtwyKeJwRxgKZqs` is `READY`.

### P120 — Subscription Tier Label Alignment
`CLOSED — CONFIRMED`.
`TenantBillingAdminPage` now renders the established Arabic tier mapping: `trial` → `تجريبي`, `essential` → `أساسي`, `professional` → `احترافي`, `enterprise` → `مؤسسي`, `suspended` → `موقوف`. Implementation `4781322703402d255a1d00d5ce0fb64f907d9d97`; evidence `60128913e5eb9a28d43d130358c3dc17851e1466`; CI `34337500502` passed; Production `dpl_2Knif1TA5P4woRLHVFPC2cegpTmj` is `READY`.

### P121 — Breach Severity Label Alignment
`CLOSED — CONFIRMED`.
Breach severity badges now use the established Arabic mapping `critical` → `حرج`, `high` → `عالٍ`, `medium` → `متوسط`, `low` → `منخفض`. Implementation `7f8a9304d9cb185f94d645ff26e185e462ae9d37`; evidence `06bf0799ebb384b4854c6cc7bfe6c72e46039609`; CI `34337500502` passed; Production `dpl_2Knif1TA5P4woRLHVFPC2cegpTmj` is `READY`.

### P122 — Schedule Doctor Arabic Name Alignment
`CLOSED — CONFIRMED`.
The clinic schedule now selects and prefers `full_name_ar || full_name` for doctors. Implementation `ee320349c9f1e8cd1ba25504e108e30b20c88230`; evidence `docs/P122_Schedule_Doctor_Arabic_Name_Alignment.md`; CI `34337914115` passed; Production `dpl_2Knif1TA5P4woRLHVFPC2cegpTmj` is `READY`. No scheduling timezone semantics were changed.

### P123 — Billing Status Tier Label Alignment
`CLOSED — CONFIRMED`.
The Clinic Admin Billing Status screen now maps `subscription_tier` to the established Arabic display labels. Implementation `93c41ad5e4584989858408e3e6cc9d3a0b806eeb`; evidence `docs/P123_Billing_Status_Tier_Label_Alignment.md`; CI `34340358053` passed; Production `dpl_2Knif1TA5P4woRLHVFPC2cegpTmj` is `READY`.

### P124 — CI Verification Infrastructure Alignment
`CLOSED — CONFIRMED`.
GitHub Actions now runs transient Vitest through `corepack enable && corepack pnpm dlx vitest@4.1.11 run`, avoiding the previous npm/native-Rolldown failure without adding a package dependency. Cumulative CI `34340358053` passed build, TypeScript, and tests.

### P125 — Feature Flag Tenant/Tier Label Alignment
`CLOSED — CONFIRMED`.
`FeatureFlagManager` now uses `clinic_name_ar || clinic_name` and the established Arabic tier labels for tenant selection and allowed-tier controls. Stored identifiers and feature-flag behavior remain unchanged. Implementation `b1562ac022072aa09e246fdd9c8914d676070603`; evidence `docs/P125_Feature_Flag_Tier_Label_Alignment.md`; CI `34341272817` passed; Production `dpl_H57qi3L7c1R1V2mQ4GjVYNPkSCbM` is `READY`; deployment build/runtime/root verification passed.

### P126 — Super Admin Billing Arabic Clinic Name Alignment
`CLOSED — CONFIRMED`.
`TenantBillingAdminPage` now selects `clinic_name_ar` and renders `clinic_name_ar || clinic_name || name || id`. Subscription updates, activation, permissions, filters, and data contracts are unchanged. Implementation `9bf6ca37bce78d5aba30a3afee62bd803d91ea74`; evidence `docs/P126_Super_Admin_Billing_Arabic_Clinic_Name.md`; CI `34342314177` passed; Production `dpl_H57qi3L7c1R1V2mQ4GjVYNPkSCbM` is `READY`.

### P127 — Admin Patient Profile Soft-Delete Filter
`IMPLEMENTED — PRODUCTION VERIFICATION BLOCKED`.
`AdminPatientsPage` now adds `.is('deleted_at', null)` to the `patient_longitudinal_profiles` query. Production confirms the column exists; CI `34342803619` passed build, TypeScript, and Vitest. Exact commit `291e8d3136d66d9d748bfff2bdb4c3f1cfdc1087` is currently blocked from Vercel Production by `Deployment rate limited — retry in 24 hours`; no matching Production deployment exists yet.

### P128 — Admin Schedule Soft-Delete Filter
`IMPLEMENTED — PRODUCTION VERIFICATION BLOCKED`.
`AdminSchedulePage` now adds `.is('deleted_at', null)` to the `master_agenda_events` query. Production confirms the column exists, and the active Reception RPC already excludes soft-deleted agenda events. CI run `34343102871` passed build, TypeScript, and Vitest. Exact commit `52e55c7ff6e58a1a36b02321b0deee684b160d39` is currently blocked from Vercel Production by the active deployment-rate limit; no matching Production deployment exists yet.

## Evidence-blocked / non-speculative findings carried forward
- `tenant_health_scores` exists in the Blueprint and Production, but Production currently has no active rows and the current policy is tenant-isolated. No Super Admin cross-tenant health-score contract has been evidenced. The missing `TenantRegistry` health-score surface therefore remains a verified evidence gap, not a license to invent a calculation engine or RLS/RPC path.
- `AnalyticsOverview` `Hot Leads` remains English because no established Arabic mapping was found in the active contract; no invented translation was introduced.
- No timezone/day-boundary reinterpretation was applied to `AdminSchedulePage`; current evidence confirms `TIMESTAMPTZ` storage but does not establish the required tenant-local business rule.
- Audit `action` and `table_name` values remain raw because the Blueprint specifies storage identifiers but no established Arabic action/table mapping was evidenced. No speculative localization was added.
- `AdminPatientsPage.patient_status` is backed by `active`, `inactive`, `vip`, `blocked`, `transferred`, but no active Arabic mapping was evidenced; no speculative localization was added.
- `DecisionCard.tsx` contains older direct `clinic_patients` and `patient_longitudinal_profiles` reads without explicit `deleted_at` filters, but it is protected active Doctor code and is outside the current repair scope. No change was made.
- Reception PIN-only data access remains mediated by the existing SECURITY DEFINER RPC contract; no direct browser table access was introduced.

## Current verification boundary
- CI-verified source reaches P128: GitHub Actions `34343102871` is `SUCCESS` for build, TypeScript, and Vitest.
- Production-verified cumulative source remains at P126: Vercel `dpl_H57qi3L7c1R1V2mQ4GjVYNPkSCbM` is `READY` and aliased to `core-system-v2-0.vercel.app`.
- P127 and P128 are implementation-verified but **not Production-verified** because Vercel currently reports deployment rate limiting for their exact commits.
- P125 and P126 remain fully Production-verified and closed.
- No database migration, RLS policy, RPC signature/body, Auth change, scoring rule, financial contract, or routing contract was introduced by P127/P128.
- The next repair stage remains evidence-driven review of the next active screen/data contract; speculative changes are not authorized.
