# CORE SYSTEM v2.1 — P94 Feature Flag Read Soft-Delete

## Status
`IMPLEMENTED — VERIFICATION COMPLETE — ROADMAP UPDATE REQUIRED`

## Claim → Evidence → Classification → Confidence

### 1. Hook reads exclude soft-deleted feature flags
**Evidence:** `src/shared/hooks/useFeatureFlag.ts` now applies `.is('deleted_at', null)` to both single-flag and multi-flag reads before tenant/global resolution.

**Classification:** CONFIRMED

**Confidence:** HIGH

### 2. Zustand feature-flag store excludes soft-deleted feature flags
**Evidence:** `src/shared/store/featureFlagStore.ts` now applies `.is('deleted_at', null)` to its tenant/global fetch query before mapping rows into the store.

**Classification:** CONFIRMED

**Confidence:** HIGH

### 3. Production contains soft-deleted feature-flag rows
**Evidence:** Production read-back returned active and soft-deleted rows for the same global keys, including `AI_REPORTS`, `AUDIT_TRAIL`, `GHOST_TRACKER`, `LTV_SCORING`, `MULTI_BRANCH`, and `WHATSAPP_AUTOMATION`.

**Classification:** CONFIRMED

**Confidence:** HIGH

### 4. Production deployment verification
**Evidence:** Commit `64642af7479def3ddacda386461fcea0a770b638` reached Vercel Production deployment `dpl_FnhxhQKg3v8N9MibexpA2BVHpKs2` with state `READY`. Its error-only build log contained no build failure; only the known `esbuild@0.25.12` install-script warning was present. Production runtime error/fatal query returned no entries for the deployment.

**Classification:** CONFIRMED

**Confidence:** HIGH

### 5. Scope boundary
No database schema, migration, RPC, RLS, Auth, permission contract, scoring rule, or Zustand architecture was changed. The repair only filters operational feature-flag reads to active rows and preserves the existing tenant-specific-over-global precedence.

## Closure note
P94 is eligible for `CLOSED — CONFIRMED` once the Master Repair Roadmap records this evidence. No speculative feature behavior was added.
