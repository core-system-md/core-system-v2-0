import { createClient } from '@supabase/supabase-js';
import { E2E_PATIENTS, E2E_SESSION_IDS } from './fixtures/patients.mjs';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'E2E_TENANT_ID'];
for (const key of required) {
  if (!process.env[key]) throw new Error(`[E2E] Missing required environment variable: ${key}`);
}
if (process.env.E2E_ALLOW_MUTATION !== 'true') {
  throw new Error('[E2E] Refusing mutation. Set E2E_ALLOW_MUTATION=true explicitly.');
}
const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';
if (/^https:\/\//i.test(baseUrl) && process.env.E2E_ALLOW_PRODUCTION !== 'true') {
  throw new Error('[E2E] HTTPS target rejected. Set E2E_ALLOW_PRODUCTION=true only for an explicitly approved environment.');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const tenantId = process.env.E2E_TENANT_ID;

const today = new Date();
today.setUTCSeconds(0, 0);

today.setUTCHours(8, 30, 0, 0);
const doctorsResult = await supabase
  .from('clinic_users')
  .select('id,role,is_active,deleted_at')
  .eq('tenant_id', tenantId)
  .eq('role', 'doctor')
  .eq('is_active', true)
  .is('deleted_at', null)
  .order('created_at', { ascending: true })
  .limit(1);
if (doctorsResult.error) throw new Error(`[E2E] doctor lookup failed: ${doctorsResult.error.message}`);
const doctorId = doctorsResult.data?.[0]?.id ?? null;
if (!doctorId) throw new Error('[E2E] No active doctor found for the target tenant.');

const staffResult = await supabase
  .from('clinic_users')
  .select('id,role,is_active,deleted_at')
  .eq('tenant_id', tenantId)
  .in('role', ['receptionist', 'clinic_admin', 'super_admin'])
  .eq('is_active', true)
  .is('deleted_at', null)
  .order('created_at', { ascending: true })
  .limit(1);
if (staffResult.error) throw new Error(`[E2E] staff lookup failed: ${staffResult.error.message}`);
const createdBy = staffResult.data?.[0]?.id ?? null;
if (!createdBy) throw new Error('[E2E] No active reception/admin staff found for the target tenant.');

const patients = E2E_PATIENTS.map((p) => ({
  id: p.id,
  tenant_id: tenantId,
  mrn: p.mrn,
  full_name: p.full_name,
  first_name: `E2E${p.n}`,
  last_name: 'Patient',
  phone_primary: p.phone,
  date_of_birth: p.date_of_birth,
  gender: p.gender,
  allergies: p.allergies,
  patient_status: 'active',
  is_active: true,
  deleted_at: null,
}));

const agendaEvents = E2E_PATIENTS.map((p, i) => {
  const start = new Date(today.getTime() + i * 30 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return {
    id: `20000000-0000-4000-8000-${String(p.n).padStart(12, '0')}`,
    tenant_id: tenantId,
    patient_id: p.id,
    doctor_id: doctorId,
    scheduled_start: start.toISOString(),
    scheduled_end: end.toISOString(),
    buffer_end: end.toISOString(),
    event_type: 'appointment',
    visit_type: p.urgency === 'high' ? 'emergency' : (p.visit === 'returning' ? 'follow_up' : 'first_time'),
    status: 'scheduled',
    booking_notes: `E2E scenario ${p.n}`,
    created_by: createdBy,
    deleted_at: null,
  };
});

const sessions = E2E_PATIENTS.map((p, i) => ({
  id: E2E_SESSION_IDS[i],
  tenant_id: tenantId,
  patient_id: p.id,
  agenda_event_id: agendaEvents[i].id,
  doctor_id: doctorId,
  primary_doctor_id: doctorId,
  scheduled_start: agendaEvents[i].scheduled_start,
  scheduled_end: agendaEvents[i].scheduled_end,
  session_status: 'waiting',
  total_charge_subunits: 0,
  payment_status: 'pending',
  waiting_time_minutes: p.urgency === 'high' ? 25 : p.urgency === 'low' ? 5 : 10,
  core_score_display: p.urgency === 'high' ? 70 : p.urgency === 'low' ? 20 : 50,
  patient_class: p.urgency === 'high' ? 'high_priority' : p.urgency === 'low' ? 'low_priority' : 'medium_priority',
  is_insured: false,
  session_metadata: {
    e2e: true,
    e2e_case: p.n,
    urgency: p.urgency,
    visit_type: p.visit,
  },
  deleted_at: null,
}));

console.log(`[E2E] Seeding ${patients.length} patients, ${sessions.length} sessions and ${agendaEvents.length} appointments into tenant ${tenantId}.`);

const { error: patientError } = await supabase.from('clinic_patients').upsert(patients, { onConflict: 'id' });
if (patientError) throw new Error(`[E2E] clinic_patients seed failed: ${patientError.message}`);

const { error: agendaError } = await supabase.from('master_agenda_events').upsert(agendaEvents, { onConflict: 'id' });
if (agendaError) throw new Error(`[E2E] master_agenda_events seed failed: ${agendaError.message}`);

const { error: sessionError } = await supabase.from('clinic_visit_sessions').upsert(sessions, { onConflict: 'id' });
if (sessionError) throw new Error(`[E2E] clinic_visit_sessions seed failed: ${sessionError.message}`);

const { data: patientVerification, error: patientVerificationError } = await supabase
  .from('clinic_patients')
  .select('id,mrn,tenant_id,deleted_at')
  .eq('tenant_id', tenantId)
  .like('mrn', 'E2E-PT-%')
  .is('deleted_at', null);
if (patientVerificationError) throw new Error(`[E2E] patient verification failed: ${patientVerificationError.message}`);
if ((patientVerification?.length ?? 0) < patients.length) {
  throw new Error(`[E2E] patient verification failed: expected ${patients.length}, found ${patientVerification?.length ?? 0}.`);
}

const { data: sessionVerification, error: sessionVerificationError } = await supabase
  .from('clinic_visit_sessions')
  .select('id,patient_id,session_status,agenda_event_id,doctor_id,deleted_at')
  .eq('tenant_id', tenantId)
  .in('id', E2E_SESSION_IDS)
  .is('deleted_at', null);
if (sessionVerificationError) throw new Error(`[E2E] session verification failed: ${sessionVerificationError.message}`);
if ((sessionVerification?.length ?? 0) !== sessions.length) {
  throw new Error(`[E2E] session verification failed: expected ${sessions.length}, found ${sessionVerification?.length ?? 0}.`);
}

const { data: agendaVerification, error: agendaVerificationError } = await supabase
  .from('master_agenda_events')
  .select('id,patient_id,doctor_id,scheduled_start,status,deleted_at')
  .eq('tenant_id', tenantId)
  .in('id', agendaEvents.map((event) => event.id))
  .is('deleted_at', null);
if (agendaVerificationError) throw new Error(`[E2E] agenda verification failed: ${agendaVerificationError.message}`);
if ((agendaVerification?.length ?? 0) !== agendaEvents.length) {
  throw new Error(`[E2E] agenda verification failed: expected ${agendaEvents.length}, found ${agendaVerification?.length ?? 0}.`);
}

console.log(`[E2E] Seed verified: ${patients.length} patients, ${sessions.length} waiting sessions and ${agendaEvents.length} appointments.`);
console.log(`[E2E] Browser target: ${baseUrl}`);
