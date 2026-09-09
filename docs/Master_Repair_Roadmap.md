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
Production RLS review established that permissive tenant `FOR ALL` policies would otherwise allow physical DELETE. The first deny policy was corrected to a `RESTRICTIVE` deny so it cannot be bypassed by existing permissive policies. Production read-back confirmed `rls_deny_hard_delete` with `cmd = DELETE`, `permissive = false`, and `USING (false)` across the targeted tenant operational tables. Repository migrations `supabase/migrations/057_p87_deny_hard_delete_tenant_data.sql` and corrective `supabase/migrations/058_p87_hard_delete_restrictive_guard.sql` are present. Vercel Production deployment for commit `8189bdbae0fb17acfbdc515529aea091f15a7bdf` was READY.

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
The active `useFeatureFlag`/`useFeatureFlags` hooks and `featureFlagStore.fetchFlags` now exclude soft-deleted `feature_flags` rows before applying the existing tenant-specific-over-global precedence and tier validation. Production contains active and soft-deleted rows for the same global keys, so the filter is evidence-backed operational behavior. Implementation commits: `64642af7479def3ddacda386461fcea0a770b638` and `3701ec14473e829dafff8311795e9ae1d6537d54`. Vercel Production deployment for the final store commit is `READY`; build error-only logs show no build failure, only the existing `esbuild@0.25.12` warning, and Production error/fatal runtime logs returned no entries for the deployment. No schema, migration, RPC, RLS, Auth, permission, scoring, or financial-unit contract changed.

## Current repair status
### P62 — CoreScoreWidget Integration
`CLOSED — CONFIRMED`.
Existing tenant/doctor-scoped `core_score_display` is rendered by the existing CoreScoreWidget in Doctor Session; scoring logic and protected components were not changed. CI `34209799855` passed.

### P63 — OfflineBanner Integration
`CLOSED — CONFIRMED`.
Existing OfflineBanner is rendered at the app root; network detection hook was not rewritten. CI `34209854721` passed.

### P64 — Theme Token Cleanup
`CLOSED — CONFIRMED`.
Semantic hard-coded primary styling was converted to the existing `primary` token in active App/Auth/Router/Admin/Reception/SuperAdmin/Invoice surfaces. Archive, protected DoctorLayout, and token definition files were not changed. Final cumulative CI `34210216895` passed.

### P65 — README Accuracy
`CLOSED — CONFIRMED`.
Stale migration/function counts and obsolete “Next: UI Layer” wording were replaced with verified current state. Final cumulative CI `34210216895` passed.

### P66 — Console Cleanup
`CLOSED — CONFIRMED`.
Debug-only console logs were removed from TenantProvider and RealtimeProvider; meaningful error/warn logs were preserved. Final cumulative CI `34210216895` passed install/build/tsc/tests.

### P67 — HotSwapSuggestion
`BLOCKED — INSUFFICIENT EVIDENCE`.
Blueprint defines the UI and active shared type exists, but the component found is only `archive/features_backup/reception/HotSwapSuggestion.tsx`; no active generator/service/handler contract was found. Do not restore archived UI or invent swap rules.

### P68 — QuickInvoice
`BLOCKED — INSUFFICIENT EVIDENCE`.
Blueprint defines QuickInvoice, but repository implementation found is only `archive/features_backup/reception/QuickInvoice.tsx`; active code contains a different `SimpleInvoice` contract, which has now been removed from the Doctor feature surface. Do not promote archived QuickInvoice without an active billing contract.

### P69 — SurveyRouter Orphan/Flow Reconciliation
`CLOSED — CONFIRMED`.
Active route uses `src/features/survey/SurveyRouter.tsx`; no active import of `src/components/SurveyRouter.tsx` was found. The stale placeholder was deleted. Survey persistence/page rules were unchanged.

