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
- CORE backend remains 0–1000; display remains 0–100.
- Protected active Doctor files remain untouched unless directly scoped.
- Archive content is read-only unless explicit evidence-backed disposition is approved.
- No new npm dependency.
- No `git add .` / `git add -A`.

## Closed baseline
P0–P19, P22, P28, P30-B, P31, P32, P33, P35, P36, P38, P39-C, P40-B, P41-B, P42-E — CLOSED.

Additional closed repairs: P0-1, P0-2, P0-3, Reception PIN-session operations, Reception Queue Realtime Broadcast, Auth/JWT app_metadata alignment, Core Score authorization and LTV hardening, cron request/auth fixes, leakage RPC restoration, Doctor score path through CoreScoreEngine, production score-calculator JWT authorization, notification false-success repair, P54, P55, P59, P60, P61.

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
Blueprint defines QuickInvoice, but repository implementation found is only `archive/features_backup/reception/QuickInvoice.tsx`; active code contains a different `SimpleInvoice` contract. Do not promote archived QuickInvoice without an active billing contract.

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
Production evidence found two active `create_pin_session` overloads physically deleting prior `pin_sessions`, while active PIN-session readers and the Realtime broadcast function selected sessions by token/expiry. Production migration `p75_soft_delete_pin_sessions` replaced those PIN-session physical deletes with `deleted_at = now()` and added `deleted_at IS NULL` to all active PIN-session lookup paths, preserving all RPC signatures and return contracts. Production migration history now records `20260908134459 / p75_soft_delete_pin_sessions`; read-back verified no physical `DELETE FROM public.pin_sessions` remains in the targeted functions. Repository migration: `supabase/migrations/053_p75_soft_delete_pin_sessions.sql`. The generic offline `SyncEngine.applyMutation()` delete branch remains unchanged because no active caller enqueuing `operation: 'delete'` was evidenced; this residual infrastructure path is intentionally not broadened beyond the proven PIN-session scope.

### P76 — Timestamp Compliance
`CLOSED — CONFIRMED`.
Production timestamp gaps were repaired on `analytics_events`, `analytics_patient_metrics`, `audit_trail`, `billing_events`, `inventory_ledger`, `notification_queue`, `pin_attempt_log`, `pin_sessions`, `system_delivery_breaches`, and `tenant_devices`. Historical timestamps were reused from `occurred_at`/`registered_at` or existing `created_at` where available. Production verification confirmed `NOT NULL DEFAULT now()` for the added timestamps. Repository migration: `supabase/migrations/045_p76_governance_timestamp_columns.sql`.

### P77 — `core_rules_config`
`CLOSED — CONFIRMED`.
Production schema matches the global-default/tenant-override model. Current active rows are global defaults; no tenant overrides exist. The CORE weight row exactly matches APS 0.28, DRI 0.24, RVS 0.20, URI 0.15. No corrective write was required.

### P78 — `feature_flags`
`CLOSED — CONFIRMED`.
Production supports global (`tenant_id IS NULL`) and tenant-specific rows and has `uq_feature_flag`. Eight global keys had duplicate active rows due PostgreSQL NULL uniqueness semantics. The oldest identical row per key was preserved, duplicates were soft-deleted, and partial unique index `uq_feature_flags_global_active` now enforces one active global row per key. CI `34210803299` passed install/build/tsc/tests. Repository migration: `supabase/migrations/046_p78_feature_flag_global_deduplication.sql`.

### P79 — Migration History Cleanup
`BLOCKED — INSUFFICIENT EVIDENCE`.
Production `supabase_migrations.schema_migrations` is timestamp-based and does not numerically mirror the repository's `001..046` filenames. No destructive history rewrite, rename, or deletion was performed. A dedicated reconciliation procedure is required before cleanup.

### P80 — `domain_backup` Disposition
`CLOSED — CONFIRMED`.
No active source reference to `archive/domain_backup` was found. Archive remains preserved as reference material; no mutation was performed.

### P81 — Legacy Doctor Screen Verification
`CLOSED — CONFIRMED`.
Blueprint names `MyQueueView` and `PatientSessionView`, but current implementations are archive-only; active routing uses `DoctorTodayPatients` and `DoctorSessionView`. No restoration or archive deletion was justified.

### P82 — Bundle Optimization
`CLOSED — CONFIRMED`.
CI build evidence established a concrete entry-chunk bottleneck: before the targeted change, `index-C3PaUPIe.js` was 547.73 kB (gzip 160.86 kB). The active router already lazy-loaded feature pages, but `CoreRulesConfigManager` was still statically imported; it was converted to the same lazy/Suspense pattern used by the rest of the feature routes. Verified CI run `34233714542` passed install/build/tsc/tests and measured `index-dZ9c9ZMy.js` at 539.68 kB (gzip 158.55 kB), with a separate `CoreRulesConfigManager-XT2mn8J_.js` chunk at 6.42 kB (gzip 2.53 kB). The Vercel Production deployment for commit `12bd7ef4d50b55d4f7cd66f6507c6cf209af2865` is `READY`. The entry chunk remains above Vite's 500 kB warning threshold, so no speculative manual chunking or dependency changes were introduced; the residual warning is explicitly recorded rather than hidden.

## Evidence-gated work that remains blocked
- P56 retention/follow-up automation semantics and provider workflow.
- P57 Survey → CORE numeric mapping coefficients/lookup rules.
- P67 HotSwapSuggestion generator/behavior contract.
- P68 QuickInvoice active contract.
- P72 cross-tenant GlobalHealthScores access contract; current RLS does not establish it.
- P73-D additional Stripe UI workflow contract.
- P79 migration-history reconciliation procedure.
- Full Production interactive browser E2E while environment/SSO blocks navigation.
- Concrete event-handler implementations where active contracts are not evidenced.
- Real WhatsApp/SMS/email adapters without verified provider contract/config.
- Supabase Advisor remediation that would alter RLS/Auth/permissions without intent-level evidence.
- Generic offline soft-delete behavior beyond the proven PIN-session lifecycle until an active enqueue contract is evidenced.

## Verification policy
A stage is not closed until its required implementation/inspection, verification, and roadmap update are complete. DB-changing stages require Production read-back. Browser-blocked stages never receive a false interactive E2E claim. Vercel deployment state is checked for active source changes before closure.

## Definition of Done
The repair program is complete when active code and DB contracts align with Constitution + Blueprint, RLS/Auth/tenant isolation remain intact, scoring contract remains intact, final CI passes install/build/tsc/tests, runtime verification is performed wherever technically available, Vercel Production is READY for the final verified commit, Supabase Production is verified for every DB-changing stage, and all evidence-gated items are explicitly documented rather than implemented speculatively.
