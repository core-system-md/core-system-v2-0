import { createClient } from '@supabase/supabase-js';
import { E2E_PATIENTS, E2E_SESSION_IDS } from './fixtures/patients.mjs';
import { E2E_LICENSE_KEY, E2E_STAFF, E2E_TENANT_ID } from './fixtures/staff.mjs';

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
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

for (const staff of E2E_STAFF) {
  const { data: created, error: authError } = await supabase.auth.admin.createUser({
    email: staff.email,
    password: staff.password,
    email_confirm: true,
  });
  if (authError && !/already registered/i.test(authError.message)) {
    throw new Error(`[E2E] Auth fixture ${staff.role} failed: ${authError.message}`);
  }

  let userId = created?.user?.id;
  if (!userId) {
    const { data: users, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (listError) throw new Error(`[E2E] Auth fixture lookup failed: ${listError.message}`);
    userId = users.users.find((u) => u.email === staff.email)?.id;
  }
  if (!userId) throw new Error(`[E2E] No Auth user found for ${staff.role}`);

  const { error: profileError } = await supabase.from('clinic_users').upsert({
    id: userId,
    tenant_id: tenantId,
    email: staff.email,
    full_name: staff.full_name,
    full_name_ar: staff.full_name_ar,
    role: staff.role,
    employee_code: staff.employee_code,
    is_active: true,
    deleted_at: null,
    specialization: staff.role === 'doctor' ? 'E2E Family Medicine' : null,
  }, { onConflict: 'id' });
  if (profileError) throw new Error(`[E2E] clinic_users seed for ${staff.role} failed: ${profileError.message}`);
}

const patients = E2E_PATIENTS.map((p) => ({
  id: p.id,
  tenant_id: tenantId,
  mrn: p.mrn,
  full_name: p.full_name,
  phone: p.phone,
  date_of_birth: p.date_of_birth,
  gender: p.gender,
  allergies: p.allergies,
  is_active: true,
  deleted_at: null,
}));

const sessions = E2E_PATIENTS.map((p, i) => ({
  id: E2E_SESSION_IDS[i],
  tenant_id: tenantId,
  patient_id: p.id,
  session_status: 'pending',
  payment_status: 'pending',
  total_charge_fils: 0,
  session_metadata: {
    e2e: true,
    e2e_case: p.n,
    urgency: p.urgency,
    visit_type: p.visit,
  },
  deleted_at: null,
}));

const { error: patientError } = await supabase.from('clinic_patients').upsert(patients, { onConflict: 'id' });
if (patientError) throw new Error(`[E2E] clinic_patients seed failed: ${patientError.message}`);
const { error: sessionError } = await supabase.from('clinic_visit_sessions').upsert(sessions, { onConflict: 'id' });
if (sessionError) throw new Error(`[E2E] clinic_visit_sessions seed failed: ${sessionError.message}`);

const { data: patientVerification, error: verificationError } = await supabase
  .from('clinic_patients')
  .select('id,mrn,tenant_id,deleted_at')
  .eq('tenant_id', tenantId)
  .like('mrn', 'E2E-PT-%')
  .is('deleted_at', null);
if (verificationError) throw new Error(`[E2E] patient verification failed: ${verificationError.message}`);
if ((patientVerification?.length ?? 0) !== patients.length) {
  throw new Error(`[E2E] patient verification failed: expected ${patients.length}, found ${patientVerification?.length ?? 0}.`);
}

console.log(`[E2E] Seed verified: ${patients.length} patients, ${sessions.length} sessions, ${E2E_STAFF.length} staff roles.`);
console.log(`[E2E] Browser target: ${baseUrl}`);
