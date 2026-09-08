# CORE SYSTEM v2.1 — MASTER REPAIR ROADMAP

## Source of Truth
- Constitution: `docs/Constitution.md` (immutable source of truth)
- Blueprint: `docs/Blueprint.md` (implementation source of truth)
- Method: Evidence First → Constitution First → Blueprint First → Minimal → Surgical → Verification Before Closure
- Reporting: Claim → Evidence → Classification → Confidence

## Current Baseline
- Branch: `main`
- Current HEAD: `8926b1670d9ef78c16d3d13c206e2e8dc1e60bbc`
- Supabase production ref: `gobdznqbdaklkkqbkynx`
- Vercel production target: `core-system-v2-0`

## Closed Work
- Historical phases: P0–P19, P22, P28, P30-B, P31, P32, P33, P35, P36, P38, P39-C, P40-B, P41-B, P42-E
- P0-1 Patient Survey UI Pipeline: CLOSED
- P0-2 Survey persistence / page-order validation: CLOSED
- P0-3 survey persistence integration: CLOSED / already implemented
- Reception PIN-session operations: CLOSED
- Reception Queue Realtime Broadcast: CLOSED
- Auth/JWT app_metadata alignment: CLOSED
- Core Score backend authorization hardening: CLOSED
- Core Score LTV input hardening: CLOSED
- Cron Edge Function authentication and request construction: CLOSED
- Leakage detector RPC contract restoration: CLOSED
- Doctor score path routed through `CoreScoreEngine`: VERIFIED
- `score-calculator` production function: ACTIVE, JWT verification enabled
- Notification processor false-success repair: CLOSED
- P54 Analytics Snapshot RPC contract alignment: CLOSED
- P55 Automated Test Foundation: CLOSED
- P59 EventBus score-event contract repair: CLOSED

## P55 Closure Evidence
- GitHub Actions Build Test run `34201341263` for `072c2a04d9a0b4aa99e3bce9529add10cd66b373`: SUCCESS.
- CI `npm install`: SUCCESS.
- CI `npm run build`: SUCCESS, 1959 modules transformed.
- CI `npx tsc --noEmit`: SUCCESS.
- CI `npm run test`: SUCCESS.
- Automated test suite: 2 files passed, 11 tests passed.
- Test coverage added for existing pure CORE score logic and existing EventBus behavior; no production database schema/RLS/auth changes were introduced by P55.
- Vercel production deployment for the tested HEAD `072c2a04d9a0b4aa99e3bce9529add10cd66b373`: READY.

## P56 Evidence Discovery — Retention / Follow-up Automation
- Classification: INSUFFICIENT EVIDENCE for implementation.
- Production `retention_followups` exists with the Blueprint-aligned scheduling, type, channel, delivery-status, response-tracking, and audit fields.
- Production constraints allow `post_visit_24h`, `post_visit_7d`, `reactivation_30d`, `reactivation_60d`, `reactivation_90d`, `appointment_reminder_24h`, `appointment_reminder_2h`, `birthday`, and `custom`.
- Production has the pending index `idx_followups_scheduled` on `(tenant_id, scheduled_for)` filtered by `delivery_status = 'pending'`.
- Targeted production trigger inspection found no user-defined triggers on `retention_followups` and no user-defined triggers on `notification_queue`.
- Targeted production function inspection found no dedicated retention/follow-up automation function; only the general `process_pending_notifications(p_batch_size integer)` matched the searched follow-up/notification naming pattern.
- Production `retention_followups` is currently empty; discovery queries did not mutate follow-up records.
- Active repository search did not establish an active Retention UI/service/automation implementation. The Blueprint names the retention contract and notification architecture, but does not provide enough concrete scheduling/ownership/message-generation rules to implement safely without business-rule invention.
- Result: no production or application change made for P56. The item remains open and evidence-blocked.

