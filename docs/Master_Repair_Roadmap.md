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
Active `AnalyticsOverview` previously used the count of currently active sessions as a fallback for the KPI `الزيارات اليوم`, which conflated two different measures. The fallback was removed; the KPI now uses the existing daily snapshot contract only. The snapshot query now excludes soft-deleted snapshots and reports query failures explicitly. Active `RevenueCards` now excludes soft-deleted analytics snapshots and invoices and surfaces data-query failures instead of silently rendering partial financial data. Production schema verification confirmed `deleted_at` exists on both `analytics_daily_snapshots` and `clinic_invoices`. No schema, RPC, RLS, Auth, or financial-subunit contract was changed. Latest source commits are `2fbdff76e99637d80553233aefcf47df26371302` and `f16666727a92cf44f02553b441285609335c4732`; the latter was the source HEAD before the subsequent feature-flag repairs. Vercel Production deployment `dpl_ETpMmtGodBro2fjLqYEUzSE5TU94` is `READY`, and its Production runtime error/fatal count is zero.

### P93 — Feature Flag Management Data Integrity
`CLOSED — CONFIRMED`.
The active Super Admin `FeatureFlagManager` now excludes `deleted_at IS NOT NULL` rows from operational reads, checks every seed insert for returned errors, awaits refresh before reporting success, and preserves the existing super-admin-only write contract. Production read-back confirmed 8 active and 6 soft-deleted `feature_flags` rows. Implementation commit `c845fd4cd7a3cb44893a80c55738f83a66a0c8a9`; Vercel Production `dpl_DQCUc1sWqmSWkpDqqSGT2oCWyq3n` is `READY`.

### P94 — Feature Flag Consumer Soft-Delete Integrity
`CLOSED — CONFIRMED`.
The active feature-flag hooks/store exclude soft-deleted rows before applying tenant/global precedence and tier validation. Production contains active and soft-deleted rows for the same global keys. Implementation commits `64642af7479def3ddac386461fcea0a770b638` and `3701ec14473e829dafff8311795e9ae1d6537d54`; Production verification for the final store commit reached `READY` with no runtime error/fatal entries.

### P95 — Revenue Chart Theme Token Integrity
`CLOSED — CONFIRMED`.
Semantic chart presentation values use the existing CSS tokens while revenue calculations and financial contracts remain unchanged. Implementation `80cf3942ff2cad4abc295da63f5eb6bffc9b9edc`; Production `dpl_3fteqTR8TgEaNaGBFJ8v6mvcgvWs` is `READY`.

### P96 — Super Admin Theme Token Alignment
`CLOSED — CONFIRMED`.
`TenantRegistry`, `TenantDetailPanel`, and `CoreRulesConfigManager` use the existing primary semantic tokens without functional changes. Implementation commits `478d7fdb51b919999c8dbf8c1faa57df5f94b4e0`, `280b906519d445a4012adf4f8b0219a1f3d2e91e`, `e9c20a3d6e4b23a991b917d560497c15476fc2f5`; final Production deployment `dpl_6GLtytuXQUfUs4b5ZSyycu7Pc46c` was `READY`.

### P97 — Clinic Session RLS Evaluation Optimization
`CLOSED — CONFIRMED`.
Two active session policies were optimized with scalar `SELECT` wrappers around tenant/role/auth helpers, preserving authorization semantics. Production confirmed the policies and migration `p97_session_rls_initplan_optimization` (`20260909074808`); Performance Advisor cleared the initplan finding. Repository migration `supabase/migrations/060_p97_session_rls_initplan_optimization.sql` is present.

### P98 — Tenant-Aware PIN Pad Theme Alignment
`CLOSED — CONFIRMED`.
`PinPad` consumes the existing tenant primary color with the established fallback; PIN/auth contracts are unchanged. Implementation `094c4e3dc469e89fbbae6b9bdae86dbe76c88d0b`; Production `dpl_CzXxxuWCupdiYhYUER4DHVVD6M4M` is `READY`.

### P99 — Tenant Store Console Cleanup
`CLOSED — CONFIRMED`.
Debug-only tenant-store `console.log` calls were removed while operational warnings/errors were retained. Implementation `b4e7eb42be59f87533b6f4ba2a70ca67ef53e441`; Production `dpl_EiVuqv8UsStpGrCxj38QKoTBRAeh` is `READY`.

### P100 — Financial RPC Direct-Execution Boundary
`CLOSED — CONFIRMED`.
Client `EXECUTE` was revoked for the exact financial RPC signatures `create_invoice(uuid,uuid,integer,integer,integer,text)` and `mark_invoice_paid(uuid,integer,uuid)`, while postgres/service_role remained. Production migration `061_p100_restrict_financial_rpc_execute.sql` is present; the duplicate migration-history name is tracked as reconciliation-only. Production deployment for the verified source was `READY`.

### P101 — User Lookup RPC Execution Hardening
`CLOSED — CONFIRMED`.
The legacy unused user-lookup SECURITY DEFINER RPC was restricted to internal execution after active-source inspection found no client caller. Active Auth/user-management behavior was unchanged.

