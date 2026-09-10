# CORE SYSTEM v2.1 — Project Execution Handoff

## Current baseline

- Repository: `core-system-md/core-system-v2-0`
- Primary branch: `main`
- Installation branch: `feat/master-test-execution-contract`
- Baseline commit at installation: `e98997bc88a52bf4bd8e129c08a407daeabd3c3b`
- Existing application stack: React/Vite/TypeScript/Tailwind/Zustand/React Router/Supabase.

## Current phase

Master Test Execution Contract installation and self-validation.

## Existing validation infrastructure

- Existing Build Test workflow: `.github/workflows/deploy.yml`.
- Existing unit tests: `tests/` with Vitest execution through the current npm/CI command.
- Existing browser framework: Playwright via `playwright.config.mjs`.
- Existing E2E harness: `e2e/patient-journey.spec.mjs`, `e2e/seed.mjs`, `e2e/reset.mjs`.
- Existing database migration directory: `supabase/migrations/`.

## Installed contract

- Authoritative methodology: `docs/testing/MASTER_TEST_EXECUTION_CONTRACT.md`.
- Decision Engine: `tools/test-execution-setup.mjs`.
- Generated machine-readable plan: `test-execution-plan.json`.
- CI enforcement: `.github/workflows/test-execution-contract.yml`.
- Self-test command: `npm run test:contract`.
- Plan command: `npm run test:execution-plan`.
- Chronological ledger: `PROJECT_EXECUTION_LEDGER.md`.

## Decision model

The engine compares baseline and candidate using Git merge-base/diff and classifies runtime, UI, API, data, database, role, security, workflow, cross-module, dependency, and deployment impact. Regression is `R0`–`R4` based on detected evidence.

## Validation status

- Repository discovery: COMPLETE.
- Architecture/testing/CI audit: COMPLETE.
- Contract implementation: COMPLETE on installation branch.
- Decision Engine self-test: REQUIRED and executed in CI as part of this branch.
- Engineering validation: REQUIRED and selected dynamically by generated plan.
- Application E2E for the contract installation: NOT REQUIRED when the generated plan correctly classifies this change as contract/CI tooling only.
- Production deployment: NOT requested and not performed by this contract installation.

## Known blockers / gaps

- No dedicated integration-test runner was discovered.
- No dedicated negative/security browser suite was discovered.
- No database migration execution job is currently present in CI.
- Existing Playwright coverage is not full role-based workflow coverage.

These are explicit repository gaps, not fabricated failures.

## Closure state

`NOT CLOSED` until CI executes the installed contract successfully and its generated plan plus self-test evidence are inspected. Production deployment is intentionally out of scope unless separately authorized.

## Next execution stage

After this installation reaches its merge gate, future engineering changes must run the Decision Engine before test-scope decisions are made.
