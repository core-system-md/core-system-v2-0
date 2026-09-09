# CORE SYSTEM v2.1 — P95 Revenue Chart Theme Token

## Status
`CLOSED — CONFIRMED`

## Claim → Evidence → Classification → Confidence

### 1. Revenue chart primary color uses the canonical theme token
**Evidence:** `src/features/clinic-admin/RevenueCards.tsx` now renders revenue bars with `fill="hsl(var(--primary))"` instead of the hard-coded `#1B2A4A` value.

**Classification:** CONFIRMED

**Confidence:** HIGH

### 2. Chart guide colors use canonical semantic tokens
**Evidence:** Chart grid lines and labels now use `--border` and `--muted-foreground` respectively, avoiding additional hard-coded semantic colors.

**Classification:** CONFIRMED

**Confidence:** HIGH

### 3. Revenue data and financial contract are unchanged
**Evidence:** The repair changes only SVG presentation values. Existing tenant/date/status filters, integer subunit aggregation, currency conversion, and error handling remain unchanged.

**Classification:** CONFIRMED

**Confidence:** HIGH

### 4. Canonical theme source exists in the active stylesheet
**Evidence:** `src/index.css` defines `--primary: 219 54% 20%`, with the dark-mode override already established by the project theme.

**Classification:** CONFIRMED

**Confidence:** HIGH

## Scope boundary
No schema, migration, RPC, RLS, Auth, permission, scoring, or financial-unit contract changed.
