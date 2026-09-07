# CORE SYSTEM v2.1 — MASTER REPAIR ROADMAP

## Source of Truth
- Constitution: `docs/Constitution.md` (immutable source of truth)
- Blueprint: `docs/Blueprint.md` (implementation source of truth)
- Method: Evidence First → Constitution First → Blueprint First → Minimal → Surgical → Verification Before Closure
- Reporting: Claim → Evidence → Classification → Confidence

## Current Baseline
- Branch: `main`
- Current HEAD: `1e2ce544d02b87983da249ec0a57382b6ddc5322`
- Vercel production deployment for current HEAD: READY
- Vercel CI status for current HEAD: SUCCESS
- Supabase production ref: `gobdznqbdaklkkqbkynx`

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
- Doctor score path routed through `CoreScoreEngine`: VERIFIED on current main
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
4. Production `core_rules_config` currently contains scoring weights and PQS penalty thresholds, but no authoritative survey-answer-to-indicator numeric mapping.
5. Current `DecisionCard` calls `CoreScoreEngine.calculate(...)`; it no longer persists indicator values directly before invoking the backend calculator.
6. Production `score-calculator` is ACTIVE and validates JWT, clinic-user role, tenant, session ownership, and uses database-backed LTV inputs.
7. Vercel deployment for current HEAD is READY and the combined commit status is SUCCESS.

## Open Work
### Survey → CORE Score Numeric Mapping
- Classification: INSUFFICIENT EVIDENCE
- Reason: the available Constitution, Blueprint, active source, migrations, and production `core_rules_config` do not define authoritative numeric conversion from survey answers to the six indicator inputs (APS/DRI/RVS/URI/TSI/PQS).
- Prohibited action: do not invent numeric coefficients, lookup tables, or answer scoring ranges.
- Required evidence before implementation: an authoritative specification, approved rule set, or existing production/configuration data that defines the numeric mapping.

### Automated Test Coverage
- Classification: CONFIRMED gap in repository tooling
- Current repository scripts do not expose Vitest/Playwright/Cypress test commands.
- Browser-based E2E cannot be truthfully claimed from the current toolset; owner-run browser testing must be labeled OWNER-CONFIRMED.

### Supabase Advisor Follow-up
- Classification: CONFIRMED advisory findings remain
- Includes intentional/architecture-sensitive items such as `pin_sessions` direct-access denial, SECURITY DEFINER execution grants, public-schema extensions, and leaked-password protection.
- No blanket remediation without evidence and scope approval.

## Next Stage
**Evidence Discovery — locate an authoritative Survey → Indicator numeric mapping.**

Targeted checks:
1. Search active code and migrations for all survey field names and indicator derivations.
2. Search all `core_rules_config` seed/configuration history for survey scoring keys.
3. Inspect any active scoring adapters/rule files that consume survey payloads.
4. Inspect Supabase production data only for read-only evidence.
5. If no authoritative mapping exists, keep this item OPEN and select the next Blueprint-backed implementation area rather than inventing scoring logic.

## Closure Rule
An open stage becomes CLOSED only after implementation (when supported by evidence), verification against the real runtime/production contracts, and an update to this roadmap.