# CORE SYSTEM v2.1 — P135 Analytics Snapshot Patient Soft-Delete Boundary

## Claim → Evidence → Classification → Confidence

### 1. The analytics snapshot RPC did not honor the active patient soft-delete boundary
**Evidence:** The active `compute_daily_snapshot` implementation filtered `clinic_visit_sessions.deleted_at IS NULL` and `clinic_invoices.deleted_at IS NULL`, but its `clinic_patients` join did not require `p.deleted_at IS NULL`. Constitution §2.5 requires soft-delete handling and query filtering, and Production confirms `clinic_patients` uses the existing soft-delete contract. Production currently has zero active sessions joined to soft-deleted patients, so this was a structural contract defect with no current affected rows.

**Classification:** CONFIRMED
**Confidence:** HIGH

### 2. The repair is surgical and preserves the existing RPC contract
**Evidence:** P135 changes only the existing `public.compute_daily_snapshot(uuid,date)` function body by adding `AND p.deleted_at IS NULL` to the patient join. Return type, signature, output keys, revenue subunit calculations, CORE scoring aggregation, inquiry metrics, and security/search-path attributes remain unchanged. No schema, RLS, Auth, or RPC signature change was introduced.

**Classification:** CONFIRMED
**Confidence:** HIGH

### 3. Production was updated successfully and read back
**Evidence:** Production migration `p135_analytics_snapshot_patient_soft_delete_boundary` applied successfully. `pg_get_functiondef('public.compute_daily_snapshot(uuid,date)')` confirms the deployed function contains `LEFT JOIN public.clinic_patients p ON p.id = ds.patient_id AND p.deleted_at IS NULL`.

**Classification:** CONFIRMED
**Confidence:** HIGH

## Verification status
- Production migration: `p135_analytics_snapshot_patient_soft_delete_boundary` — SUCCESS
- Repository migration: `supabase/migrations/063_p135_analytics_snapshot_patient_soft_delete_boundary.sql`
- Production function read-back: CONFIRMED
- CI: pending verification for repository commit.
- Vercel exact-commit verification: pending.
