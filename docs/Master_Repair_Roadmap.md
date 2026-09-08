# CORE SYSTEM v2.1 — MASTER REPAIR ROADMAP

## 1. Purpose
This file is the single operational roadmap for the current repair program.
It supersedes older planning-only repair lists when they conflict with current repository, Supabase, Vercel, Constitution, or Blueprint evidence.

## 2. Authoritative Sources
- `docs/Constitution.md` — immutable technical rules.
- `docs/Blueprint.md` — implementation architecture and database contract.
- Current GitHub `main` — authoritative repository state.
- Verified Production Supabase project — authoritative database/runtime contract when inspected.
- Verified Vercel Production deployment — authoritative deployment state.

Method:
`Evidence First → Constitution First → Blueprint First → Minimal → Surgical → Verification Before Closure`

Reporting:
`Claim → Evidence → Classification → Confidence`

Allowed classifications:
`CONFIRMED | LIKELY | INSUFFICIENT EVIDENCE | NOT FOUND | NOT APPLICABLE`

## 3. Current Verified Baseline
- Repository: `core-system-md/core-system-v2-0`
- Branch: `main`
- Latest code/test commit verified: `30f268f6d1e38f57cf7b00df4b87f071daf992d7`
- Latest roadmap commit before this normalization: `df88753a85106c29dc53c4b6c2786351de83a1fa`
- Supabase Production ref: `gobdznqbdaklkkqbkynx`
- Vercel project: `core-system-v2-0`
- Latest verified Production deployment at normalization: commit `df88753a85106c29dc53c4b6c2786351de83a1fa`, state `READY`
- Latest Vercel runtime-error check at normalization: no runtime errors found in the selected recent window.
- Supabase read-only verification at normalization: PostgreSQL `17.6`; verification timestamp `2026-09-08 09:20:26+00`.

## 4. Constitutional Guardrails
- React + Vite + TypeScript + Tailwind + Zustand + Supabase + React Router + Vercel remain the active stack.
- No framework migration.
- No new npm library without explicit approval.
- No Redux or parallel state architecture.
- No alternative authentication architecture.
- No physical deletes.
- Financial values use integer/bigint subunits; no FLOAT for monetary results.
- CORE Score weights remain APS 0.28, DRI 0.24, RVS 0.20, URI 0.15, TSI 0.13.
- Backend score scale remains 0–1000; display remains backend/10.
- Tenant-owned data remains tenant isolated.
- RLS must not be weakened or disabled.
- Protected or archived code is not altered without evidence and explicit stage scope.

## 5. Closed Work — Do Not Reopen Without New Evidence
Historical closed phases:
- P0–P19
- P22
- P28
- P30-B
- P31
- P32
- P33
- P35
- P36
- P38
- P39-C
- P40-B
- P41-B
- P42-E

Current closed work:
- P0-1 Patient Survey UI Pipeline — CLOSED
- P0-2 Survey persistence / page-order validation — CLOSED
- P0-3 Survey persistence integration — CLOSED
- Reception PIN-session operations — CLOSED
- Reception Queue Realtime Broadcast — CLOSED
- Auth/JWT app_metadata alignment — CLOSED
- Core Score backend authorization hardening — CLOSED
- Core Score LTV input hardening — CLOSED
- Cron Edge Function authentication and request construction — CLOSED
- Leakage detector RPC contract restoration — CLOSED
- Doctor score path routed through `CoreScoreEngine` — VERIFIED
- `score-calculator` Production function — ACTIVE, JWT verification enabled
- Notification processor false-success repair — CLOSED
- P54 Analytics Snapshot RPC contract alignment — CLOSED
- P55 Automated Test Foundation — CLOSED
- P59 EventBus score-event contract repair — CLOSED
- P60 PQS penalty rounding contract repair — CLOSED
- P61 Daily snapshot RPC wrapper contract repair — CLOSED

## 6. Important Current-State Corrections
Older planning material described the survey as broken after Page 2. That is no longer current evidence.
The active survey now contains Page 1–5 and uses the `save_patient_intake_page` persistence path with page-order/range validation.

