# P140 — Production Parity Reconciliation

## Claim → Evidence → Classification → Confidence

### 1. Production required an additional Doctor PIN-session payload repair
**Evidence:** Production `get_doctor_session_for_pin_session(uuid,text,uuid)` initially returned the session basics but omitted `score_aps`, `score_dri`, `score_rvs`, `score_uri`, `score_tsi`, `score_pqs`, and `patient_longitudinal_profile`, while active `DecisionCard.tsx` consumes those values after the P140 PIN-session access repair.
**Classification:** CONFIRMED
**Confidence:** HIGH

### 2. Production access boundary remains PIN-token verified
**Evidence:** The repaired function requires a tenant id, a PIN session token of at least 32 characters, a non-null session id, an active non-deleted PIN session, a matching active non-deleted clinic user, and the role boundary `doctor|clinic_admin|super_admin`; invalid credentials raise an authorization exception.
**Classification:** CONFIRMED
**Confidence:** HIGH

### 3. The schema parity fields are now represented by an idempotent migration
**Evidence:** The migration adds `clinic_patients.patient_status`, `clinic_visit_sessions.is_insured`, `lock_holder_id`, and `lock_timestamp` only when absent.
**Classification:** CONFIRMED
**Confidence:** HIGH

### 4. Production verification succeeded after the repair
**Evidence:** Production function read-back shows all six score indicator fields and the longitudinal profile in the returned JSON contract. A negative RPC call with a synthetic tenant/token/session was rejected with `Unauthorized: invalid or expired doctor session`.
**Classification:** CONFIRMED
**Confidence:** HIGH

### Scope
- No business-rule change.
- No scoring formula change.
- No RLS policy change.
- No Auth design change.
- No financial calculation change.
- No archive change.
- No new dependency.