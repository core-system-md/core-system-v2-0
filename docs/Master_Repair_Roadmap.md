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

## Previously closed baseline
P0–P19, P22, P28, P30-B, P31, P32, P33, P35, P36, P38, P39-C, P40-B, P41-B, P42-E — CLOSED.

Additional closed repairs:
- P0-1 Patient Survey UI Pipeline
- P0-2 Survey persistence/page-order validation
- P0-3 Survey persistence integration
- Reception PIN-session operations
- Reception Queue Realtime Broadcast
- Auth/JWT app_metadata alignment
- Core Score authorization hardening
- Core Score LTV input hardening
- Cron authentication/request construction
- Leakage detector RPC restoration
- Doctor score path through `CoreScoreEngine`
- Production `score-calculator` JWT authorization
- Notification processor false-success repair
- P54 Analytics Snapshot contract
- P55 Automated Test Foundation
- P59 EventBus score-event contract
- P60 PQS penalty rounding contract
- P61 Daily snapshot RPC wrapper contract

## Current repair status
### P62 — CoreScoreWidget Integration
Status: `CLOSED` — `CONFIRMED`.
Evidence: existing tenant/doctor-scoped `core_score_display` is rendered by the existing CoreScoreWidget in Doctor Session; scoring logic and protected components were not changed. CI `34209799855` passed install/build/tsc/tests.

### P63 — OfflineBanner Integration
Status: `CLOSED` — `CONFIRMED`.
Evidence: existing OfflineBanner is rendered at the app root; network detection hook was not rewritten. CI `34209854721` passed install/build/tsc/tests.

### P64 — Theme Token Cleanup
Status: `CLOSED` — `CONFIRMED`.
Evidence: semantic hard-coded primary styling was converted to the existing `primary` token in active App/Auth/Router/Admin/Reception/SuperAdmin/Invoice surfaces. Archive, protected DoctorLayout, and token definition files were not changed. Final cumulative CI `34210216895` passed.

### P65 — README Accuracy
Status: `CLOSED` — `CONFIRMED`.
Evidence: stale migration/function counts and obsolete “Next: UI Layer” wording were replaced with verified current state. Final cumulative CI `34210216895` passed.

### P66 — Console Cleanup
Status: `CLOSED` — `CONFIRMED`.
Evidence: debug-only console logs were removed from TenantProvider and RealtimeProvider; meaningful error/warn logs were preserved. Final cumulative CI `34210216895` passed install/build/tsc/tests.

### P67 — HotSwapSuggestion
Status: `BLOCKED` — `INSUFFICIENT EVIDENCE`.
Evidence: Blueprint defines the UI and active shared type exists, but the actual component found is only in `archive/features_backup/reception/HotSwapSuggestion.tsx`; no active generator/service/handler contract was found. Do not restore archived UI or invent swap rules.

### P68 — QuickInvoice
Status: `BLOCKED` — `INSUFFICIENT EVIDENCE`.
Evidence: Blueprint defines QuickInvoice, but repository implementation found is only `archive/features_backup/reception/QuickInvoice.tsx`; active code contains a different `SimpleInvoice` contract. Do not promote archived QuickInvoice without an active billing contract.

### P69 — SurveyRouter Orphan/Flow Reconciliation
Status: `CLOSED` — `CONFIRMED`.
Evidence: active route imports `src/features/survey/SurveyRouter.tsx`; no active import of `src/components/SurveyRouter.tsx` was found. The stale placeholder `src/components/SurveyRouter.tsx` was deleted. Survey persistence/page rules were unchanged.
CI/runtime verification: production interactive browser remains blocked under P58; source/CI verification is used.

### P70 — AuditTrailViewer
Status: `BLOCKED` — `INSUFFICIENT EVIDENCE`.
Evidence: Blueprint defines the surface, but current implementation found is only `archive/features_backup/clinic-admin/AuditTrailViewer.tsx`. No active UI/data contract sufficient for a safe promotion was found.

### P71 — BreachLog
Status: `BLOCKED` — `INSUFFICIENT EVIDENCE`.
Evidence: Blueprint defines the surface, but current implementation found is only `archive/features_backup/clinic-admin/BreachLog.tsx`. No active UI/data contract sufficient for a safe promotion was found.

### P72 — GlobalHealthScores
Status: `BLOCKED` — `INSUFFICIENT EVIDENCE`.
Evidence: Blueprint defines the leaderboard, but current implementation found is only `archive/features_backup/super-admin/GlobalHealthScores.tsx`. No active data contract sufficient for a safe promotion was found.

