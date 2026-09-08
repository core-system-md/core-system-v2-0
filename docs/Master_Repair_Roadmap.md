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
- P62 implementation commit: `f9369e1c0bfc1f478f8279ac1b1971ea53a3b606`
- P63 implementation commit: `cded709b722435bdf6d5d70c6e0160fd92b8fa8a`
- Latest roadmap commit: `43932f835a27c667f1d1ba9237ce1bab978a6005`
- Supabase Production ref: `gobdznqbdaklkkqbkynx`
- Vercel project: `core-system-v2-0`
- Last previously verified Production deployment at roadmap normalization: commit `df88753a85106c29dc53c4b6c2786351de83a1fa`, state `READY`
- Last previously verified Vercel runtime-error check: no runtime errors found in the selected recent window.
- Last previously verified Supabase read-only state: PostgreSQL `17.6`; verification timestamp `2026-09-08 09:20:26+00`.

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
- P62 CoreScoreWidget Integration — CLOSED
- P63 OfflineBanner Integration — CLOSED

## 6. Important Current-State Corrections
Older planning material described the survey as broken after Page 2. That is no longer current evidence.
The active survey contains Page 1–5 and uses the `save_patient_intake_page` persistence path with page-order/range validation.

Older planning material treated `core_rules_config` and `feature_flags` tenant scoping as unresolved design choices. The current Blueprint specifies `tenant_id NULL` as the global/default case and supports tenant-specific rows.

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

## 13. P62 — CoreScoreWidget Integration
Status: `CLOSED`
Classification: `CONFIRMED`
Evidence:
- Active `DoctorSessionView.tsx` already reads `session.core_score_display` from the tenant/doctor-scoped session query.
- Active `src/components/CoreScoreWidget.tsx` accepts a display score on the required 0–100 scale.
- P62 wired the existing `core_score_display` value into the widget without changing scoring logic, weights, RPCs, RLS, or protected Doctor components.
- GitHub Actions Build Test run `34209799855` passed install, build, TypeScript, and tests.
Runtime note:
- Interactive Production browser verification remains environment-blocked under P58; closure relies on source evidence plus CI.

## 14. Current Execution Queue
### P63 — OfflineBanner Integration
Status: `CLOSED`
Classification: `CONFIRMED`
Evidence:
- `src/App.tsx` now imports and renders the existing `OfflineBanner` at the application root.
- `OfflineBanner` already consumed `useNetworkStatus`; the network hook was not rewritten.
- GitHub Actions Build Test run `34209854721` passed install, build, TypeScript, and tests.
Runtime note:
- Live online/offline browser transition remains unavailable in the current Production browser environment under P58.

### P64 — Theme Token Cleanup
Status: `READY`
Classification: `CONFIRMED / LOW RISK`
Scope:
- Reconcile confirmed `#1B2A4A` duplicates with the existing primary token only where semantic meaning matches.
- Preserve distinct values such as `#2a3d66` and protected token-definition files.
Verification:
- TypeScript
- Build
- Tests
- visual regression where available

### P65 — README Accuracy
Status: `READY`
Classification: `CONFIRMED / LOW RISK`
Scope:
- Update `README.md` only where statements are stale relative to verified current reality.
- Do not add unsupported claims.
Verification:
- Documentation readback
- Build/test regression after any source-adjacent change

### P66 — Console Cleanup
Status: `READY`
Classification: `CONFIRMED / LOW RISK`
Scope:
- Audit active `console.*` usage.
- Remove debug-only logs where safe.
- Preserve meaningful runtime/error logs.
- Avoid behavior changes.
Verification:
- TypeScript
- Build
- Tests

### P67 — HotSwapSuggestion Integration
Status: `READY`
Classification: `CONFIRMED / UI WIRE`
Scope:
- Inspect the active HotSwap/Sandler/Doctor flow and existing `HotSwapSuggestion` component or implementation evidence.
- Wire only an already-defined suggestion surface into the correct doctor session context.
- Do not invent recommendation rules or scoring logic.
Verification:
- TypeScript
- Build
- Tests
- local/allowed browser check where possible

### P68 — QuickInvoice Integration
Status: `READY`
Classification: `CONFIRMED / UI WIRE`
Scope:
- Inspect the active QuickInvoice/financial flow and existing contract.
- Wire existing billing data only where authoritative evidence exists.
- Preserve integer/bigint financial subunits and existing payment contracts.
- No Stripe webhook or financial schema changes in this stage.
Verification:
- TypeScript
- Build
- Tests

### P69 — SurveyRouter Orphan/Flow Reconciliation
Status: `READY`
Classification: `CONFIRMED / CLEANUP`
Scope:
- Verify active `SurveyRouter` and all Page1–5 imports/usages.
- Remove only demonstrably orphaned references or stale dead paths.
- Do not change survey persistence contract or page rules.
Verification:
- TypeScript
- Build
- Tests
- route-level source verification

### P70 — AuditTrailViewer
Status: `READY`
Classification: `CONFIRMED / BLUEPRINT UI`
Scope:
- Reconcile active clinic-admin audit viewer against the Blueprint contract.
- Use existing audit data sources only.
- Do not invent audit event schema or bypass RLS.
Verification:
- TypeScript
- Build
- Tests
- allowed runtime verification where available

### P71 — BreachLog
Status: `READY`
Classification: `CONFIRMED / BLUEPRINT UI`
Scope:
- Reconcile the clinic-admin breach viewer against the Blueprint contract.
- Use existing breach/audit evidence only.
- No new security semantics or RLS weakening.
Verification:
- TypeScript
- Build
- Tests

