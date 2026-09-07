# CORE SYSTEM v2.1 — MASTER REPAIR ROADMAP

## Source of Truth
- Constitution: `docs/Constitution.md` (immutable source of truth)
- Blueprint: `docs/Blueprint.md` (implementation source of truth)
- Method: Evidence First → Constitution First → Blueprint First → Minimal → Surgical → Verification Before Closure
- Reporting: Claim → Evidence → Classification → Confidence

## Current Baseline
- Branch: `main`
- Current HEAD: `5263f972cd76c07874814602733588b227764a05`
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
7. Production `notification_queue` schema differs from the original 010 migration and uses the later canonical shape with `recipient_type`, `recipient_id`, `recipient_phone`, `recipient_email`, `template_key`, `message_body`, `retry_count`, `max_retries`, and status `queued|processing|sent|...`.
8. Production `notification_queue` is currently empty, so no queued notification was mutated during verification.
9. `notification-processor` is scheduled every 5 minutes and its cron runs are succeeding.
10. The previous processor implementation contained `const sent = true`, which could falsely mark an undelivered notification as sent. This was removed.
11. Current processor behavior refuses to claim external delivery when no active adapter exists; it requeues until retry exhaustion and then marks the notification `failed` with an explicit adapter-unavailable message.

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

### Automated Test Coverage
- Classification: CONFIRMED gap in repository tooling
- Current repository scripts do not expose Vitest/Playwright/Cypress commands.
- Browser-based E2E cannot be truthfully claimed from the current toolset; owner-run browser testing must be labeled OWNER-CONFIRMED.

### Supabase Advisor Follow-up
- Classification: CONFIRMED advisory findings remain
- Includes intentional/architecture-sensitive items such as `pin_sessions` direct-access denial, SECURITY DEFINER execution grants, public-schema extensions, and leaked-password protection.
- No blanket remediation without evidence and scope.

## Next Stage
**Evidence Discovery — authoritative Survey → Indicator numeric mapping OR approved notification provider contract, whichever becomes fully evidenced first.**

## Closure Rule
An open stage becomes CLOSED only after implementation (when supported by evidence), verification against the real runtime/production contracts, and an update to this roadmap.