Older planning material treated `core_rules_config` and `feature_flags` tenant scoping as unresolved design choices. The current Blueprint already specifies `tenant_id NULL` as the global/default case and supports tenant-specific rows.

Older planning material treated Page 5 signature/WhatsApp behavior as an unresolved product choice. The current Blueprint specifies `Page5ConsentSign` as `SVG signature + WhatsApp redirect`.

Therefore none of the above are current blockers by themselves.

## 7. P56 — Retention / Follow-up Automation
Classification: `INSUFFICIENT EVIDENCE`

Confirmed:
- Production `retention_followups` exists.
- Core columns match the Blueprint contract.
- Production includes a tenant-scoped pending index on `scheduled_for`.
- No user-defined trigger was found on `retention_followups` or `notification_queue` during targeted inspection.
- No dedicated retention automation function was found.
- The active repository does not establish a complete retention service/UI/automation contract.

Do not implement scheduling, ownership, message generation, or follow-up workflow rules without authoritative evidence.

## 8. P57 — Survey → CORE Score Numeric Mapping
Classification: `INSUFFICIENT EVIDENCE`

Confirmed:
- Survey captures readiness, follow-up importance, main concern, priorities, openness, decision factor, and referral source.
- Persistence validates and stores raw answers.
- Blueprint provides directional relationships to CORE indicators.
- No authoritative numeric coefficients or lookup tables were found in Constitution, Blueprint, active source, migrations, or Production `core_rules_config`.

Do not invent numeric mapping rules.

## 9. P58 — Browser E2E
Classification: `INSUFFICIENT EVIDENCE / environment-blocked`

Confirmed:
- Playwright and Chromium are available.
- Production browser navigation from the current execution environment is blocked.
- Vercel Production is SSO protected.
- No interactive Production E2E result is claimed.

Local/allowed browser execution may be added when technically possible.

## 10. P59 — EventBus Score Event Contract
Classification: `CONFIRMED — CLOSED`

Evidence:
- `CoreScoreEngine` emits `score:calculated`.
- Shared score event constant is aligned to the same event name.
- Regression coverage exists.
- CI passed for the repair.

## 11. P60 — PQS Penalty Rounding Contract
Classification: `CONFIRMED — CLOSED`

Evidence:
- Constitution/Blueprint require percentage penalty first, then final backend rounding.
- Active scoring logic was repaired to preserve the unrounded penalty.
- Regression coverage was added.
- CI passed.

## 12. P61 — Daily Snapshot RPC Wrapper Contract
Classification: `CONFIRMED — CLOSED`

Evidence:
- Legacy wrapper path called `generate_daily_snapshot(date)`.
- Canonical Production/Blueprint path is `compute_daily_snapshot(tenant_id, date)`.
- Wrapper now targets the canonical RPC and returns a typed 13-field `DailySnapshot` contract.
- Production read-only execution returned all expected keys.
- CI passed for install, build, TypeScript, and tests.

## 13. Current Execution Queue
### P62 — CoreScoreWidget Integration
Status: `READY`
Classification: `CONFIRMED / WIRE`
Scope:
- Inspect `src/features/doctor/DoctorSessionView.tsx` and current score data source.
- Inspect active `CoreScoreWidget.tsx` and its current prop contract.
- Wire the existing score data into the widget with the minimum required change.
Protected:
- Do not modify `CoreScoreEngine`, scoring weights, DoctorLayout, AllergyGate, ClinicalNotes, or CloseSession unless a new evidence-backed scope is created.
Verification:
- TypeScript
- Build
- Tests
- Runtime verification on a real/authorized session where available
Closure:
- Widget renders correct existing score data without regression.

### P63 — OfflineBanner Integration
Status: `READY`
Classification: `CONFIRMED / WIRE`
Scope:
- Inspect `src/App.tsx`, `OfflineBanner.tsx`, and `NetworkMonitor.ts`.
- Wire the existing network state into the banner at the correct application level.
Protected:
- Do not rewrite NetworkMonitor without evidence.
Verification:
- TypeScript
- Build
- Tests
- Online/offline transition verification where available

