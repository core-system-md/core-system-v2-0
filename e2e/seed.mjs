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

console.log(`[E2E] Seeding ${patients.length} patients and ${sessions.length} sessions into tenant ${tenantId}.`);

const { error: patientError } = await supabase.from('clinic_patients').upsert(patients, { onConflict: 'id' });
if (patientError) throw new Error(`[E2E] clinic_patients seed failed: ${patientError.message}`);

const { error: sessionError } = await supabase.from('clinic_visit_sessions').upsert(sessions, { onConflict: 'id' });
if (sessionError) throw new Error(`[E2E] clinic_visit_sessions seed failed: ${sessionError.message}`);

const { data: verification, error: verificationError } = await supabase
  .from('clinic_patients')
  .select('id,mrn,tenant_id,deleted_at')
  .eq('tenant_id', tenantId)
  .like('mrn', 'E2E-PT-%')
  .is('deleted_at', null);
if (verificationError) throw new Error(`[E2E] verification failed: ${verificationError.message}`);
if ((verification?.length ?? 0) < patients.length) {
  throw new Error(`[E2E] verification failed: expected ${patients.length} active fixtures, found ${verification?.length ?? 0}.`);
}

console.log(`[E2E] Seed verified: ${verification.length} active patient fixtures.`);
console.log(`[E2E] Browser target: ${baseUrl}`);
