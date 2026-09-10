# CORE SYSTEM v2.1 — Master Test Execution Contract

## Purpose

This document is the repository-native governance contract for determining and executing validation scope. It is the methodology layer; CI is an enforcement mechanism, the Decision Engine selects scope, tests provide evidence, and closure is a decision based on evidence.

The contract is intentionally derived from the current repository rather than copied from another project.

## Repository baseline discovered

- Primary branch: `main`.
- Current application stack: React + React DOM, TypeScript, Vite, Tailwind CSS, Zustand, React Router, Supabase JS, React Query.
- Test runners already present: Vitest through the existing CI command and Playwright for browser E2E.
- Existing unit tests: `tests/` contains CORE score parity, CORE score, EventBus, offline sync, and permission-matrix tests.
- Existing E2E: `e2e/patient-journey.spec.mjs` with deterministic seed/reset utilities and an existing Playwright configuration.
- Existing CI: `.github/workflows/deploy.yml` runs build, TypeScript, and Vitest on push/PR.
- Database: Supabase migrations live under `supabase/migrations/`; repository-native SQL migrations are already used.
- Roles discovered from `src/core/permissions/permissionMatrix.ts`: `super_admin`, `clinic_admin`, `doctor`, `receptionist`.
- Active application areas discovered from `src/features/`: `auth`, `clinic-admin`, `doctor`, `reception`, `super-admin`, `survey`.
- Active route areas discovered from `src/router.tsx`: `/login`, `/admin`, `/doctor`, `/reception`, `/super-admin`, `/survey/:sessionId`, plus `/kiosk`.
- Deployment references: README and project documentation reference Vercel production; no Vercel deployment is performed by this testing contract unless a separate release process explicitly requests it.

Known repository testing gaps at installation time:

- No dedicated integration-test runner was discovered.
- No dedicated security/negative browser suite was discovered.
- No database migration execution job was present in CI.
- Existing Playwright coverage is narrow and does not represent complete role-based production workflow coverage.

These are documented as gaps, not treated as failures of the application.

## Mandatory pipeline

`SETUP → REALITY BASELINE → ENGINEERING VALIDATION → IMPACT ANALYSIS → EXECUTION MATRIX → TARGET VALIDATION → ROLE E2E → HANDOFF E2E → CROSS-MODULE E2E → NEGATIVE/SECURITY → RECONCILIATION → REGRESSION → FINAL VERIFICATION → CLOSURE`

The Decision Engine determines which applicable layers are required.

## Inspect → Reuse → Extend → Create

1. Inspect repository architecture, tests, CI, data tooling, auth, roles, and existing validation.
2. Reuse existing npm scripts, Vitest, Playwright, seed/reset harness, and GitHub Actions.
3. Extend existing mechanisms only where they can safely carry the decision contract.
4. Create the Decision Engine and governance artifacts only because no existing repository-native scope-selection engine was found.

## Decision Engine contract

`tools/test-execution-setup.mjs` compares a baseline commit/ref to a candidate commit/ref using Git merge-base and `git diff`. It derives:

- changed files and statuses
- changed directories and source areas
- affected domains/modules
- affected roles using the current permission matrix and changed-file evidence
- affected workflows from the active route map
- dependency/API/UI/workflow/database/security/data/deployment impact
- required engineering validation
- required E2E and negative/security validation
- reconciliation needs
- deterministic regression level
- unknowns that could not be established

The output is generated as `test-execution-plan.json` and is never treated as hand-maintained truth.

## Impact and regression model

The engine uses only applicable evidence-backed categories. Regression levels are:

- `R0`: documentation/contract/CI-only change with no application behavior impact.
- `R1`: localized functional change within one application area with limited impact.
- `R2`: module/domain behavior change requiring target workflow validation.
- `R3`: cross-module, role, security, API, database, data, or materially integrated workflow change.
- `R4`: critical system-wide or deployment/production-impacting change with multiple high-impact dimensions.

A higher level is selected only when repository evidence supports it.

## Real-world E2E distinction

Opening a route is not real-world E2E. Real-world E2E must validate actor, authorization, intended action, state transition, persistence, handoff, and downstream effects when applicable.

For this repository, Playwright remains the existing browser framework. The contract does not create a second E2E framework.

## Security and multi-tenant validation

When authorization, authentication, permission, RLS, tenant, JWT, or ownership boundaries are changed, the execution plan requires negative/security validation. UI hiding alone is never sufficient evidence.

For multi-tenant behavior, the contract requires explicit tenant-isolation validation when the candidate affects tenant/data authorization boundaries.

## Data/state reconciliation

Persistent state changes require reconciliation between the visible result and stored state where practical. A UI success notification alone is not closure evidence.

Database changes must remain repository-native migrations. The Decision Engine marks database impact from SQL/migration changes and Supabase database code paths; it never performs ad-hoc production schema mutations.

## CI enforcement

`.github/workflows/test-execution-contract.yml` runs on PRs targeting `main` and manual dispatch. It:

1. checks out full history;
2. installs the existing repository dependencies;
3. runs the Decision Engine;
4. validates the generated plan;
5. executes the engineering checks selected by the plan;
6. runs Playwright only when the plan requires E2E and the required environment is explicitly available;
7. uploads the generated plan and Playwright report where produced.

The existing `.github/workflows/deploy.yml` remains unchanged by the contract installation.

## False-pass prevention

The contract distinguishes:

- application failure
- test failure
- CI failure
- environment failure
- timeout
- network failure
- baseline/unrelated failure
- not verified

The engine never upgrades missing evidence into PASS. Production closure is separate from ordinary CI validation.

## Closure

A candidate can only be declared `PRODUCTION CLOSED` when all applicable required validation is complete and evidence supports closure. Otherwise the state remains `NOT CLOSED` with explicit blockers or `INSUFFICIENT EVIDENCE`.

The contract installation itself is a documentation/CI/tooling change. Its own acceptance is therefore primarily self-classification, self-test, plan validation, and CI execution; unrelated application E2E is not forced merely to prove the framework exists.

## Future agent rule

Before deciding validation scope for a future engineering task, run:

```text
node tools/test-execution-setup.mjs
```

For a locally explicit baseline:

```text
node tools/test-execution-setup.mjs --base <base-ref> --candidate <candidate-ref>
```

For the engine's self-test suite:

```text
node tools/test-execution-setup.mjs --self-test
```

The generated `test-execution-plan.json` is the machine-readable execution decision for the current delta.
