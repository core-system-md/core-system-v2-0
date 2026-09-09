import { createClient } from '@supabase/supabase-js';
import { E2E_PREFIX, E2E_PATIENTS, E2E_SESSION_IDS } from './fixtures/patients.mjs';

for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'E2E_TENANT_ID']) {
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
const tenantId = process.env.E2E_TENANT_ID;
const deletedAt = new Date().toISOString();
const agendaIds = E2E_PATIENTS.map((p) => `30000000-0000-4000-8000-${String(p.n).padStart(12, '0')}`);

// Constitution/P137 contract: never issue physical DELETE; use verified soft-delete tables.
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

const { error: agendaError } = await supabase
  .from('master_agenda_events')
  .update({ deleted_at: deletedAt })
  .eq('tenant_id', tenantId)
  .in('id', agendaIds)
  .is('deleted_at', null);
if (agendaError) throw new Error(`[E2E] appointment soft-reset failed: ${agendaError.message}`);

const { error: patientError } = await supabase
  .from('clinic_patients')
  .update({ deleted_at: deletedAt, is_active: false })
  .eq('tenant_id', tenantId)
  .like('mrn', `${E2E_PREFIX}%`)
  .is('deleted_at', null);
if (patientError) throw new Error(`[E2E] patient soft-reset failed: ${patientError.message}`);

const { count: remainingPatients, error: verifyPatientError } = await supabase
  .from('clinic_patients')
  .select('id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)
  .like('mrn', `${E2E_PREFIX}%`)
  .is('deleted_at', null);
if (verifyPatientError) throw new Error(`[E2E] patient reset verification failed: ${verifyPatientError.message}`);
if ((remainingPatients ?? 0) !== 0) throw new Error(`[E2E] patient reset verification failed: ${remainingPatients ?? 0} active fixtures remain.`);

const { count: remainingAppointments, error: verifyAgendaError } = await supabase
  .from('master_agenda_events')
  .select('id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)
  .in('id', agendaIds)
  .is('deleted_at', null);
if (verifyAgendaError) throw new Error(`[E2E] appointment reset verification failed: ${verifyAgendaError.message}`);
if ((remainingAppointments ?? 0) !== 0) throw new Error(`[E2E] appointment reset verification failed: ${remainingAppointments ?? 0} active fixtures remain.`);

console.log(`[E2E] Soft-reset complete for ${E2E_PATIENTS.length} patients, ${agendaIds.length} appointments and ${E2E_SESSION_IDS.length} sessions.`);