## P57 Evidence Discovery — Survey → CORE Score Numeric Mapping
- Classification: INSUFFICIENT EVIDENCE for implementation.
- Active `Page3BehavioralProfile` captures `readiness_level` 1–5, `decision_factor`, `referral_source`, and `followup_importance` 1–4.
- Active `Page4Expectations` captures up to two priorities, free-text `main_concern`, and `openness_to_proceed` 1–3.
- Migration `043_fix_patient_intake_page_order_null_guard.sql` validates the survey ranges and stores the raw answers, but does not convert them to APS/DRI/RVS/URI/TSI/PQS numeric indicators.
- Production `core_rules_config` contains only the CORE indicator weights and PQS penalty thresholds; it contains no survey-answer mapping table or numeric conversion coefficients.
- Targeted active-source searches for the survey field names and indicator terms found only the survey UI, persistence validation, type definitions, Blueprint directional mappings, and roadmap evidence; no authoritative numeric conversion implementation was found.
- Result: no scoring formula or lookup table was invented or changed. The mapping remains open pending an authoritative business rule.

## P58 Evidence Discovery — Browser E2E Foundation
- Classification: INSUFFICIENT EVIDENCE / environment-blocked for browser execution.
- A Playwright runtime and Chromium executable are available in the execution environment.
- Direct browser navigation to the Vercel production deployment is blocked by the execution environment with `ERR_BLOCKED_BY_ADMINISTRATOR`.
- The Vercel production deployment also redirects protected deployment URLs through Vercel SSO, preventing unauthenticated browser execution from this environment.
- Vercel's protected URL fetch can confirm the redirect, but that is not equivalent to interactive browser E2E.
- Result: no browser E2E result is claimed. No application behavior was modified for P58.

## P59 Closure Evidence — EventBus Score Event Contract
- Classification: CONFIRMED.
- Active `src/core/rules/scoring/CoreScoreEngine.ts` emits the score event using the literal event name `score:calculated`.
- The shared `EVENTS.SCORE_COMPUTED` constant previously exposed the conflicting value `score:computed`.
- The active EventBus test suite already subscribes to `score:calculated`, establishing the implemented event contract used by the scoring path.
- Repair applied: `EVENTS.SCORE_COMPUTED` now equals `score:calculated`, aligning the exported constant with the actual emitted event.
- Regression coverage added to assert the public score-event constant and emitted score event use the same contract.
- No Supabase schema, RLS, Auth, RPC contract, scoring formula, or business rule was changed.
- GitHub Actions Build Test run `34205054753` for commit `8926b1670d9ef78c16d3d13c206e2e8dc1e60bbc`: SUCCESS.
- CI `npm install`: SUCCESS.
- CI `npm run build`: SUCCESS.
- CI `npx tsc --noEmit`: SUCCESS.
- CI `npm run test`: SUCCESS.
- Result: P59 CLOSED after real repository CI verification.

## Current Confirmed Evidence
1. `patient_intake_responses` is the 5-page survey pipeline and is intended to feed the scoring engine.
2. Blueprint explicitly maps survey fields directionally:
   - `readiness_level` → DRI
   - `followup_importance` → RVS + URI
   - `main_concern` → TSI + PQS
   - `openness_to_proceed` → URI + APS
3. Blueprint/Constitution define the CORE score weights:
   - APS 0.28
   - DRI 0.24
   - RVS 0.20
   - URI 0.15
   - TSI 0.13
