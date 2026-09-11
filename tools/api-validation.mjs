#!/usr/bin/env node

const baseUrl = (process.env.SUPABASE_URL ?? '').trim().replace(/^['\"]+|['\"]+$/g, '').replace(/\/$/, '');
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim().replace(/^['\"]+|['\"]+$/g, '');

if (!baseUrl || !serviceKey) {
  throw new Error('[api-validation] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
}

function url(path) {
  return new URL(path, `${baseUrl}/`).toString();
}

async function request(path) {
  const response = await fetch(url(path), {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`[api-validation] ${path} -> HTTP ${response.status}: ${body.slice(0, 300)}`);
  return body;
}

const checks = [
  ['/rest/v1/master_tenants?select=id&limit=1', 'master_tenants REST read'],
  ['/rest/v1/clinic_users?select=id&limit=1', 'clinic_users REST read'],
  ['/rest/v1/clinic_patients?select=id&limit=1', 'clinic_patients REST read'],
  ['/rest/v1/clinic_visit_sessions?select=id&limit=1', 'clinic_visit_sessions REST read'],
];

for (const [path, label] of checks) {
  await request(path);
  console.log(`[api-validation] PASS — ${label}`);
}

const health = await fetch(url('/auth/v1/health'));
if (!health.ok) throw new Error(`[api-validation] auth health -> HTTP ${health.status}`);
console.log('[api-validation] PASS — auth API health');

console.log('[api-validation] PASS — repository-native REST/API smoke validation completed.');
