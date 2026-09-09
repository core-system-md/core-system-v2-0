# CORE SYSTEM v2.1 — P136 Analytics Snapshot Inquiry Soft-Delete Boundary

## Claim → Evidence → Classification → Confidence

### 1. The analytics snapshot RPC did not honor the inquiry soft-delete boundary
**Evidence:** The established `compute_daily_snapshot(uuid,date)` contract already excluded logically deleted sessions, invoices, and (after P135) patients. Production schema confirms `clinic_inquiries.deleted_at` exists, while the inquiry metrics query previously filtered only `tenant_id` and `created_at`. Therefore logically deleted inquiries could affect `total_inquiries`, `converted_inquiries`, and the derived conversion rate.

**Classification:** CONFIRMED
**Confidence:** HIGH

### 2. No current 30-day production rows were affected
**Evidence:** Production data inspection found zero soft-deleted `clinic_inquiries` rows in the last 30 days. The repair is therefore contract-hardening rather than correction of an identified incorrect current KPI.

**Classification:** CONFIRMED
**Confidence:** HIGH

### 3. The repair preserves the existing RPC contract
**Evidence:** Production `compute_daily_snapshot(uuid,date)` was recreated with only `AND deleted_at IS NULL` added to `inquiry_metrics`. Signature, return type, output keys, session/patient/invoice metrics, financial subunit calculations, scoring aggregation, and security/search-path attributes remain unchanged.

**Classification:** CONFIRMED
**Confidence:** HIGH

### 4. Production deployment and read-back succeeded
**Evidence:** Supabase migration `p136_analytics_snapshot_inquiry_soft_delete_boundary` returned success. Production `pg_get_functiondef('public.compute_daily_snapshot(uuid,date)')` confirms both the P135 patient guard and the P136 inquiry `deleted_at IS NULL` predicate are deployed.

**Classification:** CONFIRMED
**Confidence:** HIGH

## Verification status
- Production migration: `p136_analytics_snapshot_inquiry_soft_delete_boundary` — SUCCESS
- Repository migration: `supabase/migrations/068_p136_analytics_snapshot_inquiry_soft_delete_boundary.sql`
- Production function read-back: CONFIRMED
- CI: pending verification for repository commit.
- Vercel exact-commit verification: pending; no frontend/source runtime change was introduced by P136.
