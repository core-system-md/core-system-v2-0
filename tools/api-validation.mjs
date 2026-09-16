#!/usr/bin/env node

const baseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!baseUrl || !anonKey) {
  throw new Error('API validation requires SUPABASE_URL and SUPABASE_ANON_KEY (or their VITE_ equivalents).');
}

const root = baseUrl.replace(/\/$/, '');
const rootUrl = `${root}/rest/v1/`;
const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
  Accept: 'application/json',
};

async function expectStatus(label, url, init, expected) {
  const response = await fetch(url, init);
  const body = await response.text();
  if (response.status !== expected) {
    throw new Error(`[api] ${label}: expected HTTP ${expected}, received ${response.status}. Body: ${body.slice(0, 500)}`);
  }
  console.log(`[api] PASS ${label}: HTTP ${response.status}`);
}

await expectStatus('PostgREST root is reachable', rootUrl, { headers }, 200);

const rpcUrl = `${root}/rest/v1/rpc/validate_license`;
const rpcHeaders = { ...headers, 'Content-Type': 'application/json' };

await expectStatus(
  'validate_license canonical public RPC contract',
  rpcUrl,
  {
    method: 'POST',
    headers: rpcHeaders,
    body: JSON.stringify({ p_license_key: '__e2e_nonexistent_license__' }),
  },
  200,
);

console.log('[api] API validation completed.');
