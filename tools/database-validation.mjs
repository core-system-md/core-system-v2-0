#!/usr/bin/env node

const baseUrl = (process.env.SUPABASE_URL ?? '').trim().replace(/^"|"$/g, '').replace(/\/$/, '');
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().replace(/^"|"$/g, '');

if (!baseUrl || !serviceKey) {
  throw new Error('[database-validation] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

async function get(path, label) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`[database-validation] ${label} -> HTTP ${response.status}: ${body.slice(0, 300)}`);
  return body;
}

const tables = [
  ['/rest/v1/master_tenants?select=id,deleted_at&limit=1', 'master_tenants contract'],
  ['/rest/v1/clinic_users?select=id,tenant_id,role,deleted_at&limit=1', 'clinic_users contract'],
  ['/rest/v1/clinic_patients?select=id,tenant_id,deleted_at&limit=1', 'clinic_patients contract'],
  ['/rest/v1/clinic_visit_sessions?select=id,tenant_id,session_status,deleted_at&limit=1', 'clinic_visit_sessions contract'],
  ['/rest/v1/clinic_invoices?select=id,tenant_id,deleted_at&limit=1', 'clinic_invoices contract'],
];

for (const [path, label] of tables) {
  await get(path, label);
  console.log(`[database-validation] PASS — ${label}`);
}

const functions = [
  '/rpc/validate_license',
  '/rpc/validate_pin',
];

const openApi = JSON.parse(await get('/rest/v1/', 'PostgREST OpenAPI contract'));
for (const rpcPath of functions) {
  const route = openApi.paths?.[rpcPath];
  if (!route || typeof route !== 'object') {
    throw new Error(`[database-validation] RPC endpoint contract unavailable: ${rpcPath}`);
  }
  console.log(`[database-validation] PASS — ${rpcPath} is exposed by PostgREST.`);
}

console.log('[database-validation] PASS — critical RPC endpoints are exposed by PostgREST.');
console.log('[database-validation] PASS — database contract smoke validation completed.');
