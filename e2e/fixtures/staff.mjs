// ISOLATED E2E ONLY — identities contain no committed PINs, passwords, or license keys.
// e2e/run-full.mjs passes one shared set of ephemeral values to seed, browser tests and reset.
// The generated module-local fallback keeps static/unit-test imports safe when no E2E run is configured.
import { randomBytes, randomInt } from 'node:crypto';

const usedPins = new Set();
function createEphemeralPin() {
  let pin;
  do { pin = String(randomInt(0, 10000)).padStart(4, '0'); } while (usedPins.has(pin));
  usedPins.add(pin);
  return pin;
}

const localFallbacks = {
  E2E_RUNTIME_PIN_SUPER_ADMIN: createEphemeralPin(),
  E2E_RUNTIME_PIN_CLINIC_ADMIN: createEphemeralPin(),
  E2E_RUNTIME_PIN_DOCTOR: createEphemeralPin(),
  E2E_RUNTIME_PIN_RECEPTIONIST: createEphemeralPin(),
  E2E_RUNTIME_LICENSE_KEY: 'E2E-' + randomBytes(24).toString('hex'),
};

function runtimeValue(name, pattern, description) {
  const value = process.env[name] ?? localFallbacks[name];
  if (!value || !pattern.test(value)) {
    throw new Error('[E2E] Invalid ephemeral ' + description + ' supplied via environment variable ' + name + '.');
  }
  return value;
}

export const E2E_STAFF = [
  {
    role: 'super_admin',
    pin: runtimeValue('E2E_RUNTIME_PIN_SUPER_ADMIN', /^\d{4,8}$/, 'PIN'),
    email: 'e2e-super-admin@core-system.invalid',
    full_name: 'E2E Super Admin',
    full_name_ar: 'مسؤول النظام التجريبي',
    employee_code: 'E2E-SA-001',
  },
  {
    role: 'clinic_admin',
    pin: runtimeValue('E2E_RUNTIME_PIN_CLINIC_ADMIN', /^\d{4,8}$/, 'PIN'),
    email: 'e2e-clinic-admin@core-system.invalid',
    full_name: 'E2E Clinic Admin',
    full_name_ar: 'مدير العيادة التجريبي',
    employee_code: 'E2E-CA-001',
  },
  {
    role: 'doctor',
    pin: runtimeValue('E2E_RUNTIME_PIN_DOCTOR', /^\d{4,8}$/, 'PIN'),
    email: 'e2e-doctor@core-system.invalid',
    full_name: 'E2E Doctor',
    full_name_ar: 'الطبيب التجريبي',
    employee_code: 'E2E-DR-001',
  },
  {
    role: 'receptionist',
    pin: runtimeValue('E2E_RUNTIME_PIN_RECEPTIONIST', /^\d{4,8}$/, 'PIN'),
    email: 'e2e-receptionist@core-system.invalid',
    full_name: 'E2E Receptionist',
    full_name_ar: 'موظف الاستقبال التجريبي',
    employee_code: 'E2E-RC-001',
  },
];

export const E2E_TENANT_ID = '20000000-0000-4000-8000-000000000001';
export const E2E_LICENSE_KEY = runtimeValue(
  'E2E_RUNTIME_LICENSE_KEY',
  /^E2E-[a-f0-9]{48}$/,
  'license key',
);
