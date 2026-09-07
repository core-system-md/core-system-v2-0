# CORE SYSTEM v2.1 — MASTER REPAIR ROADMAP

## Source of Truth
- Constitution: `docs/Constitution.md` (immutable source of truth)
- Blueprint: `docs/Blueprint.md` (implementation source of truth)
- Method: Evidence First → Constitution First → Blueprint First → Minimal → Surgical → Verification Before Closure
- Reporting: Claim → Evidence → Classification → Confidence

## Current Baseline
- Branch: `main`
- Current HEAD: `cbc9b98f6246c841821ac92bbf4f9d829d5c681a`
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
8. Production `retention_followups` exists and its core columns match the Blueprint contract (`scheduled_for`, `followup_type`, `channel`, `message_template_id`, `message_body`, `delivery_status`, `sent_at`, `delivered_at`, `response_received`, `response_text`, `sent_by`, `created_at`, `updated_at`), with an additional `deleted_at` column.
9. Production `retention_followups` has tenant-scoped RLS via `rls_followups_isolation` and the Blueprint-aligned pending scheduling index `idx_followups_scheduled`.
10. Production `retention_followups` is currently empty; no follow-up records were mutated during verification.
11. Active source contains the follow-up type/status aliases, but no active retention UI/service/automation implementation was found outside the database/type definitions searched so far.
12. Production `notification_queue` schema uses the later canonical shape with `recipient_type`, `recipient_id`, `recipient_phone`, `recipient_email`, `template_key`, `message_body`, `retry_count`, `max_retries`, and status `queued|processing|sent|...`.
13. Production `notification_queue` is currently empty, so no queued notification was mutated during verification.
14. `notification-processor` is scheduled every 5 minutes and its cron runs are succeeding.
15. The previous processor implementation contained `const sent = true`, which could falsely mark an undelivered notification as sent. This was removed.
16. Current processor behavior refuses to claim external delivery when no active adapter exists; it requeues until retry exhaustion and then marks the notification `failed` with an explicit adapter-unavailable message.
17. Blueprint Section 18 defines the analytics warehouse snapshot contract and includes `total_visits`, `total_new_patients`, `total_returning_patients`, `total_no_shows`, `total_cancellations`, `avg_wait_time_minutes`, `avg_session_duration_minutes`, `avg_core_score`, `total_revenue_subunits`, `total_discounts_subunits`, `sla_breaches_count`, `hot_leads_count`, and `conversion_rate`.
18. Production `compute_daily_snapshot` previously returned only legacy keys (`total_visits`, `total_revenue`, `avg_wait_time`, `sla_breaches`), while the active `analytics-snapshot` Edge Function expected the Blueprint-aligned full key set.
19. P54 replaced `compute_daily_snapshot` in production without schema changes. The RPC now returns the complete key set consumed by `analytics-snapshot`, using tenant/date-scoped session, invoice, patient, and inquiry data.
20. P54 verification against production returned the complete contract successfully; no application rows were modified by the verification query.
21. The four production cron jobs remain active: analytics nightly at 02:00, auto-lock every minute, leakage hourly, notification processor every 5 minutes.

## Open Work
### Survey → CORE Score Numeric Mapping
- Classification: INSUFFICIENT EVIDENCE
- Reason: available Constitution, Blueprint, active source, migrations, and production `core_rules_config` do not define authoritative numeric conversion from survey answers to APS/DRI/RVS/URI/TSI/PQS.
- Prohibited action: do not invent numeric coefficients, lookup tables, or answer score ranges.

### Notification Delivery Adapters
- Classification: INSUFFICIENT EVIDENCE for external provider implementation
- Blueprint defines a pluggable notification bus and channel adapters (WhatsApp/SMS/Email/Manual), but active source does not contain those adapters and provider credentials/contracts were not established in the available evidence.
- Safe completed repair: notification processor no longer produces false-positive delivery results.
- Next implementation evidence needed: exact provider contract, configured provider/secrets, and approved channel behavior.

### Retention / Follow-up Automation
- Classification: INSUFFICIENT EVIDENCE for implementation
- Database contract is present and aligned with Blueprint Section 12, but active source currently does not provide the retention service/UI/automation behavior needed to implement the full automated + manual pipeline without inventing business rules.
- Safe finding: no production follow-up records were changed during discovery.
- Next implementation evidence needed: exact scheduling/creation triggers, ownership/workflow rules, and approved message/template behavior.

### Automated Test Coverage
- Classification: CONFIRMED gap in repository tooling
- Current repository scripts do not expose Vitest/Playwright/Cypress commands.
- Browser-based E2E cannot be truthfully claimed from the current toolset; owner-run browser testing must be labeled OWNER-CONFIRMED.

### Supabase Advisor Follow-up
- Classification: CONFIRMED advisory findings remain
- Includes intentional/architecture-sensitive items such as `pin_sessions` direct-access denial, SECURITY DEFINER execution grants, public-schema extensions, and leaked-password protection.
- No blanket remediation without evidence and scope.

## Next Stage
**Evidence Discovery — authoritative Survey → Indicator numeric mapping, approved notification provider contract, or fully specified Retention automation workflow, whichever becomes fully evidenced first.**

## Closure Rule
An open stage becomes CLOSED only after implementation (when supported by evidence), verification against the real runtime/production contracts, and an update to this roadmap.