### P102 — Audit Read Authenticated-Only
`CLOSED — CONFIRMED`.
Production audit read access is restricted to authenticated users while preserving current-tenant plus `clinic_admin/super_admin` semantics.

### P103 — Internal SECURITY DEFINER Access Hardening
`CLOSED — CONFIRMED`.
The internal `is_super_admin()` and trigger-only `prevent_protected_clinic_user_changes()` functions were made non-client executable; bodies/signatures and business semantics stayed unchanged.

### P104 — Queue RPC Anonymous Access Hardening
`CLOSED — CONFIRMED`.
Anonymous execution was removed from the unused tenant queue RPCs while authenticated/internal execution remained pending further evidence.

### P105 — Dead `validate_email_password` Execution Hardening
`CLOSED — CONFIRMED`.
Client execution was revoked for the dead SECURITY DEFINER function after active-source inspection found no caller. `validate_license(...)` remained unchanged because it has an active caller.

### P106 — Unused `update_session_status` Execution Hardening
`CLOSED — CONFIRMED`.
Client execution was removed from the unused `update_session_status` RPC while direct active session updates remain unchanged.

### P107 — Unused Queue RPC Authenticated Execution Hardening
`CLOSED — CONFIRMED`.
Authenticated/client execution was removed from the two unused queue RPCs, preserving postgres/service_role execution.

### P108 — Unused `hash_pin` Execution Hardening
`CLOSED — CONFIRMED`.
Client execution was removed from unused `hash_pin(text)` while the function body/signature remained unchanged.

### P109 — `check_pin_rate_limit` Execution Hardening
`CLOSED — CONFIRMED`.
Client execution was removed from `check_pin_rate_limit(uuid,text)` while `validate_pin` internal use remains intact.

### P110 — Document Language & Direction Metadata Alignment
`CLOSED — CONFIRMED`.
The document root now declares `<html lang="ar" dir="rtl">`.

### P111 — Revenue Screen Permission Alignment
`CLOSED — CONFIRMED`.
`AdminRevenuePage` uses the established `view_invoices` permission and the permission matrix regression test locks the contract.

### P112 — Role-less Auth Redirect Loop
`CLOSED — CONFIRMED`.
The unsupported role-less redirect to `/login/roles` was removed because the active route redirected back to `/login`; no alternate role selection flow was invented.

### P113 — Reception Queue Access Alignment
`CLOSED — CONFIRMED`.
Reception queue selection no longer navigates to the restricted Doctor clinical session route.

### P114 — Reception Header Role Identity
`CLOSED — CONFIRMED`.
Reception header identity now derives from existing authenticated role state.

### P115 — Doctor Surface Header Role Identity
`CLOSED — CONFIRMED`.
Doctor shell role identity now derives from existing authenticated role state using the established Arabic mappings.

### P116 — Admin Surface Header Role Identity
`CLOSED — CONFIRMED`.
Admin shell display now derives from `full_name_ar`, then `full_name`, then role label for the existing `clinic_admin/super_admin` contract.

### P117 — Patient LTV Display Unit Alignment
`CLOSED — CONFIRMED`.
Patient LTV uses the established `subunitsToDisplay` helper.

### P118 — Staff Role Label Alignment
`CLOSED — CONFIRMED`.
Staff role display uses `موظف الاستقبال` and `مشرف عام` for the established roles.

### P119 — Audit Role Label Alignment
`CLOSED — CONFIRMED`.
Audit actor-role values use the established Arabic role mapping with raw fallback for unknown roles.

### P120 — Subscription Tier Label Alignment
`CLOSED — CONFIRMED`.
Super Admin subscription-management uses the established Arabic tier mapping for `trial`, `essential`, `professional`, `enterprise`, and `suspended`.

### P121 — Breach Severity Label Alignment
`CLOSED — CONFIRMED`.
Breach severity uses the established Arabic mapping: `critical` → `حرج`, `high` → `عالٍ`, `medium` → `متوسط`, `low` → `منخفض`.

### P122 — Schedule Doctor Arabic Name Alignment
`CLOSED — CONFIRMED`.
Clinic Schedule selects `full_name_ar` and prefers it over `full_name`; no timezone/day-boundary semantics changed.

### P123 — Billing Status Tier Label Alignment
`CLOSED — CONFIRMED`.
Billing Status uses the established Arabic subscription-tier mapping.

### P124 — CI Verification Infrastructure Alignment
`CLOSED — CONFIRMED`.
GitHub Actions executes transient Vitest through Corepack/pnpm without adding a project dependency.

### P125 — Feature Flag Tenant/Tier Label Alignment
`CLOSED — CONFIRMED`.
`FeatureFlagManager` selects `clinic_name_ar`, renders the established Arabic tier mapping, and preserves stored feature-flag identifiers and behavior. Implementation `b1562ac022072aa09e246fdd9c8914d676070603`; evidence `docs/P125_Feature_Flag_Tier_Label_Alignment.md`; CI `34341272817`; Production `dpl_H57qi3L7c1R1V2mQ4GjVYNPkSCbM` `READY`; deployment/runtime/root verification passed.

