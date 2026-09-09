# CORE SYSTEM v2.1 — E2E Harness

This directory contains isolated browser E2E tests and deterministic test-data utilities.

## Safety contract

- Test records are identified by the immutable `E2E-PT-` MRN prefix.
- Seed/reset requires `E2E_TENANT_ID` explicitly; the script never discovers or guesses a tenant.
- Seed/reset requires `SUPABASE_SERVICE_ROLE_KEY` and therefore must run outside the browser.
- Mutation is denied unless `E2E_ALLOW_MUTATION=true` is explicitly set.
- A production URL is rejected unless `E2E_ALLOW_PRODUCTION=true` is explicitly set.
- Reset uses the project's confirmed soft-delete contract (`deleted_at`), never physical DELETE.
- No credentials are stored in the repository.

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
