#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { E2E_STAFF, E2E_TENANT_ID } from '../e2e/fixtures/staff.mjs';

for (const key of ['SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[key]) throw new Error(`[DATABASE] Missing required environment variable: ${key}`);
}

const tenantId = process.env.E2E_TENANT_ID ?? E2E_TENANT_ID;
const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
const anonKey = (process.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();

if (!/^https?:\/\//i.test(supabaseUrl)) throw new Error(`[DATABASE] Invalid isolated Supabase URL: ${JSON.stringify(supabaseUrl)}`);
if (!anonKey || !serviceRoleKey) throw new Error('[DATABASE] Missing isolated Supabase credentials after environment normalization.');

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
  if ((result.status ?? 1) !== 0) throw new Error(`[DATABASE] ${command} ${args.join(' ')} failed with ${result.status}`);
}

async function expectSelect(label, query, validator = null) {
  const { data, error } = await query;
  if (error) throw new Error(`[DATABASE] ${label} failed: ${error.message}`);
  if (validator) validator(data);
  console.log(`[DATABASE] PASS — ${label}`);
  return data;
}

const mutationEnv = { ...process.env, E2E_ALLOW_MUTATION: 'true' };
let seeded = false;

try {
  await run('node', ['e2e/seed.mjs'], mutationEnv);
  seeded = true;

  const receptionist = E2E_STAFF.find((staff) => staff.role === 'receptionist');
  if (!receptionist) throw new Error('[DATABASE] receptionist fixture missing');

  const { data: login, error: loginError } = await anon.rpc('create_pin_session', {
    p_tenant_id: tenantId,
    p_employee_code: receptionist.employee_code,
    p_pin: receptionist.pin,
  });
  if (loginError || !login?.success || typeof login.session_token !== 'string') {
    throw new Error(`[DATABASE] PIN session fixture creation failed: ${loginError?.message ?? 'invalid response'}`);
  }

  const tenant = await expectSelect(
    'tenant production-parity columns',
    admin
      .from('master_tenants')
      .select('id,name,clinic_name,clinic_name_ar,primary_color,timezone,currency,license_key,deleted_at')
      .eq('id', tenantId)
      .single(),
    (row) => {
      if (row.id !== tenantId) throw new Error(`[DATABASE] tenant identity mismatch: ${row.id}`);
      if (!row.clinic_name) throw new Error('[DATABASE] clinic_name is empty');
    },
  );

  const patients = await expectSelect(
    'patient production-parity columns',
    admin
      .from('clinic_patients')
      .select('id,tenant_id,phone_primary,phone_secondary,preferred_channel,first_visit_date,referral_source,patient_status,notes,core_score_display,dominant_disc_profile,deleted_at')
      .eq('tenant_id', tenantId)
      .limit(20),
    (rows) => {
      if (!Array.isArray(rows) || rows.length < 20) throw new Error(`[DATABASE] expected >=20 patients, got ${rows?.length ?? 0}`);
      if (rows.some((row) => row.tenant_id !== tenantId)) throw new Error('[DATABASE] patient tenant boundary mismatch');
    },
  );

  const sessions = await expectSelect(
    'visit-session operational columns',
    admin
      .from('clinic_visit_sessions')
      .select('id,tenant_id,doctor_id,queue_position,deleted_at,is_insured,lock_holder_id,lock_timestamp')
      .eq('tenant_id', tenantId)
      .limit(20),
    (rows) => {
      if (!Array.isArray(rows) || rows.length < 20) throw new Error(`[DATABASE] expected >=20 sessions, got ${rows?.length ?? 0}`);
      if (rows.some((row) => row.tenant_id !== tenantId)) throw new Error('[DATABASE] session tenant boundary mismatch');
      if (rows.some((row) => !row.doctor_id)) throw new Error('[DATABASE] seeded session missing doctor_id');
    },
  );

  const attempts = await expectSelect(
    'PIN-attempt audit columns',
    admin
      .from('pin_attempt_log')
      .select('id,tenant_id,staff_id,attempted_pin,ip_address,success,created_at,deleted_at,updated_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1),
  );

  const pinSessions = await expectSelect(
    'PIN-session persistence columns',
    admin
      .from('pin_sessions')
      .select('id,tenant_id,staff_id,token_hash,expires_at,created_at,deleted_at')
      .eq('tenant_id', tenantId)
      .limit(1),
    (rows) => {
      if (!Array.isArray(rows) || rows.length < 1) throw new Error('[DATABASE] PIN session was not persisted');
      if (!rows[0].token_hash || !rows[0].expires_at) throw new Error('[DATABASE] PIN session persisted without hash/expiry');
    },
  );

  await expectSelect(
    'patient-intake soft-delete/session columns',
    admin.from('patient_intake_responses').select('id,session_id,deleted_at').limit(1),
  );

  const { data: directRows, error: directError } = await anon
    .from('clinic_patients')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);

  if (directError) {
    console.log('[DATABASE] PASS — direct anon patient access denied by API/RLS');
  } else if ((directRows?.length ?? 0) > 0) {
    throw new Error('[DATABASE] direct anon patient access exposed tenant data');
  } else {
    console.log('[DATABASE] PASS — direct anon patient rows not exposed');
  }

  if (tenant.timezone !== 'Asia/Amman') {
    console.log(`[DATABASE] NOTE — fixture timezone is ${tenant.timezone}; no hardcoded timezone rule was asserted.`);
  }

  console.log(`[DATABASE] PASS — schema/state validation completed (${patients.length} patients, ${sessions.length} sessions).`);
  void attempts;
  void pinSessions;
} finally {
  if (seeded) await run('node', ['e2e/reset.mjs'], mutationEnv);
}
