import { createClient } from '@supabase/supabase-js';
import { E2E_STAFF, E2E_TENANT_ID } from '../e2e/fixtures/staff.mjs';
import { E2E_SESSION_IDS } from '../e2e/fixtures/patients.mjs';

for (const key of ['SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[key]) throw new Error(`[INTEGRATION] Missing required environment variable: ${key}`);
}

const tenantId = process.env.E2E_TENANT_ID ?? E2E_TENANT_ID;
const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
const anonKey = (process.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
if (!/^https?:\/\//i.test(supabaseUrl)) throw new Error(`[INTEGRATION] Invalid isolated Supabase URL: ${JSON.stringify(supabaseUrl)}`);
if (!anonKey || !serviceRoleKey) throw new Error('[INTEGRATION] Missing isolated Supabase credentials after environment normalization.');
const anon = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run(command, args, env = process.env) {
  const { spawnSync } = await import('node:child_process');
  const result = spawnSync(command, args, { stdio: 'inherit', env });
  if (result.error) throw result.error;
  if ((result.status ?? 1) !== 0) throw new Error(`[INTEGRATION] ${command} ${args.join(' ')} failed with ${result.status}`);
}

const mutationEnv = { ...process.env, E2E_ALLOW_MUTATION: 'true' };
let seeded = false;
try {
  await run('node', ['e2e/seed.mjs'], mutationEnv);
  seeded = true;

  const receptionist = E2E_STAFF.find((staff) => staff.role === 'receptionist');
  if (!receptionist) throw new Error('[INTEGRATION] receptionist fixture missing');

  const { data: login, error: loginError } = await anon.rpc('create_pin_session', {
    p_tenant_id: tenantId,
    p_employee_code: receptionist.employee_code,
    p_pin: receptionist.pin,
  });
  if (loginError || !login?.success || typeof login.session_token !== 'string') {
    throw new Error(`[INTEGRATION] PIN login failed: ${loginError?.message ?? 'invalid response'}`);
  }

  const targetSessionId = E2E_SESSION_IDS[0];
  const secondSessionId = E2E_SESSION_IDS[1];

  const { error: waitingError } = await admin
    .from('clinic_visit_sessions')
    .update({ session_status: 'waiting', queue_position: 1, deleted_at: null })
    .eq('tenant_id', tenantId)
    .in('id', [targetSessionId, secondSessionId]);
  if (waitingError) throw new Error(`[INTEGRATION] fixture preparation failed: ${waitingError.message}`);

  const { data: lock, error: lockError } = await anon.rpc('acquire_reception_session_lock_for_pin_session', {
    p_tenant_id: tenantId,
    p_session_token: login.session_token,
    p_session_id: targetSessionId,
  });
  if (lockError || lock?.success !== true) {
    throw new Error(`[INTEGRATION] lock acquisition failed: ${lockError?.message ?? JSON.stringify(lock)}`);
  }

  const { data: reordered, error: reorderError } = await anon.rpc('reorder_reception_queue_for_pin_session', {
    p_tenant_id: tenantId,
    p_session_token: login.session_token,
    p_session_id: targetSessionId,
    p_to_index: 2,
  });
  if (reorderError || reordered !== true) {
    throw new Error(`[INTEGRATION] queue reorder failed: ${reorderError?.message ?? JSON.stringify(reordered)}`);
  }

  const { data: released, error: releaseError } = await anon.rpc('release_reception_session_lock_for_pin_session', {
    p_tenant_id: tenantId,
    p_session_token: login.session_token,
    p_session_id: targetSessionId,
  });
  if (releaseError || released?.success !== true) {
    throw new Error(`[INTEGRATION] lock release failed: ${releaseError?.message ?? JSON.stringify(released)}`);
  }

  const { data: row, error: rowError } = await admin
    .from('clinic_visit_sessions')
    .select('id,tenant_id,session_status,queue_position,lock_holder_id,deleted_at')
    .eq('id', targetSessionId)
    .eq('tenant_id', tenantId)
    .single();
  if (rowError) throw new Error(`[INTEGRATION] state read-back failed: ${rowError.message}`);
  if (row.deleted_at !== null || row.tenant_id !== tenantId || row.lock_holder_id !== null || row.queue_position !== 2 || row.session_status !== 'waiting') {
    throw new Error(`[INTEGRATION] state reconciliation mismatch: ${JSON.stringify(row)}`);
  }

  console.log('[INTEGRATION] PASS — receptionist workflow persisted and reconciled.');
} finally {
  if (seeded) await run('node', ['e2e/reset.mjs'], mutationEnv);
}