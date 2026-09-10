import { createClient } from '@supabase/supabase-js';
import { E2E_PREFIX, E2E_PATIENTS, E2E_SESSION_IDS } from './fixtures/patients.mjs';
import { E2E_STAFF, E2E_TENANT_ID } from './fixtures/staff.mjs';

for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[key]) throw new Error(`[E2E] Missing required environment variable: ${key}`);
}
if (process.env.E2E_ALLOW_MUTATION !== 'true') {
  throw new Error('[E2E] Refusing mutation. Set E2E_ALLOW_MUTATION=true explicitly.');
}
if (process.env.E2E_ALLOW_PRODUCTION === 'true' && !/^https:\/\//i.test(process.env.E2E_BASE_URL ?? '')) {
  throw new Error('[E2E] E2E_ALLOW_PRODUCTION=true requires an explicit HTTPS target.');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const tenantId = process.env.E2E_TENANT_ID ?? E2E_TENANT_ID;
const deletedAt = new Date().toISOString();

const { error: intakeError } = await supabase
  .from('patient_intake_responses')
  .update({ deleted_at: deletedAt })
  .eq('tenant_id', tenantId)
  .in('session_id', E2E_SESSION_IDS)
  .is('deleted_at', null);
if (intakeError) throw new Error(`[E2E] intake soft-reset failed: ${intakeError.message}`);

const { error: sessionError } = await supabase
  .from('clinic_visit_sessions')
  .update({ deleted_at: deletedAt })
  .eq('tenant_id', tenantId)
  .in('id', E2E_SESSION_IDS)
  .is('deleted_at', null);
if (sessionError) throw new Error(`[E2E] session soft-reset failed: ${sessionError.message}`);

const { error: patientError } = await supabase
  .from('clinic_patients')
  .update({ deleted_at: deletedAt, is_active: false })
  .eq('tenant_id', tenantId)
  .like('mrn', `${E2E_PREFIX}%`)
  .is('deleted_at', null);
if (patientError) throw new Error(`[E2E] patient soft-reset failed: ${patientError.message}`);

const { error: staffError } = await supabase
  .from('clinic_users')
  .update({ deleted_at: deletedAt, is_active: false })
  .eq('tenant_id', tenantId)
  .in('email', E2E_STAFF.map((staff) => staff.email))
  .is('deleted_at', null);
if (staffError) throw new Error(`[E2E] staff soft-reset failed: ${staffError.message}`);

const { data: remaining, error: verifyError } = await supabase
  .from('clinic_patients')
  .select('id')
  .eq('tenant_id', tenantId)
  .like('mrn', `${E2E_PREFIX}%`)
  .is('deleted_at', null);
if (verifyError) throw new Error(`[E2E] reset verification failed: ${verifyError.message}`);
if ((remaining?.length ?? 0) !== 0) throw new Error(`[E2E] reset verification failed: ${remaining?.length ?? 0} active patient fixtures remain.`);

const { data: staffRemaining, error: staffVerifyError } = await supabase
  .from('clinic_users')
  .select('id')
  .eq('tenant_id', tenantId)
  .in('email', E2E_STAFF.map((staff) => staff.email))
  .is('deleted_at', null);
if (staffVerifyError) throw new Error(`[E2E] staff reset verification failed: ${staffVerifyError.message}`);
if ((staffRemaining?.length ?? 0) !== 0) throw new Error(`[E2E] reset verification failed: ${staffRemaining?.length ?? 0} active staff fixtures remain.`);

console.log(`[E2E] Soft-reset complete for ${E2E_PATIENTS.length} patient fixtures and ${E2E_STAFF.length} role fixtures.`);
