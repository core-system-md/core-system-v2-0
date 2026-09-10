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
- Execution runner: `tools/test-execution-runner.mjs`.
- Generated machine-readable plan: `test-execution-plan.json` (CI artifact; not hand-maintained).
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
- Decision Engine self-test: PASS. It covers contract-installation R0, documentation R0, source/UI R2, database R3, security/role R3, and cross-module R3 classification cases.
- CI plan generation: PASS. The contract installation generated `regression_level: R0`, no affected roles, no security impact, no E2E requirement, and only `unit_tests` as required engineering validation.
- Engineering validation: PASS for the selected R0 scope; existing Vitest suite completed successfully (23 tests in 5 files in the current CI run).
- Application E2E for the contract installation: NOT REQUIRED by the generated plan.
- Production deployment: NOT requested and not performed by this contract installation.

## Known blockers / gaps

- No dedicated integration-test runner was discovered.
- No dedicated negative/security browser suite was discovered.
- No database migration execution job is currently present in CI.
- Existing Playwright coverage is not full role-based workflow coverage.
- Repository baseline has an npm lockfile synchronization mismatch (`npm ci` reports missing Playwright packages from the lock); the contract workflow intentionally reuses the repository's existing `npm install` convention and does not modify dependencies as part of this installation.

These are explicit repository findings, not application-failure claims.

## Closure state

`READY FOR MERGE` once the final PR head CI run is green. The contract installation itself does not require production deployment verification because no production deployment was requested and its generated scope is R0.

## Next execution stage

After this installation reaches the merge gate, future engineering changes must run the Decision Engine before test-scope decisions are made. For UI/role/security changes the engine will select additional validation rather than silently downgrading missing evidence to PASS.
