# CORE SYSTEM v2.1 — Permanent Project Instructions

These instructions are repository-level operating rules. They apply to every software change in this repository, regardless of size.

## 1. Mandatory workflow

Every task MUST follow this sequence without exception:

**Evidence First → Constitution First → Blueprint First → Minimal → Surgical → Low Risk → Reviewable → No Scope Expansion**

Do not guess. Classify findings as **CONFIRMED**, **LIKELY**, **INSUFFICIENT EVIDENCE**, or **NOT APPLICABLE**.

## 2. Before any work

- Do NOT work directly on `main`.
- Create a clearly named branch before making changes (for example `fix/auth-redirect`, `feat/user-profile`, `chore/project-instructions`).
- If multiple unrelated repairs are required, split them into logical branches by scope (for example UI, API, database), rather than one oversized branch or one branch per trivial edit.
- Inspect the current repository state and relevant Constitution/Blueprint requirements before editing.

## 3. Database changes

- Any database change MUST be implemented first through a Supabase migration.
- Test the migration in an isolated Supabase branch/environment when one is available.
- Application code that depends on a database change must not be treated as complete until the migration has been verified successfully.
- Never disable RLS or bypass security merely to make tests pass.
- Never alter production data casually or use real patient data for testing.

## 4. Validation and CI

- Run validation locally, in Codespaces, or through GitHub Actions. Vercel is NOT a validation or test tool.
- Required validation before merge includes, as applicable:
  - lint
  - TypeScript/type-check
  - build
  - unit/integration tests
  - E2E tests
  - migration verification
- Do not claim a test passed unless it was actually executed and evidence is available.
- A Vercel deployment status alone is never sufficient evidence for code correctness.

## 5. Vercel deployment policy

- NEVER create a Vercel preview or production deployment as a routine testing step.
- A Vercel deployment may be created ONLY after the user explicitly requests a deployment at that moment.
- Production deployment occurs through the normal repository/main workflow after an approved merge, not from an arbitrary feature/fix branch.

## 6. Commits

- Commits MUST be small, focused, and clearly describe the change.
- Do not accumulate unrelated changes in one commit.
- Do not create vague commits such as `update`, `fix stuff`, or `changes`.

## 7. Merge Gate

A branch MUST NOT be merged into `main` until ALL applicable gates pass:

1. Build succeeds locally/through GitHub Actions.
2. All relevant tests pass.
3. E2E tests pass when applicable.
4. Database migrations complete successfully without errors when applicable.
5. The changes have been reviewed against the Constitution and Blueprint.
6. There is no known conflict with other open branches/workstreams.
7. No unresolved critical regression remains.

If a gate cannot be verified, mark it **INSUFFICIENT EVIDENCE** and do not silently treat it as passed.

## 8. Merge and branch cleanup

- Merge into `main` ONLY after the Merge Gate passes.
- After a successful merge and confirmation of the resulting deployment when applicable, delete the completed branch both remotely and locally.
- Do not leave stale merged branches.
- Do not accumulate branches or commits without a clear active purpose.

## 9. Architecture protection

Unless the Constitution/Blueprint or confirmed evidence explicitly requires it, do NOT change:

- Authentication flow
- Database schema
- RPC contracts
- Zustand structure
- Core architecture
- Tenant isolation model
- RLS security model

Any required exception must be evidence-based, minimal, and explicitly documented.

## 10. Patient-data safety

- Use isolated synthetic test data for E2E/testing.
- Never use real patient records as fixtures.
- Test seed/reset operations must be scoped, deterministic, and reversible where possible.
- Never perform destructive production cleanup as part of routine testing.

## 11. Completion report

At the end of every task, provide:

1. **Branch used**
2. **What was inspected and verified**
3. **Tests/checks and their actual results**
4. **Merge status in `main`**
5. **Deployment status, only if a deployment was explicitly requested**
6. **Confirmation that the branch was deleted after merge**

If the task is not merged, state that explicitly and explain which gate remains pending.

## 12. No scope expansion

Do only the requested work and the minimum evidence-based repairs required to complete it safely. If additional issues are discovered, record them separately rather than silently expanding the task.