### P70 — AuditTrailViewer
`CLOSED — CONFIRMED`.
Production `audit_trail` has the authoritative existing audit contract and its existing RLS policy permits `clinic_admin` and `super_admin` reads for the current tenant. Active paginated viewer was added at `/admin/audit` using only existing columns, tenant/RLS enforcement, and `view_audit`. GitHub Actions Build Test run `34211206918` passed install/build/tsc/tests. Vercel Production deployment for the active changes is `READY`.

### P71 — BreachLog
`CLOSED — CONFIRMED`.
Production `system_delivery_breaches` has the authoritative breach contract and existing RLS isolation. Active filtered viewer was added at `/admin/breaches` using existing breach fields and `view_audit`; no new security semantics or RLS changes were introduced. GitHub Actions Build Test run `34211206918` passed install/build/tsc/tests. Vercel Production deployment for the active changes is `READY`.

### P72 — GlobalHealthScores
`BLOCKED — INSUFFICIENT EVIDENCE`.
Production `tenant_health_scores` exists and matches the expected score fields, but its current RLS policy only permits `tenant_id = get_current_tenant_id()`. Blueprint calls for a cross-tenant super-admin leaderboard. Implementing that view safely would require a new access contract/RLS decision, which is outside the agreed scope and stop conditions.

### P73 — Billing UI Program
P73-A/B: `CLOSED — CONFIRMED`.
An active read-only subscription status page was added at `/admin/billing` using existing `master_tenants` fields (`subscription_tier`, `subscription_start`, `subscription_end`, `trial_started_at`, `max_devices`). Production `core_rules_config` confirms the standard trial duration is 14 days. No pricing, manual activation, or payment operation was invented. Vercel Production deployment for the P73-A/B changes is `READY`; the selected Production runtime error/fatal check returned zero entries.
P73-C: `CLOSED — CONFIRMED`.
The active super-admin subscription control surface was added at `/super-admin/billing`. It is protected by the existing `super_admin_access` permission and uses only the Blueprint-defined `updateTier` and `activateTenant` operations against `master_tenants`. Production RLS already permits `super_admin` access to `master_tenants`; no RLS/Auth/schema changes were made. GitHub Actions Build Test run `34211509858` passed install/build/tsc/tests, and Vercel Production deployment for commit `e8cf1b7217cd2ab0fe9643ef934f853563cf1669` is `READY`.
P73-D: `BLOCKED — INSUFFICIENT EVIDENCE`.
No additional Stripe-facing UI workflow was added because the active repository does not establish a sufficient contract for payment initiation/status beyond the already-protected backend webhook. Existing Stripe webhook authentication remains unchanged.

### P74 — `deleted_at` Schema Compliance
`CLOSED — CONFIRMED`.
Production gaps were confirmed on eight tenant-owned tables: `analytics_daily_snapshots`, `analytics_events`, `analytics_patient_metrics`, `audit_trail`, `billing_events`, `notification_queue`, `pin_attempt_log`, `pin_sessions`. Global reference tables `currency_reference` and `medical_procedure_taxonomy` were excluded. Production migration `p74_governance_deleted_at_columns` succeeded and read-back confirmed nullable `timestamptz` columns. Repository migration: `supabase/migrations/044_p74_governance_deleted_at_columns.sql`.

### P75 — Soft-Delete Enforcement
`CLOSED — CONFIRMED`.
Production evidence found two active `create_pin_session` overloads physically deleting prior `pin_sessions`, while active PIN-session readers and the Realtime broadcast function selected sessions by token/expiry. Production migration `p75_soft_delete_pin_sessions` replaced those PIN-session physical deletes with `deleted_at = now()` and added `deleted_at IS NULL` to all active PIN-session lookup paths, preserving all RPC signatures and return contracts. Production migration history records `20260908134459 / p75_soft_delete_pin_sessions`; read-back verified no physical `DELETE FROM public.pin_sessions` remains in the targeted functions. Repository migration: `supabase/migrations/053_p75_soft_delete_pin_sessions.sql`. The generic offline `SyncEngine.applyMutation()` delete branch remains unchanged because no active caller enqueuing `operation: 'delete'` was evidenced; this residual infrastructure path is intentionally not broadened beyond the proven PIN-session scope.

