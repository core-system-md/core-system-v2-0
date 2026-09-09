# CORE SYSTEM v2.1 — P137 Offline Sync Soft-Delete Guard

## Claim → Evidence → Classification → Confidence

### 1. Active code contained a physical DELETE path
**Evidence:** `src/core/offline/SyncEngine.ts` previously handled queued `operation === 'delete'` with `.from(table).delete().eq('id', ...)`.

**Classification:** CONFIRMED  
**Confidence:** HIGH

### 2. The Constitution forbids physical DELETE
**Evidence:** `docs/Constitution.md` section 2.4 states that physical DELETE is forbidden and requires `UPDATE table SET deleted_at = NOW()` for soft deletion; section 10 repeats the prohibition.

**Classification:** CONFIRMED  
**Confidence:** HIGH

### 3. Production identifies the supported soft-delete tables
**Evidence:** Production `information_schema.columns` confirmed the current public tables carrying `deleted_at`: `analytics_daily_snapshots`, `analytics_events`, `analytics_patient_metrics`, `audit_trail`, `billing_events`, `clinic_inquiries`, `clinic_invoices`, `clinic_patients`, `clinic_procedures`, `clinic_rooms`, `clinic_users`, `clinic_visit_sessions`, `core_rules_config`, `feature_flags`, `inventory_ledger`, `master_agenda_events`, `master_tenants`, `notification_queue`, `patient_intake_responses`, `patient_longitudinal_profiles`, `pin_attempt_log`, `pin_sessions`, `retention_followups`, `system_delivery_breaches`, `tenant_devices`, and `tenant_health_scores`.

**Classification:** CONFIRMED  
**Confidence:** HIGH

### 4. The hard-delete path was replaced without changing the offline queue contract
**Evidence:** P137 changes only `SyncEngine.applyMutation()` for `operation === 'delete'`: verified soft-delete tables are updated with `deleted_at` and an additional `.is('deleted_at', null)` guard; tables without a verified soft-delete contract fail explicitly instead of issuing DELETE. Create/update behavior and the IndexedDB queue lifecycle remain unchanged.

**Classification:** CONFIRMED  
**Confidence:** HIGH

### 5. Regression coverage was added
**Evidence:** `tests/offline-sync.test.ts` verifies both supported-table soft deletion and rejection of an unsupported delete target. GitHub Actions Build Test run `34348263727` passed Build, TypeScript, and Vitest.

**Classification:** CONFIRMED  
**Confidence:** HIGH

### 6. Production deployment exists for the implementation
**Evidence:** Vercel Production deployment `dpl_APgpThS5H5qzdXtgNmnLfRy1onQ6` is `READY` for implementation commit `537f3531117fa68bb8c9eb79a5dbf4a6cf67816a`, which contains the active SyncEngine hard-delete guard.

**Classification:** CONFIRMED  
**Confidence:** HIGH

## Scope
- No schema, RLS, Auth, RPC signature, scoring formula, financial storage, permission matrix, or business rule was changed.
- No archive file was changed.
- No new dependency was introduced.

## Status
`IMPLEMENTED — CI VERIFIED — PRODUCTION DEPLOYMENT READY; ROADMAP CLOSURE PENDING`
