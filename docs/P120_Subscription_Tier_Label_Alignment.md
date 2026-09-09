# P120 — Subscription Tier Label Alignment

## Claim
The active Super Admin clinic subscription-management surface displayed stored `subscription_tier` values as raw English identifiers, while the established active Super Admin registry/detail surfaces already use Arabic labels for the same contract values.

## Evidence
- `src/features/super-admin/TenantBillingAdminPage.tsx` previously rendered `trial`, `essential`, `professional`, `enterprise`, and `suspended` directly in the plan selector.
- `src/features/super-admin/TenantRegistry.tsx` already defines the established Arabic presentation mapping: `trial` → `تجريبي`, `essential` → `أساسي`, `professional` → `احترافي`, `enterprise` → `مؤسسي`, `suspended` → `موقوف`.
- P120 adds the same static presentation mapping to `TenantBillingAdminPage.tsx` and changes only the visible labels; stored tier values and update behavior remain unchanged.
- No database schema, RLS, Auth, RPC, permission matrix, tenant boundary, scoring, financial calculation, routing, or business-rule contract changed.

## Classification
`CONFIRMED`

## Confidence
`HIGH`

## Scope
UI label consistency only.

## Implementation
Commit: `4781322703402d255a1d00d5ce0fb64f907d9d97`
