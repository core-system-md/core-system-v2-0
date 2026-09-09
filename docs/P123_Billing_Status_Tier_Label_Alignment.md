# P123 — Billing Status Tier Label Alignment

## Claim
The active Clinic Admin Billing Status screen displayed the stored `subscription_tier` identifier directly, while the established Super Admin subscription surfaces already provide Arabic presentation labels for the same contract values.

## Evidence
- `src/features/clinic-admin/BillingStatusPage.tsx` previously rendered `tenant.subscription_tier` directly under `الخطة الحالية`.
- Established active Super Admin surfaces use the Arabic mapping: `trial` → `تجريبي`, `essential` → `أساسي`, `professional` → `احترافي`, `enterprise` → `مؤسسي`, `suspended` → `موقوف`.
- P123 adds the same presentation-only `TIER_LABELS` mapping to `BillingStatusPage.tsx` and preserves raw-value fallback for unknown values.
- No stored subscription value, query filter, permission, Auth, RLS, schema, RPC, financial, tenant, or business-rule behavior changed.

## Classification
`CONFIRMED`

## Confidence
`HIGH`

## Scope
Clinic Admin billing status UI label presentation only.

## Implementation
Commit: `93c41ad5e4584989858408e3e6cc9d3a0b806eeb`