### P64 — Theme Token Cleanup
Status: `READY`
Classification: `CONFIRMED / LOW RISK`
Scope:
- Reconcile confirmed `#1B2A4A` duplicates with the existing primary token.
- Only replace occurrences whose semantic/color meaning matches the token.
Protected:
- `globals.css`
- Tailwind token definitions
- distinct color values such as `#2a3d66`
Verification:
- TypeScript
- Build
- visual regression where available

### P65 — README Accuracy
Status: `READY`
Classification: `CONFIRMED / LOW RISK`
Scope:
- Update `README.md` only where its statements are stale relative to verified current reality.
- Do not add unsupported claims.

### P66 — Console Cleanup
Status: `READY`
Classification: `CONFIRMED / LOW RISK`
Scope:
- Audit active `console.*` usage.
- Remove debug-only logs where safe.
- Preserve meaningful runtime/error logs.
- Avoid behavior changes.

### P67 — HotSwapSuggestion
Status: `READY`
Classification: `CONFIRMED GAP`
Scope:
- First establish the active room/occupancy/vacancy data source from current code and `clinic_rooms` usage.
- Adapt and integrate the existing feature only after the data contract is confirmed.
Protected:
- Existing SLA/lock logic in `LiveQueueBoard.tsx` remains intact unless a narrowly scoped integration hook is proven necessary.
Verification:
- TypeScript
- Build
- Tests
- Reception runtime verification

### P68 — QuickInvoice
Status: `READY`
Classification: `CONFIRMED GAP`
Scope:
- Reuse the existing `SimpleInvoice.tsx` pattern and existing invoice types/table/RLS/financial conventions.
- No new financial rule.
Verification:
- TypeScript
- Build
- Tests
- Controlled invoice insertion and permission verification where safe

### P69 — Orphan SurveyRouter Cleanup
Status: `READY AFTER P69 PRECHECK`
Classification: `CONFIRMED DEAD CODE`
Scope:
- Re-run an import search immediately before deletion.
- Delete only `src/components/SurveyRouter.tsx` if zero active references remain.
Protected:
- `src/features/survey/SurveyRouter.tsx`
Verification:
- TypeScript
- Build
- Tests

## 14. Product Feature Queue
### P70 — AuditTrailViewer
Classification: `CONFIRMED GAP`
- Read-only viewer for `audit_trail`.
- Verify current RLS before UI wiring.
- Role boundaries must remain consistent with the established policy.

### P71 — BreachLog
Classification: `CONFIRMED GAP`
- Read-only viewer for `system_delivery_breaches`.
- No invented remediation workflow.

### P72 — GlobalHealthScores
Classification: `CONFIRMED GAP`
- Read existing `tenant_health_scores`.
- Do not rewrite health-score computation.

### P73 — Billing UI
Classification: `CONFIRMED GAP`
Substages:
- P73-A Billing shell
- P73-B Subscription/trial state
- P73-C Manual activation UI
- P73-D Stripe UI surface
Protected:
- Existing `stripe-webhook` implementation is not rewritten as part of UI work.
No external provider behavior may be invented.

## 15. Database Governance Queue
### P74 — `deleted_at` Schema Compliance
Classification: `CONFIRMED REQUIREMENT, CURRENT GAP TO REVERIFY`
Before writing migration:
- Inspect current Production schema.
- Compare every current table against Constitution and official global-reference exceptions.
- Do not rely on old table counts.
If gaps remain:
- Add a new migration only.
- Do not rewrite historical migrations.
- Review RLS and triggers before Production application.
- Use a non-Production environment if one actually exists and is available.

### P75 — Soft Delete Query Enforcement
Classification: `CONFIRMED REQUIREMENT`
- After P74 only.
- Identify active queries that violate the established soft-delete read/write contract.
- Correct only evidence-backed paths.
- Do not perform a blind repository-wide rewrite.

### P76 — Timestamp Compliance
Classification: `CONFIRMED REQUIREMENT, CURRENT GAP TO REVERIFY`
- Reconcile `created_at`/`updated_at` type/default coverage against current Production and Constitution.
- Prefer combining proven schema changes with P74 when scope remains safe.