### P73 — Billing UI Program
Status: `BLOCKED` — `INSUFFICIENT EVIDENCE`.
Evidence: active billing types and tenant subscription tier data exist, and Stripe webhook backend exists, but Blueprint billing screens are archived and no active billing module/route contract was found. Do not invent billing navigation, activation semantics, or subscription workflow.

### P74 — `deleted_at` Schema Compliance
Status: `CLOSED` — `CONFIRMED`.
Production evidence: eight tenant-owned tables lacked `deleted_at`: `analytics_daily_snapshots`, `analytics_events`, `analytics_patient_metrics`, `audit_trail`, `billing_events`, `notification_queue`, `pin_attempt_log`, `pin_sessions`. Global reference tables `currency_reference` and `medical_procedure_taxonomy` were excluded per their global-reference contract. Production migration applied: `p74_governance_deleted_at_columns`. Repository migration: `supabase/migrations/044_p74_governance_deleted_at_columns.sql`.
Verification query confirmed all eight columns exist as nullable `timestamptz`.

### P75 — Soft-Delete Enforcement
Status: `BLOCKED` — `INSUFFICIENT EVIDENCE`.
Evidence: the only active `.delete()` data path found is the generic `SyncEngine.applyMutation()` branch. No active caller enqueuing `operation: 'delete'` was found. Changing the generic path without an evidenced runtime contract could affect unrelated/global tables, so no behavioral rewrite was made.

### P76 — Timestamp Compliance
Status: `CLOSED` — `CONFIRMED`.
Production gaps fixed for `analytics_events` (`created_at`, `updated_at`), `analytics_patient_metrics` (`updated_at`), `audit_trail` (`updated_at`), `billing_events` (`updated_at`), `inventory_ledger` (`updated_at`), `notification_queue` (`updated_at`), `pin_attempt_log` (`updated_at`), `pin_sessions` (`updated_at`), `system_delivery_breaches` (`updated_at`), and `tenant_devices` (`created_at`, `updated_at`). Historical backfill reused `occurred_at` or `registered_at` where available, otherwise existing `created_at`. Production verification confirmed `NOT NULL DEFAULT now()` on all added timestamps. Repository migration: `supabase/migrations/045_p76_governance_timestamp_columns.sql`.

### P77 — `core_rules_config`
Status: `READY`.
Verify global defaults (`tenant_id IS NULL`) and tenant overrides against Blueprint; preserve locked score weights.

### P78 — `feature_flags`
Status: `READY`.
Verify global defaults and tenant overrides against Blueprint; reconcile only confirmed drift.

### P79 — Migration History Cleanup
Status: `IN PROGRESS / EVIDENCE ONLY`.
Production `supabase_migrations.schema_migrations` was inspected. Its active history is timestamp-based and does not numerically mirror the repository’s `001..` filenames. No remote migration-history mutation has been performed.

### P80 — `domain_backup` Disposition
Status: `READY`.
Read-only reference/build usage analysis first; no archive mutation without evidence.

### P81 — Legacy Doctor Screen Verification
Status: `READY`.
Verify active route/import reachability; protected active Doctor files remain untouched.

### P82 — Bundle Optimization
Status: `READY`.
Use build/module/chunk evidence for safe lazy-loading or chunking wins; no dependency or framework changes.

## Evidence-gated work that remains blocked
- P56 retention/follow-up automation semantics and provider workflow.
- P57 Survey → CORE numeric mapping coefficients/lookup rules.
- P67 HotSwapSuggestion generator/behavior contract.
- P68 QuickInvoice active contract.
- P70/P71/P72 archived-only admin/super-admin UI promotion contracts.
- P73 active billing UI/workflow contract.
- Full Production interactive browser E2E while environment/SSO blocks navigation.
- Concrete event-handler implementations where active contracts are not evidenced.
- Real WhatsApp/SMS/email adapters without verified provider contract/config.
- Supabase Advisor remediation that would alter RLS/Auth/permissions without intent-level evidence.

## Verification policy
A stage is not closed until its required implementation/inspection, verification, and this roadmap update are complete. For DB-changing stages, Production must be read back after the change. For browser-blocked stages, no interactive E2E claim is made.

## Definition of Done
The repair program is complete when active code and DB contracts align with Constitution + Blueprint, RLS/Auth/tenant isolation remain intact, scoring contract remains intact, CI passes final install/build/tsc/tests, runtime verification is performed wherever technically available, Vercel Production is READY for the final verified commit, Supabase Production is verified for every DB-changing stage, and all evidence-gated items are explicitly documented rather than implemented speculatively.
