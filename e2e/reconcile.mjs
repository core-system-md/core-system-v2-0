import { createClient } from '@supabase/supabase-js';
import { E2E_PATIENTS, E2E_SESSION_IDS, E2E_PREFIX } from './fixtures/patients.mjs';
import { E2E_STAFF, E2E_TENANT_ID } from './fixtures/staff.mjs';

for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[key]) throw new Error(`[E2E] Missing required environment variable: ${key}`);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const tenantId = process.env.E2E_TENANT_ID ?? E2E_TENANT_ID;
const failures = [];

async function count(table, column, value) {
  const { count: result, error } = await supabase.from(table).select(column, { count: 'exact', head: true }).eq('tenant_id', tenantId).eq(column, value);
  if (error) failures.push(`${table}: ${error.message}`);
  return result ?? 0;
}

const patientCount = await count('clinic_patients', 'is_active', true);
if (patientCount < E2E_PATIENTS.length) failures.push(`clinic_patients expected at least ${E2E_PATIENTS.length} active rows, found ${patientCount}`);

const { data: patientRows, error: patientError } = await supabase
  .from('clinic_patients')
  .select('id,mrn,tenant_id,deleted_at,is_active')
  .eq('tenant_id', tenantId)
  .like('mrn', `${E2E_PREFIX}%`);
if (patientError) failures.push(`clinic_patients read: ${patientError.message}`);
if ((patientRows?.filter((row) => row.deleted_at === null && row.is_active === true).length ?? 0) !== E2E_PATIENTS.length) {
  failures.push('patient fixture reconciliation mismatch');
}
if ((patientRows?.some((row) => row.tenant_id !== tenantId) ?? false)) failures.push('patient tenant boundary mismatch');

const { data: sessions, error: sessionError } = await supabase
  .from('clinic_visit_sessions')
  .select('id,tenant_id,patient_id,deleted_at')
  .eq('tenant_id', tenantId)
  .in('id', E2E_SESSION_IDS);
if (sessionError) failures.push(`clinic_visit_sessions read: ${sessionError.message}`);
if ((sessions?.filter((row) => row.deleted_at === null).length ?? 0) !== E2E_SESSION_IDS.length) {
  failures.push(`session fixture reconciliation expected ${E2E_SESSION_IDS.length} active sessions`);
}
if ((sessions?.some((row) => !E2E_PATIENTS.some((patient) => patient.id === row.patient_id)) ?? false)) failures.push('session-to-patient reconciliation mismatch');

const roleEmails = E2E_STAFF.map((staff) => staff.email);
const { data: staffRows, error: staffError } = await supabase
  .from('clinic_users')
  .select('id,email,tenant_id,role,is_active,deleted_at')
  .eq('tenant_id', tenantId)
  .in('email', roleEmails);
if (staffError) failures.push(`clinic_users read: ${staffError.message}`);
for (const staff of E2E_STAFF) {
  const row = staffRows?.find((candidate) => candidate.email === staff.email);
  if (!row) failures.push(`missing role fixture: ${staff.role}`);
  else if (row.role !== staff.role || row.tenant_id !== tenantId || row.is_active !== true || row.deleted_at !== null) {
    failures.push(`role fixture mismatch: ${staff.role}`);
  }
}

const duplicateEmails = new Set();
for (const row of staffRows ?? []) {
  if (duplicateEmails.has(row.email)) failures.push(`duplicate staff email fixture: ${row.email}`);
  duplicateEmails.add(row.email);
}

if (failures.length) {
  console.error('[E2E][RECONCILIATION] FAILED');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`[E2E][RECONCILIATION] PASS — ${E2E_PATIENTS.length} patients, ${E2E_SESSION_IDS.length} sessions, ${E2E_STAFF.length} roles reconciled.`);