### P76 — Timestamp Compliance
`CLOSED — CONFIRMED`.
Production timestamp gaps were repaired on `analytics_events`, `analytics_patient_metrics`, `audit_trail`, `billing_events`, `inventory_ledger`, `notification_queue`, `pin_attempt_log`, `pin_sessions`, `system_delivery_breaches`, and `tenant_devices`. Historical timestamps were reused from `occurred_at`/`registered_at` or existing `created_at` where available. Production verification confirmed `NOT NULL DEFAULT now()` for the added timestamps. Repository migration: `supabase/migrations/045_p76_governance_timestamp_columns.sql`.

### P77 — `core_rules_config`
`CLOSED — CONFIRMED`.
Production schema matches the global-default/tenant-override model. Current active rows are global defaults; no tenant overrides exist. The CORE weight row exactly matches APS 0.28, DRI 0.24, RVS 0.20, URI 0.15, TSI 0.13. No corrective write was required.

### P78 — `feature_flags`
`CLOSED — CONFIRMED`.
Production supports global (`tenant_id IS NULL`) and tenant-specific rows and has `uq_feature_flag`. Eight global keys had duplicate active rows due PostgreSQL NULL uniqueness semantics. The oldest identical row per key was preserved, duplicates were soft-deleted, and partial unique index `uq_feature_flags_global_active` now enforces one active global row per key. CI `34210803299` passed install/build/tsc/tests. Repository migration: `supabase/migrations/046_p78_global_deduplication.sql`.

### P79 — Migration History Reconciliation
`RECONCILIATION CLOSED — CONFIRMED; CLEANUP BLOCKED — INSUFFICIENT EVIDENCE`.
A non-destructive reconciliation was completed against Production `supabase_migrations.schema_migrations` and the GitHub `main` migration inventory. Production currently exposes 37 migration rows. **25 Production migration names have an identifiable same-name repository file and 12 Production migration names have no same-name repository filename, totaling 37.** The 12 unmatched names are: `urgent_restrict_anon_dangerous_functions`, `fix_direct_anon_grant_on_dangerous_functions`, `fix_remaining_rls_initplan_and_duplicate_indexes_v2`, `add_missing_fk_indexes_real_prod`, `fix_function_search_path_mutable`, `restrict_debug_jwt_probe`, `consolidate_permissive_policies`, `consolidate_pin_attempt_log_policies`, `drop_duplicate_unique_constraint`, `add_soft_delete_columns_gobdznxqbdaklkkqbkynx`, `049_pin_session_pin_only_alignment`, and `fix_pin_queue_rpc_search_path`. The timestamp-prefixed compatibility mappings for historical `019`, `020`, and `022` are documented separately. Read-only effect checks confirmed no active tenant-owned table is missing `deleted_at`, no public FK lacks a valid leading-column index, no duplicate active public index definitions were found, all current public SECURITY DEFINER functions have explicit `search_path`, and `debug_jwt_probe()` exists in Production as SECURITY INVOKER with `search_path=public` and is not executable by `anon`. These checks establish current-state effects, not full migration provenance. Detailed evidence is documented in `docs/P79_Migration_History_Reconciliation.md`. No Production migration-history row was deleted, renamed, rewritten, or synthesized. Cleanup remains blocked pending effect-level/provenance comparison and a reversible cleanup procedure.

### P80 — `domain_backup` Disposition
`CLOSED — CONFIRMED`.
No active source reference to `archive/domain_backup` was found. Archive remains preserved as reference material; no mutation was performed.

### P81 — Legacy Doctor Screen Verification
`CLOSED — CONFIRMED`.
Blueprint names `MyQueueView` and `PatientSessionView`, but current implementations are archive-only; active routing uses `DoctorTodayPatients` and `DoctorSessionView`. No restoration or archive deletion was justified.

