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
if (/^https:\/\//i.test(baseUrl) && !process.env.E2E_ALLOW_PRODUCTION) {
  throw new Error('[E2E] HTTPS target rejected. Set E2E_ALLOW_PRODUCTION=true only for an explicitly approved environment.');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tenantId = process.env.E2E_TENANT_ID;
const now = new Date();
const dayStart = new Date(Date.UTC(
  now.getUTCFullYear(),
  now.getUTCMonth(),
  now.getUTCDate(),
  8,
  0,
  0,
));

const { data: doctors, error: doctorsError } = await supabase
  .from('clinic_users')
  .select('id')
  .eq('tenant_id', tenantId)
  .eq('role', 'doctor')
  .eq('is_active', true)
  .is('deleted_at', null)
  .order('id');
if (doctorsError) throw new Error(`[E2E] doctor lookup failed: ${doctorsError.message}`);
if (!doctors?.length) throw new Error('[E2E] No active doctor is available for the E2E tenant.');

const patients = E2E_PATIENTS.map((p) => ({
  id: p.id,
  tenant_id: tenantId,
  mrn: p.mrn,
  full_name: p.full_name,
  first_name: p.full_name.split(' ')[0],
  last_name: p.full_name.split(' ').slice(1).join(' '),
  phone_primary: p.phone,
  date_of_birth: p.date_of_birth,
  gender: p.gender,
  allergies: p.allergies,
  patient_status: 'active',
  preferred_channel: 'whatsapp',
  is_active: true,
  deleted_at: null,
}));

const agendaEvents = E2E_PATIENTS.map((p, i) => {
  const start = new Date(dayStart.getTime() + i * 30 * 60 * 1000);
  const end = new Date(start.getTime() + 30 * 60 * 1000);
  return {
    id: `30000000-0000-4000-8000-${String(p.n).padStart(12, '0')}`,
    tenant_id: tenantId,
    patient_id: p.id,
    doctor_id: doctors[i % doctors.length].id,
    scheduled_start: start.toISOString(),
    scheduled_end: end.toISOString(),
    buffer_end: end.toISOString(),
    event_type: 'appointment',
    visit_type: p.visit === 'new' ? 'first_time' : 'follow_up',
    status: 'scheduled',
    booking_notes: `[E2E] ${p.urgency} priority`,
    deleted_at: null,
  };
});

const sessions = E2E_PATIENTS.map((p, i) => {
  const appointment = agendaEvents[i];
  return {
    id: E2E_SESSION_IDS[i],
    tenant_id: tenantId,
    patient_id: p.id,
    doctor_id: appointment.doctor_id,
    agenda_event_id: appointment.id,
    session_status: 'waiting',
    payment_status: 'pending',
    total_charge_subunits: 0,
    scheduled_start: appointment.scheduled_start,
    scheduled_end: appointment.scheduled_end,
    session_metadata: {
      e2e: true,
      e2e_case: p.n,
      urgency: p.urgency,
      visit_type: p.visit,
    },
    deleted_at: null,
  };
});

console.log(`[E2E] Seeding ${patients.length} patients, ${agendaEvents.length} appointments and ${sessions.length} waiting sessions into tenant ${tenantId}.`);

const { error: patientError } = await supabase.from('clinic_patients').upsert(patients, { onConflict: 'id' });
if (patientError) throw new Error(`[E2E] clinic_patients seed failed: ${patientError.message}`);

const { error: agendaError } = await supabase.from('master_agenda_events').upsert(agendaEvents, { onConflict: 'id' });
if (agendaError) throw new Error(`[E2E] master_agenda_events seed failed: ${agendaError.message}`);

const { error: sessionError } = await supabase.from('clinic_visit_sessions').upsert(sessions, { onConflict: 'id' });
if (sessionError) throw new Error(`[E2E] clinic_visit_sessions seed failed: ${sessionError.message}`);

const { count: patientCount, error: verificationError } = await supabase
  .from('clinic_patients')
  .select('id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)
  .in('id', patients.map((p) => p.id))
  .is('deleted_at', null);
if (verificationError) throw new Error(`[E2E] patient verification failed: ${verificationError.message}`);
if (patientCount !== patients.length) {
  throw new Error(`[E2E] patient verification failed: expected ${patients.length}, found ${patientCount ?? 0}.`);
}

const { count: appointmentCount, error: appointmentVerificationError } = await supabase
  .from('master_agenda_events')
  .select('id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)
  .in('id', agendaEvents.map((event) => event.id))
  .eq('status', 'scheduled')
  .is('deleted_at', null);
if (appointmentVerificationError) throw new Error(`[E2E] appointment verification failed: ${appointmentVerificationError.message}`);
if (appointmentCount !== agendaEvents.length) {
  throw new Error(`[E2E] appointment verification failed: expected ${agendaEvents.length}, found ${appointmentCount ?? 0}.`);
}

const { count: sessionCount, error: sessionVerificationError } = await supabase
  .from('clinic_visit_sessions')
  .select('id', { count: 'exact', head: true })
  .eq('tenant_id', tenantId)
  .in('id', E2E_SESSION_IDS)
  .eq('session_status', 'waiting')
  .is('deleted_at', null);
if (sessionVerificationError) throw new Error(`[E2E] session verification failed: ${sessionVerificationError.message}`);
if (sessionCount !== sessions.length) {
  throw new Error(`[E2E] session verification failed: expected ${sessions.length}, found ${sessionCount ?? 0}.`);
}

console.log(`[E2E] Seed verified: ${patientCount} patients, ${appointmentCount} appointments, ${sessionCount} waiting sessions.`);
console.log(`[E2E] Browser target: ${baseUrl}`);