### P77 — `core_rules_config` Reconciliation
Classification: `BLUEPRINT CONTRACT RESOLVED`
Expected contract:
- `tenant_id NULL` = global default.
- tenant-specific row = override.
Action:
- Verify current Production schema, RLS, and active source.
- Change only if a current deviation is confirmed.

### P78 — `feature_flags` Reconciliation
Classification: `BLUEPRINT CONTRACT RESOLVED`
Expected contract:
- `tenant_id NULL` = global flag.
- tenant-specific row = tenant override.
Action:
- Verify current Production schema, RLS, and active source.
- Change only if a current deviation is confirmed.

### P79 — Empty Migration Cleanup
Classification: `CONFIRMED LOCALLY / REMOTE STATE MUST BE VERIFIED`
- Read-only verify the target migration files and remote migration state.
- Delete only after safety is established.

## 16. Architecture / Optional Queue
### P80 — `domain_backup` Disposition
Classification: `INSUFFICIENT EVIDENCE`
Default handling:
- Keep as archive/reference.
- Do not revive the architecture merely because the Blueprint defines a domain layer.
- Do not delete without a deliberate decision.

### P81 — Legacy Doctor View Verification
Classification: `LIKELY SUPERSEDED`
Inspect:
- `MyQueueView`
- `ParDecisionPanel`
- `PatientSessionView`
Only delete after current zero-reference evidence and a dedicated scope.

### P82 — Bundle Optimization
Classification: `CONFIRMED BUILD OPTIMIZATION`
- Analyze current Vite output.
- Prefer code-splitting/dynamic import and existing dependency optimization.
- No new npm library without explicit approval.

## 17. Evidence-Gated Open Areas — Do Not Invent
### Survey Numeric Mapping
Still open due to absent authoritative numeric coefficients.

### Retention Automation
Still open due to absent scheduling/ownership/message contracts.

### Notification Adapters
Still open due to absent provider contract, configured provider/secrets, and approved delivery behavior.

### Event Handlers
Still open due to absent concrete side-effect contracts for Blueprint-named handlers.

### Production Browser E2E
Still environment-blocked from this execution environment.

### Supabase Advisor Findings
Remain open until each advisory item receives an explicit contract/intent decision. No blanket RLS/grant/extension remediation.

## 18. Stop Conditions
Stop the current stage and re-scope if any of the following becomes necessary:
- unexpected DB schema change outside the current stage
- RLS modification
- Auth/role/permission redesign
- scoring formula change
- business rule invention
- new package
- protected file rewrite
- architecture migration
- external provider contract invention
- direct contradiction with Constitution or Blueprint

Record the result as `STOP — OWNER REVIEW REQUIRED` and preserve all verified evidence.

## 19. Verification Standard
For every code stage, use as applicable:
- `npm install`
- `npm run build`
- `npx tsc --noEmit`
- `npm run test`
- targeted runtime verification

For DB stages:
- Production read-only inspection before change
- migration verification
- post-change schema/RLS/trigger verification

For Vercel-sensitive stages:
- deployment status verification
- runtime error verification

For browser stages:
- only claim E2E when the browser actually executed the flow.

## 20. Git / Commit Rules
- Never use `git add .` or `git add -A`.
- Target files only.
- Each closed stage gets a focused commit.
- Roadmap changes must be part of the documented stage closure or a dedicated docs closure commit.
- Do not rewrite unrelated history.

## 21. Stage Closure Rule
A stage can be marked `CLOSED` only when:
1. The intended implementation or verification is complete.
2. Required tests pass.
3. Runtime/Production verification is complete where applicable.
4. No scope violation occurred.
5. This roadmap is updated with evidence and next stage.

## 22. Immediate Next Stage
`P62 — CoreScoreWidget Integration`

First action:
Read and reconcile the active `DoctorSessionView` score data source and the current `CoreScoreWidget` contract.
Then execute the minimum safe wiring, verify it, and close P62 only after evidence is complete.