### P82 — Bundle Optimization
`CLOSED — CONFIRMED`.
CI build evidence established a concrete entry-chunk bottleneck: before the targeted change, `index-C3PaUPIe.js` was 547.73 kB (gzip 160.86 kB). The active router already lazy-loaded feature pages, but `CoreRulesConfigManager` was still statically imported; it was converted to the same lazy/Suspense pattern used by the rest of the feature routes. Verified CI run `34233714542` passed install/build/tsc/tests and measured `index-dZ9c9ZMy.js` at 539.68 kB (gzip 158.55 kB), with a separate `CoreRulesConfigManager-XT2mn8J_.js` chunk at 6.42 kB (gzip 2.53 kB). The Vercel Production deployment for commit `12bd7ef4d50b55d4f7cd66f6507c6cf209af2865` is `READY`. The entry chunk remains above Vite's 500 kB warning threshold, so no speculative manual chunking or dependency changes were introduced; the residual warning is explicitly recorded rather than hidden.

### P83 — `pin_sessions.staff_id` FK Index
`CLOSED — CONFIRMED`.
Supabase Performance Advisor reported the foreign key `pin_sessions.staff_id` without a covering index. A dedicated `idx_pin_sessions_staff_id` index was added in Production and read-back confirmed the exact btree index definition. No data, RLS, Auth, or RPC contract changed. Repository migration: `supabase/migrations/054_p83_index_pin_sessions_staff_id.sql`.

## Evidence-gated work that remains blocked
- P56 retention/follow-up automation semantics and provider workflow.
- P57 Survey → CORE numeric mapping coefficients/lookup rules.
- P67 HotSwapSuggestion generator/behavior contract.
- P68 QuickInvoice active contract.
- P72 cross-tenant GlobalHealthScores access contract; current RLS does not establish it.
- P73-D additional Stripe UI workflow contract.
- Full Production interactive browser E2E where environment/SSO blocks navigation.
- Concrete event-handler implementations where active contracts are not evidenced.
- Real WhatsApp/SMS/email adapters without verified provider contract/config.
- Supabase Advisor remediation that would alter RLS/Auth/permissions without intent-level evidence.
- Generic offline soft-delete behavior beyond the proven PIN-session lifecycle until an active enqueue contract is evidenced.
- Remaining unused-index advisories require workload evidence before any removal and are not treated as defects solely from advisor counters.
- `pin_sessions` RLS has no direct policies because the active PIN-session browser workflow is mediated by SECURITY DEFINER RPCs; changing that contract would require explicit RLS/access evidence.
- Blueprint-level Kiosk `StaffAvatarRail` remains unimplemented pending an active, verified staff roster/interaction contract.
- Tenant onboarding, license-entry, and device-registration screens remain evidence-gated; current backend contracts alone do not justify inventing a new first-run Auth flow.

## Accidental verification artifact
`probe-core-system` is an unintended Supabase Production Edge Function created during a verification attempt. Its presence is confirmed, its body is a static `ok` response, and the currently exposed Supabase tool surface provides no function-delete operation. It is not referenced by the repository and is not part of the application contract. It remains an operational cleanup item requiring removal through a supported Supabase administrative path.

## Verification policy
A stage is not closed until its required implementation/inspection, verification, and roadmap update are complete. DB-changing stages require Production read-back. Browser-blocked stages never receive a false interactive E2E claim. Vercel deployment state is checked for active source changes before closure.

## Definition of Done
The repair program is complete when active code and DB contracts align with Constitution + Blueprint, RLS/Auth/tenant isolation remain intact, scoring contract remains intact, final CI passes install/build/tsc/tests, runtime verification is performed wherever technically available, Vercel Production is READY for the final verified commit, Supabase Production is verified for every DB-changing stage, and all evidence-gated items are explicitly documented rather than implemented speculatively.

## P94 verification record
P94 was closed after source verification, Production feature-flag data read-back, and Vercel Production readiness verification. The final implementation preserves tenant-specific-over-global precedence and tier validation while excluding all soft-deleted rows from operational consumers.
