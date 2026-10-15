// E2E safety boundary: local Supabase only, fixed synthetic tenant, never production.
import { E2E_TENANT_ID } from './fixtures/staff.mjs';

const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const PRODUCTION_SUPABASE_HOST = ['gobdznqbdaklkkqbkynx', 'supabase.co'].join('.');
const PRODUCTION_APP_HOST = ['core-system-v2-0', 'vercel.app'].join('.');

export function assertIsolatedE2ETarget() {
  if (process.env.E2E_ALLOW_PRODUCTION === 'true') {
    throw new Error('[E2E] Production access is permanently disabled for this harness.');
  }

  if (process.env.E2E_TENANT_ID !== E2E_TENANT_ID) {
    throw new Error('[E2E] E2E_TENANT_ID must exactly match the isolated fixture tenant.');
  }

  let supabaseUrl;
  try {
    supabaseUrl = new URL(process.env.SUPABASE_URL ?? '');
  } catch {
    throw new Error('[E2E] SUPABASE_URL must be a valid local URL.');
  }

  if (supabaseUrl.hostname === PRODUCTION_SUPABASE_HOST) {
    throw new Error('[E2E] Production Supabase target is blocked.');
  }
  if (supabaseUrl.protocol !== 'http:' || !LOOPBACK_HOSTS.has(supabaseUrl.hostname)) {
    throw new Error('[E2E] Only a local Supabase target is allowed.');
  }

  let baseUrl;
  try {
    baseUrl = new URL(process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173');
  } catch {
    throw new Error('[E2E] E2E_BASE_URL must be a valid local URL.');
  }

  if (baseUrl.hostname === PRODUCTION_APP_HOST) {
    throw new Error('[E2E] Production application target is blocked.');
  }
  if (baseUrl.protocol !== 'http:' || !LOOPBACK_HOSTS.has(baseUrl.hostname)) {
    throw new Error('[E2E] Only a local browser target is allowed.');
  }

  return {
    tenantId: E2E_TENANT_ID,
    baseUrl: baseUrl.toString().replace(/\/$/, ''),
  };
}
