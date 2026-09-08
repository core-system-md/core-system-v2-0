# CORE SYSTEM v2.1 — P59 Actionable Repair Selection

## Evidence First

This stage records the implementation boundary after direct inspection of the active repository and Production Supabase.

## CONFIRMED

1. `patient_intake_responses` contains the complete five-page survey payload fields.
2. `save_patient_intake_page(p_session_id, p_page, p_payload)` exists in Production and preserves the existing RPC signature.
3. The active survey router calls that RPC for pages 1–5.
4. `retention_followups` exists with scheduling, channel, delivery-status, response-tracking, and audit fields.
5. `notification-processor` exists and does not falsely mark unsupported notifications as sent.
6. `process_pending_notifications()` only moves queued notifications to processing; it is not a retention-rule engine.
7. The active score calculator accepts CORE indicators and calculates the weighted CORE score.

## INSUFFICIENT EVIDENCE — DO NOT IMPLEMENT

### Retention automation
No authoritative rule source was found defining when a survey/session should create each retention type, what message template/channel should be selected, or who owns the creation side effect. Do not invent these rules.

### Survey → CORE mapping
Survey answers are stored as raw values, but no authoritative numeric mapping from survey answers to APS/DRI/RVS/URI/TSI/PQS was found. Do not invent coefficients or formulas.

### Event handlers
The Blueprint names event handlers and intended effects, but active implementations with sufficiently detailed side-effect contracts were not found. Do not create speculative handlers.

## Safe implementation policy

Only repairs backed by an existing contract may be applied. Database schema, RLS, authentication, RPC signatures, and business scoring/retention formulas remain unchanged unless a later evidence stage establishes an explicit contract.

## Closure rule

P59 is a decision/boundary stage, not a feature-completion claim. Retention, survey scoring, and event-handler work remain open evidence paths until authoritative rules/contracts are available.
