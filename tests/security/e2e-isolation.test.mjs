import { afterEach, describe, expect, it } from 'vitest';
import { assertIsolatedE2ETarget } from '../../e2e/assert-isolated-target.mjs';

const envKeys = [
  'E2E_TENANT_ID',
  'SUPABASE_URL',
  'E2E_BASE_URL',
  'E2E_ALLOW_PRODUCTION',
];

const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function setLocalTarget() {
  process.env.E2E_TENANT_ID = '20000000-0000-4000-8000-000000000001';
  process.env.SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.E2E_BASE_URL = 'http://127.0.0.1:4173';
  delete process.env.E2E_ALLOW_PRODUCTION;
}

afterEach(() => {
  for (const key of envKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

describe('E2E target isolation', () => {
  it('accepts only the fixed tenant with local Supabase and local browser target', () => {
    setLocalTarget();
    expect(assertIsolatedE2ETarget()).toMatchObject({
      tenantId: '20000000-0000-4000-8000-000000000001',
      baseUrl: 'http://127.0.0.1:4173',
    });
  });

  it('rejects a tenant override', () => {
    setLocalTarget();
    process.env.E2E_TENANT_ID = '30000000-0000-4000-8000-000000000001';
    expect(() => assertIsolatedE2ETarget()).toThrow(/must exactly match/i);
  });

  it('rejects remote Supabase targets', () => {
    setLocalTarget();
    process.env.SUPABASE_URL = 'https://isolated-project.supabase.co';
    expect(() => assertIsolatedE2ETarget()).toThrow(/Only a local Supabase target/i);
  });

  it('does not let an old production override re-enable production access', () => {
    setLocalTarget();
    process.env.E2E_ALLOW_PRODUCTION = 'true';
    expect(() => assertIsolatedE2ETarget()).toThrow(/permanently disabled/i);
  });

  it('rejects remote browser targets', () => {
    setLocalTarget();
    process.env.E2E_BASE_URL = 'https://preview.example.invalid';
    expect(() => assertIsolatedE2ETarget()).toThrow(/Only a local browser target/i);
  });
});