4. Production `core_rules_config` contains scoring weights and PQS penalty thresholds, but no authoritative survey-answer-to-indicator numeric mapping.
5. `DecisionCard` currently calls `CoreScoreEngine.calculate(...)`; it does not pre-write indicator values before backend calculation.
6. Production `score-calculator` is ACTIVE and validates JWT, clinic-user role, tenant, session ownership, and uses database-backed LTV inputs.
7. Blueprint Section 12 defines `retention_followups` as the automated + manual follow-up pipeline and specifies `scheduled_for`, `followup_type`, channel, message fields, delivery status, response tracking, and audit timestamps.
8. Production `retention_followups` exists and its core columns match the Blueprint contract, with an additional `deleted_at` column.
9. Production `retention_followups` has tenant-scoped RLS via `rls_followups_isolation` and the Blueprint-aligned pending scheduling index `idx_followups_scheduled`.
10. Production `retention_followups` is currently empty; no follow-up records were mutated during verification.
11. Active source contains a typed `EventBus` implementation at `src/core/events/EventBus.ts` with subscribe/emit/once/clear behavior.
12. Active `CoreScoreEngine` emits `score:calculated`; the shared `EVENTS.SCORE_COMPUTED` constant is now aligned to the same value and protected by automated regression coverage.
13. The Blueprint-specified handler files (`onAppointmentCreated`, `onSessionStatusChanged`, `onPaymentCollected`, `onBreach`) were not found in active source during targeted search.
14. Active source contains follow-up type/status aliases, but no active retention UI/service/automation implementation was established by targeted search.
15. Production `notification_queue` schema uses the later canonical shape with `recipient_type`, `recipient_id`, `recipient_phone`, `recipient_email`, `template_key`, `message_body`, `retry_count`, `max_retries`, and status `queued|processing|sent|...`.
16. Production `notification_queue` is currently empty, so no queued notification was mutated during verification.
17. `notification-processor` is scheduled every 5 minutes and its cron runs are succeeding.
18. Current processor behavior refuses to claim external delivery when no active adapter exists; it requeues until retry exhaustion and then marks the notification `failed` with an explicit adapter-unavailable message.
19. Blueprint Section 18 defines the analytics warehouse snapshot contract and includes `total_visits`, `total_new_patients`, `total_returning_patients`, `total_no_shows`, `total_cancellations`, `avg_wait_time_minutes`, `avg_session_duration_minutes`, `avg_core_score`, `total_revenue_subunits`, `total_discounts_subunits`, `sla_breaches_count`, `hot_leads_count`, and `conversion_rate`.
20. P54 replaced `compute_daily_snapshot` in production without schema changes. The RPC now returns the complete key set consumed by `analytics-snapshot`, using tenant/date-scoped session, invoice, patient, and inquiry data.
21. P54 verification against production returned the complete contract successfully; no application rows were modified by the verification query.
22. The four production cron jobs remain active: analytics nightly at 02:00, auto-lock every minute, leakage hourly, notification processor every 5 minutes.
23. Repository CI now verifies build + TypeScript + automated unit/contract tests on each push through the current Build Test workflow.

## Open Work
### Survey → CORE Score Numeric Mapping
- Classification: INSUFFICIENT EVIDENCE
- No authoritative numeric conversion from survey answers to APS/DRI/RVS/URI/TSI/PQS has been found in the Constitution, Blueprint, active source, migrations, or production `core_rules_config`.
- Do not invent numeric coefficients, lookup tables, or answer score ranges.

### Notification Delivery Adapters
- Classification: INSUFFICIENT EVIDENCE for external provider implementation
- Blueprint defines a pluggable notification bus and channel adapters (WhatsApp/SMS/Email/Manual), but active source does not contain those adapters and provider credentials/contracts were not established in the available evidence.
- Safe completed repair: notification processor no longer produces false-positive delivery results.
- Next implementation evidence needed: exact provider contract, configured provider/secrets, and approved channel behavior.

### Retention / Follow-up Automation
- Classification: INSUFFICIENT EVIDENCE for implementation
- P56 confirmed the production table contract and pending index but found no user-defined triggers on `retention_followups` or `notification_queue`, no dedicated retention automation function, and no active retention service/UI implementation established in targeted source search.
- No implementation is safe until the scheduling/creation triggers, ownership/workflow rules, and approved message/template behavior are explicitly evidenced.

### Event Handler Layer
- Classification: INSUFFICIENT EVIDENCE for implementation
- Active `EventBus.ts` exists and the score-event contract is now aligned, but the Blueprint-specific handler set and its concrete side effects are not sufficiently specified/present in active source to implement safely without architectural invention.
- No handler implementation has been invented.

### Automated Browser E2E Coverage
- Classification: INSUFFICIENT EVIDENCE / environment-blocked
- Playwright and Chromium are available, but production browser navigation is blocked by the execution environment and the Vercel deployment is SSO protected.
- No browser E2E result is claimed from this environment.
- Owner-run browser testing remains separately classifiable as OWNER-CONFIRMED.

### Supabase Advisor Follow-up
- Classification: CONFIRMED advisory findings remain
- Includes intentional/architecture-sensitive items such as `pin_sessions` direct-access denial, SECURITY DEFINER execution grants, public-schema extensions, and leaked-password protection.
- No blanket remediation without evidence and scope.

## Next Stage
**P60 — Contract recovery / next evidence-backed repair:** continue with the first remaining item that has an authoritative implementation contract or a safely isolated verification path. Priority remains: authenticated/browser E2E when an executable browser path is available; otherwise verified provider contract, retention workflow contract, event-handler contract, or approved Survey scoring mapping.

## Closure Rule
An open stage becomes CLOSED only after implementation (when supported by evidence), verification against the real runtime/production contracts, and an update to this roadmap.