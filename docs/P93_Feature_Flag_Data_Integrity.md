# CORE SYSTEM v2.1 — P93 Feature Flag Data Integrity

## Status
`IMPLEMENTED — VERIFICATION COMPLETE — ROADMAP ENTRY PENDING`

## Claim → Evidence → Classification → Confidence

### 1. Active feature flag reads exclude soft-deleted rows
**Evidence:** `src/features/super-admin/FeatureFlagManager.tsx` now adds `.is('deleted_at', null)` to the `feature_flags` read query.

**Classification:** CONFIRMED

**Confidence:** HIGH

### 2. Feature-flag seeding now surfaces insertion failures
**Evidence:** Each missing preset insertion checks the returned Supabase `error` and throws before the success toast; the refresh is awaited before reporting success.

**Classification:** CONFIRMED

**Confidence:** HIGH

### 3. Production contains both active and soft-deleted feature-flag records
**Evidence:** Production read-back returned 8 active flags and 6 soft-deleted flags.

**Classification:** CONFIRMED

**Confidence:** HIGH

### 4. Existing RLS already restricts feature-flag writes to super_admin
**Evidence:** Production policy read-back showed INSERT and UPDATE policies require `get_current_user_role() = 'super_admin'`; SELECT permits super_admin, current tenant, or global rows.

**Classification:** CONFIRMED

**Confidence:** HIGH

### 5. Verification deployment
**Evidence:** GitHub commit `c845fd4cd7a3cb44893a80c55738f83a66a0c8a9`; Vercel Production deployment `dpl_DQCUc1sWqmSWkpDqqSGT2oCWyq3n` is `READY`. Build error-only logs contain only the existing `esbuild@0.25.12` allow-scripts warning. Production runtime logs for the deployment contain no error/fatal entries in the checked window.

**Classification:** CONFIRMED

**Confidence:** HIGH

## Scope boundary
No database schema, RPC, RLS, Auth, permission contract, or financial-unit contract was changed by P93.

## Documentation note
The Master Repair Roadmap was not rewritten in this step because the available GitHub contents update operation replaces the complete file and the full historical file content was not available safely as a single edit payload. P93 therefore remains explicitly documented as roadmap-pending rather than falsely marked CLOSED there.
