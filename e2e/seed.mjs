import { createClient } from '@supabase/supabase-js';
import { E2E_PATIENTS, E2E_SESSION_IDS } from './fixtures/patients.mjs';
import { E2E_LICENSE_KEY, E2E_STAFF, E2E_TENANT_ID } from './fixtures/staff.mjs';

for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
  if (!process.env[key]) throw new Error(`[E2E] Missing required environment variable: ${key}`);
}
if (process.env.E2E_ALLOW_MUTATION !== 'true') throw new Error('[E2E] Refusing mutation. Set E2E_ALLOW_MUTATION=true explicitly.');
const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';
if (/^https:\/\//i.test(baseUrl) && process.env.E2E_ALLOW_PRODUCTION !== 'true') throw new Error('[E2E] HTTPS target rejected without explicit production approval.');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const tenantId = process.env.E2E_TENANT_ID ?? E2E_TENANT_ID;

const { error: tenantError } = await supabase.from('master_tenants').upsert({
  id: tenantId,
  slug: 'e2e-local-test-tenant',
  name: 'E2E Local Test Tenant',
  license_key: E2E_LICENSE_KEY,
  subscription_tier: 'trial',
  max_users: 20,
  max_patients: 100,
  max_procedures_per_month: 500,
  is_active: true,
  deleted_at: null,
  timezone: 'Asia/Amman',
  currency: 'JOD',
  clinic_name: 'E2E Local Clinic',
  clinic_name_ar: 'عيادة الاختبار المحلية',
  primary_color: '#1B2A4A',
}, { onConflict: 'id' });
if (tenantError) throw new Error(`[E2E] master_tenants seed failed: ${tenantError.message}`);

const staffRows = E2E_STAFF.map((staff, index) => ({
  id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  tenant_id: tenantId,
  email: staff.email,
  full_name: staff.full_name,
  full_name_ar: staff.full_name_ar,
  role: staff.role,
  employee_code: staff.employee_code,
  pin_code: staff.pin,
  is_active: true,
  deleted_at: null,
  specialization: staff.role === 'doctor' ? 'E2E Family Medicine' : null,
}));

const { error: staffError } = await supabase.from('clinic_users').upsert(staffRows, { onConflict: 'id' });
if (staffError) throw new Error(`[E2E] clinic_users seed failed: ${staffError.message}`);

const patients = E2E_PATIENTS.map((p) => ({
  id: p.id, tenant_id: tenantId, mrn: p.mrn, full_name: p.full_name, phone_primary: p.phone,
  date_of_birth: p.date_of_birth, gender: p.gender, allergies: p.allergies, is_active: true, deleted_at: null,
}));
const e2eDoctor = E2E_STAFF.findIndex((staff) => staff.role === 'doctor');
if (e2eDoctor < 0) throw new Error('[E2E] doctor fixture missing');
const doctorId = `30000000-0000-4000-8000-${String(e2eDoctor + 1).padStart(12, '0')}`;

const sessions = E2E_PATIENTS.map((p, i) => ({
  id: E2E_SESSION_IDS[i], tenant_id: tenantId, patient_id: p.id, doctor_id: doctorId, session_status: 'pending', payment_status: 'pending',
  session_metadata: { e2e: true, e2e_case: p.n, urgency: p.urgency, visit_type: p.visit }, deleted_at: null,
}));

const { error: patientError } = await supabase.from('clinic_patients').upsert(patients, { onConflict: 'id' });
if (patientError) throw new Error(`[E2E] clinic_patients seed failed: ${patientError.message}`);
const { error: sessionError } = await supabase.from('clinic_visit_sessions').upsert(sessions, { onConflict: 'id' });
if (sessionError) throw new Error(`[E2E] clinic_visit_sessions seed failed: ${sessionError.message}`);

const intakeRows = E2E_SESSION_IDS.map((sessionId, index) => ({
  tenant_id: tenantId,
  session_id: sessionId,
  patient_id: E2E_PATIENTS[index].id,
  visit_type_selection: null,
  service_reason: null,
  procedures_requested: [],
  consent_accepted: false,
  consent_timestamp: null,
  service_interest: null,
  visit_goal: null,
  consideration_period: null,
  readiness_level: null,
  decision_factor: null,
  referral_source: null,
  followup_importance: null,
  top_priorities: [],
  main_concern: null,
  openness_to_proceed: null,
  digital_signature_svg: null,
  signature_timestamp: null,
  whatsapp_redirect_sent: false,
  completion_status: null,
  completed_at: null,
  deleted_at: null,
}));
const { error: intakeSeedError } = await supabase
  .from('patient_intake_responses')
  .upsert(intakeRows, { onConflict: 'session_id' });
if (intakeSeedError) throw new Error(`[E2E] patient_intake_responses seed failed: ${intakeSeedError.message}`);

const [{ count: staffCount, error: staffVerifyError }, { count: patientCount, error: patientVerifyError }, { count: sessionCount, error: sessionVerifyError }] = await Promise.all([
  supabase.from('clinic_users').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('role', E2E_STAFF.map((staff) => staff.role)).like('employee_code', 'E2E-%').is('deleted_at', null),
  supabase.from('clinic_patients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).like('mrn', 'E2E-PT-%').is('deleted_at', null),
  supabase.from('clinic_visit_sessions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('id', E2E_SESSION_IDS).is('deleted_at', null),
]);
if (staffVerifyError || patientVerifyError || sessionVerifyError) throw new Error(`[E2E] seed verification failed: ${staffVerifyError?.message ?? patientVerifyError?.message ?? sessionVerifyError?.message}`);
if (staffCount !== E2E_STAFF.length || patientCount !== E2E_PATIENTS.length || sessionCount !== E2E_SESSION_IDS.length) {
  throw new Error(`[E2E] seed verification mismatch: staff=${staffCount}, patients=${patientCount}, sessions=${sessionCount}`);
}

console.log(`[E2E] Seed verified: ${patientCount} patients, ${sessionCount} sessions, ${staffCount} staff roles.`);
console.log(`[E2E] Browser target: ${baseUrl}`);
