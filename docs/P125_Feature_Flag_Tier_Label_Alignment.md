# P125 — Feature Flag Tenant/Tier Label Alignment

## Claim
The active Super Admin `FeatureFlagManager` had a presentation mismatch with the established Arabic tenant/tier display contract. The repair aligns the tenant selector and allowed-tier controls with the existing Arabic labels without changing stored values or feature-flag behavior.

## Evidence
- `src/features/super-admin/TenantRegistry.tsx` and `src/features/super-admin/TenantDetailPanel.tsx` already establish the canonical Arabic subscription-tier mapping:
  - `trial` → `تجريبي`
  - `essential` → `أساسي`
  - `professional` → `احترافي`
  - `enterprise` → `مؤسسي`
  - `suspended` → `موقوف`
- The same active Super Admin surfaces prefer `clinic_name_ar` and fall back to `clinic_name` for tenant display.
- Before P125, `src/features/super-admin/FeatureFlagManager.tsx` displayed tenant `subscription_tier` values and allowed-tier controls as raw English identifiers and did not load `clinic_name_ar` for the tenant selector.
- P125 changes only the Feature Flag presentation path:
  - adds the established `TIER_LABELS` mapping;
  - selects and retains `clinic_name_ar` for tenant display;
  - renders `clinic_name_ar || clinic_name` in the tenant selector;
  - renders Arabic tier labels in the tenant selector and allowed-tier controls.
- Stored tier values remain the original identifiers. Feature-flag toggle, tier persistence, seed behavior, soft-delete filtering, data queries, and tenant selection semantics remain unchanged.
- No database schema, migration, RLS, Auth, RPC, permission matrix, scoring, financial calculation, or routing contract changed.

## Verification
- Implementation commit: `b1562ac022072aa09e246fdd9c8914d676070603`.
- GitHub Actions Build Test run `34341272817` completed successfully for:
  - build
  - TypeScript (`tsc --noEmit`)
  - Vitest
- Production deployment verification is currently blocked by the Vercel platform deployment rate limit. GitHub reports: `Deployment rate limited — retry in 24 hours.` No P125 Production deployment exists yet.
- The current verified Production deployment therefore remains the prior P123 cumulative deployment; P125 is not claimed as Production-verified.

## Classification
- Implementation contract: `CONFIRMED`
- Production verification: `INSUFFICIENT EVIDENCE`
- Overall P125 status: **IMPLEMENTED — PRODUCTION VERIFICATION BLOCKED**
- Confidence: `HIGH` for source and CI evidence; `INSUFFICIENT` for Production evidence until a P125 deployment is available.

## Scope protection
No speculative health-score implementation was added. The Blueprint describes `TenantRegistry` as including tenant health scores, but Production `tenant_health_scores` currently has no active rows and its current RLS is tenant-isolated; there is no verified Super Admin cross-tenant health-score access contract sufficient to safely invent a new RPC/RLS path in P125.