### P72 — GlobalHealthScores
Status: `READY`
Classification: `CONFIRMED / BLUEPRINT UI`
Scope:
- Verify whether an active Global Health Scores surface exists and whether the data contract is already established.
- Implement only the evidenced portion.
- Stop on missing authoritative data contract.
Verification:
- TypeScript
- Build
- Tests

### P73 — Billing UI Program
Status: `READY`
Classification: `CONFIRMED / SPLIT EXECUTION`
Substages:
- P73-A Billing shell and navigation surface.
- P73-B Subscription/trial display using existing tenant fields.
- P73-C Manual activation surface only where existing authorization/data contracts are evidenced.
- P73-D Stripe UI surface only around the already-protected backend/webhook contract.
Rules:
- No financial schema redesign.
- No new billing rules.
- No webhook authentication change.
Verification:
- TypeScript
- Build
- Tests
- production-safe read-only verification of relevant configuration where available

### P74 — `deleted_at` Schema Compliance
Status: `READY`
Classification: `CONFIRMED / DB CONTRACT`
Scope:
- Target only tables confirmed by Constitution/Blueprint to require `deleted_at` and not covered by an explicit Global Reference Table exception.
- Reconcile schema gaps with minimal migrations only after targeted Production evidence.
Protected:
- No RLS redesign.
- No physical deletes.

### P75 — Soft-Delete Enforcement
Status: `READY`
Classification: `CONFIRMED / DB BEHAVIOR`
Scope:
- Enforce `deleted_at = NOW()` in active delete-like paths where evidence shows physical deletion or missing soft-delete semantics.
- Update reads to exclude deleted rows only where required and evidenced.
- No broad speculative query rewrite.

### P76 — Timestamp Compliance
Status: `READY`
Classification: `CONFIRMED / DB CONTRACT`
Scope:
- Reconcile missing `created_at` / `updated_at` only where Constitution/Blueprint requires them and targeted schema evidence confirms a gap.
- Preserve existing timestamp trigger/default semantics where correct.

### P77 — `core_rules_config` Reconciliation
Status: `READY`
Classification: `CONFIRMED / CONFIG CONTRACT`
Scope:
- Verify global default (`tenant_id IS NULL`) and tenant override semantics against Blueprint.
- Reconcile only confirmed data/config drift.
- Preserve existing locked scoring weights unless a direct authoritative contradiction is found.

### P78 — `feature_flags` Reconciliation
Status: `READY`
Classification: `CONFIRMED / CONFIG CONTRACT`
Scope:
- Verify global default and tenant-specific override semantics.
- Reconcile only confirmed schema/policy/data drift.
- Do not invent flags or access rules.

### P79 — Empty/Redundant Migration Cleanup
Status: `READY`
Classification: `INSUFFICIENT EVIDENCE UNTIL REMOTE HISTORY CHECK`
Scope:
- Compare repository migration files against remote migration history metadata.
- Remove/rename only files confirmed as safe duplicates or inert artifacts.
- No destructive migration-history manipulation.

### P80 — `domain_backup` Disposition
Status: `READY`
Classification: `INSUFFICIENT EVIDENCE / ARCHITECTURAL DECISION`
Scope:
- Determine whether `archive/domain_backup` is referenced by active code/build and whether it has operational value.
- Do not delete or relocate archive content without evidence-backed decision.

### P81 — Legacy Doctor Screen Verification
Status: `READY`
Classification: `CONFIRMED / VERIFY FIRST`
Scope:
- Verify whether legacy Doctor screens remain referenced by active routes/imports.
- Protected active Doctor files remain untouched unless directly in scope.
- No archive edits merely for cleanup.

### P82 — Bundle Optimization
Status: `READY`
Classification: `CONFIRMED / LOW RISK`
Scope:
- Use build output/evidence to identify safe bundle-size wins.
- Prefer existing lazy-loading/chunking patterns.
- No dependency additions, framework changes, or broad refactors.
Verification:
- Build
- TypeScript
- Tests
- compare module/chunk evidence before/after

## 15. Evidence-Gated Work — Do Not Invent
The following remain blocked until authoritative evidence exists:
- P56 retention automation rules and ownership/workflow semantics.
- P57 Survey → CORE Score numeric mapping coefficients/lookup rules.
- Full production interactive browser E2E while the environment remains blocked.
- Concrete event-handler implementations named by Blueprint unless their active contracts are evidenced.
- Real WhatsApp/SMS/email provider adapter behavior unless the existing provider contract/config is verified.
- Supabase Advisor remediations that alter RLS/Auth/permissions without intent-level evidence.

## 16. Global Stop Conditions
Stop the active stage and report the evidence if any change would require:
- unexpected schema change outside the current stage;
- RLS, Auth, permission, or tenant-isolation changes;
- scoring formula/weights changes;
- new business rules not present in Constitution/Blueprint;
- new npm dependency;
- protected-file rewrite;
- archive mutation without explicit stage evidence;
- provider integration that is not already contractually established;
- destructive migration history changes;
- false or unavailable runtime verification.

## 17. Definition of Done
The repair program is complete only when:
- active code aligns with Blueprint architecture;
- database contract aligns with Constitution + Blueprint, subject to explicit evidence-gated exceptions;
- RLS/Auth/tenant isolation remain verified;
- scoring contract remains unchanged except for explicitly closed evidence-backed fixes;
- CI passes install + build + TypeScript + tests for final repair commits;
- runtime verification is performed wherever the environment permits it;
- Vercel Production is READY for the final verified commit;
- Supabase Production is verified for every DB-affecting stage;
- this roadmap is updated after every closed stage;
- all evidence-gated items are explicitly documented rather than implemented speculatively.