### P126 — Super Admin Billing Arabic Clinic Name Alignment
`CLOSED — CONFIRMED`.
`TenantBillingAdminPage` selects `clinic_name_ar` and renders `clinic_name_ar || clinic_name || name || id`, preserving subscription and activation behavior. Implementation `9bf6ca37bce78d5aba30a3afee62bd803d91ea74`; evidence `docs/P126_Super_Admin_Billing_Arabic_Clinic_Name.md`; CI `34342314177`; Production `dpl_H57qi3L7c1R1V2mQ4GjVYNPkSCbM` `READY`.

### P127 — Admin Patient Profile Soft-Delete Filter
`IMPLEMENTED — PRODUCTION VERIFICATION BLOCKED`.
`AdminPatientsPage` now excludes soft-deleted `patient_longitudinal_profiles` with `.is('deleted_at', null)`. Production confirms the column exists. Implementation `291e8d3136d66d9d748bfff2bdb4c3f1cfdc1087`; evidence `docs/P127_Admin_Patient_Profile_Soft_Delete_Filter.md`; CI `34342803619` passed build, TypeScript, and Vitest. Exact-commit Vercel Production status is `Deployment rate limited — retry in 24 hours`; no matching Production deployment exists.

### P128 — Admin Schedule Soft-Delete Filter
`IMPLEMENTED — PRODUCTION VERIFICATION BLOCKED`.
`AdminSchedulePage` now excludes soft-deleted `master_agenda_events` with `.is('deleted_at', null)`. Production confirms the column exists, and the existing Reception RPC already excludes deleted agenda events. Implementation `52e55c7ff6e58a1a36b02321b0deee684b160d39`; evidence `docs/P128_Admin_Schedule_Soft_Delete_Filter.md`; CI `34343102871` passed build, TypeScript, and Vitest. Exact-commit Vercel Production status is `Deployment rate limited — retry in 24 hours`; no matching Production deployment exists.

### P129 — Super Admin Billing Soft-Delete Update Guard
`IMPLEMENTED — PRODUCTION VERIFICATION BLOCKED`.
`TenantBillingAdminPage` already excluded deleted tenants during reads, but `updateTier()` and `activateTenant()` previously updated `master_tenants` by `id` only. P129 adds `.is('deleted_at', null)` to both update predicates. Production confirms `master_tenants.deleted_at` exists. Implementation `4264b21addfeb52a6e5f6cb5dbdc1a70c491454c`; evidence `docs/P129_Super_Admin_Billing_Soft_Delete_Update_Guard.md`; CI `34343447815` passed build, TypeScript, and Vitest. Exact-commit Vercel Production status is `Deployment rate limited — retry in 24 hours`; P129 is not Production-verified.

## Evidence-blocked / non-speculative findings carried forward
- `tenant_health_scores` exists in the Blueprint and Production, but Production currently has no active rows and its current policy is tenant-isolated. No Super Admin cross-tenant health-score contract has been evidenced, so no calculation engine or RLS/RPC path was invented.
- `AnalyticsOverview` `Hot Leads` remains English because no established Arabic mapping was found in the active contract.
- No timezone/day-boundary reinterpretation was applied to `AdminSchedulePage`; current evidence confirms `TIMESTAMPTZ` storage but does not establish the required tenant-local business rule.
- Audit `action` and `table_name` values remain raw because no established Arabic mapping was evidenced.
- `AdminPatientsPage.patient_status` is backed by `active`, `inactive`, `vip`, `blocked`, `transferred`, but no active Arabic mapping was evidenced.
- `DecisionCard.tsx` contains older direct patient/profile reads without explicit `deleted_at` filters, but it is protected active Doctor code and outside the current repair scope.
- Reception PIN-only data access remains mediated by the existing SECURITY DEFINER RPC contract; no direct browser table access was introduced.
- `TenantDetailPanel` exposes `license_key`, but no Blueprint/Constitution requirement for masking was evidenced, so no speculative masking was introduced.

## Current verification boundary
- CI-verified source reaches P129: GitHub Actions Build Test `34343447815` is `SUCCESS` for build, TypeScript, and Vitest.
- Production-verified cumulative source remains at P126: Vercel `dpl_H57qi3L7c1R1V2mQ4GjVYNPkSCbM` is `READY` and aliased to `core-system-v2-0.vercel.app`.
- P127, P128, and P129 are implementation-verified but **not Production-verified** because Vercel currently reports deployment-rate limiting for their exact commits.
- P125 and P126 are fully Production-verified and closed.
- No database migration, RLS policy, RPC signature/body, Auth change, scoring rule, financial contract, or routing contract was introduced by P127–P129.
- The next repair stage remains evidence-driven review of the next active screen/data contract; speculative changes are not authorized.
