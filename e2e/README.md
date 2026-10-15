# CORE SYSTEM v2.1 — E2E Harness

This directory contains isolated browser E2E tests and deterministic test-data utilities.

## Safety contract

- Test records are identified by the immutable `E2E-PT-` MRN prefix.
- Seed/reset/reconcile require `E2E_TENANT_ID` to exactly match the immutable fixture tenant ID.
- The harness accepts only loopback/local Supabase and browser URLs; remote and production targets are rejected.
- `E2E_ALLOW_PRODUCTION` is not a supported override and cannot enable production access.
- Seed/reset require `SUPABASE_SERVICE_ROLE_KEY` and must run outside the browser.
- Mutation is denied unless `E2E_ALLOW_MUTATION=true` is explicitly set.
- Reset uses the confirmed soft-delete contract (`deleted_at`), never physical DELETE.
- The staff fixtures are synthetic test-only credentials; never reuse them outside the isolated local E2E tenant.

## Commands

```text
npm run e2e:seed
npm run e2e:test
npm run e2e:reset
```

Required environment variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
E2E_TENANT_ID
E2E_ALLOW_MUTATION=true
E2E_BASE_URL=http://127.0.0.1:4173
```

`E2E_BASE_URL` defaults to `http://127.0.0.1:4173`.

The harness intentionally starts with a narrow, schema-confirmed patient/session seed. Additional workflow fixtures must be added only after their table/RPC contracts are verified from the repository and/or production metadata.
