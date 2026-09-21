import { createClient } from '@supabase/supabase-js';
import { E2E_LICENSE_KEY, E2E_STAFF, E2E_TENANT_ID } from '../e2e/fixtures/staff.mjs';

for (const key of ['SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[key]) throw new Error(`[API] Missing required environment variable: ${key}`);
}

const tenantId = process.env.E2E_TENANT_ID ?? E2E_TENANT_ID;
const anon = createClient(process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run(command, args, env = process.env) {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(command, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) throw new Error(`[API] ${command} ${args.join(' ')} failed with ${result.status}`);
}

const mutationEnv = { ...process.env, E2E_ALLOW_MUTATION: 'true' };
let seeded = false;
try {
  await run('node', ['e2e/seed.mjs'], mutationEnv);
  seeded = true;

  const receptionist = E2E_STAFF.find((staff) => staff.role === 'receptionist');
  if (!receptionist) throw new Error('[API] receptionist fixture missing');

  const { data: login, error: loginError } = await anon.rpc('create_pin_session', {
    p_tenant_id: tenantId,
    p_employee_code: receptionist.employee_code,
    p_pin: receptionist.pin,
  });
  if (loginError) throw new Error(`[API] create_pin_session failed: ${loginError.message}`);
  if (!login?.success || typeof login.session_token !== 'string' || login.session_token.length < 32) {
    throw new Error('[API] create_pin_session contract mismatch');
  }
  if (login.role !== 'receptionist' || login.tenant_id !== tenantId) {
    throw new Error('[API] create_pin_session identity contract mismatch');
  }
  console.log('[API] PASS — PIN session creation contract');

  const { data: queue, error: queueError } = await anon.rpc('get_queue_for_pin_session', {
    p_tenant_id: tenantId,
    p_session_token: login.session_token,
  });
  if (queueError) throw new Error(`[API] get_queue_for_pin_session failed: ${queueError.message}`);
  if (!Array.isArray(queue) || queue.length < 20) {
    throw new Error(`[API] queue contract mismatch: expected >=20 seeded sessions, received ${queue?.length ?? 0}`);
  }
  if (queue.some((row) => row.tenant_id && row.tenant_id !== tenantId)) {
    throw new Error('[API] queue tenant boundary mismatch');
  }
  console.log(`[API] PASS — queue session contract (${queue.length} rows)`);

  const { data: wrongTenantData, error: wrongTenantError } = await anon.rpc('get_queue_for_pin_session', {
    p_tenant_id: '30000000-0000-4000-8000-000000000001',
    p_session_token: login.session_token,
  });
  if (!wrongTenantError && Array.isArray(wrongTenantData) && wrongTenantData.length > 0) {
    throw new Error('[API] cross-tenant queue request was not rejected');
  }
  console.log('[API] PASS — cross-tenant queue request rejected');

  const { data: directRows, error: directError } = await anon
    .from('clinic_patients')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);
  if (directError) {
    console.log('[API] PASS — direct tenant table access denied by API/RLS');
  } else if ((directRows?.length ?? 0) > 0) {
    throw new Error('[API] direct anon access exposed tenant patient rows');
  } else {
    console.log('[API] PASS — direct anon tenant rows not exposed');
  }

  console.log('[API] PASS — all API contract checks completed.');
} finally {
  if (seeded) await run('node', ['e2e/reset.mjs'], mutationEnv);
}