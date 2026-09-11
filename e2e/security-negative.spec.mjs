import { createClient } from '@supabase/supabase-js';
import { test, expect } from '@playwright/test';
import { E2E_STAFF, E2E_LICENSE_KEY, E2E_TENANT_ID } from './fixtures/staff.mjs';

const protectedRoutes = ['/admin', '/doctor', '/reception', '/super-admin'];
const defaultRoute = {
  super_admin: '/super-admin',
  clinic_admin: '/admin',
  doctor: '/doctor',
  receptionist: '/reception',
};
const privilegedDenied = {
  clinic_admin: ['/super-admin', '/super-admin/billing'],
  doctor: ['/admin', '/admin/billing', '/reception', '/reception/invoices', '/super-admin'],
  receptionist: ['/admin', '/admin/billing', '/doctor', '/super-admin'],
};

const adminSupabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function reset(page) {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
}

async function resetPinRateWindow() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('[E2E] Missing Supabase service-role environment for security-test isolation');
  }
  const agedAt = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  const { error } = await adminSupabase
    .from('pin_attempt_log')
    .update({ created_at: agedAt })
    .eq('tenant_id', E2E_TENANT_ID);
  if (error) throw new Error(`[E2E] PIN rate-window reset failed: ${error.message}`);
}

async function loginAs(page, staff) {
  await resetPinRateWindow();
  await reset(page);
  await page.getByLabel('مفتاح الترخيص').fill(E2E_LICENSE_KEY);
  await page.getByRole('button', { name: 'التحقق من الترخيص' }).click();
  await page.getByLabel('رمز PIN (4 أرقام)').fill(staff.pin);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await expect(page).toHaveURL(new RegExp(`${defaultRoute[staff.role].replace('/', '\\/')}$`));
}

test.describe('security negative browser suite', () => {
  test('anonymous users cannot open any protected base route', async ({ page }) => {
    for (const route of protectedRoutes) {
      await reset(page);
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
    }
  });

  for (const staff of E2E_STAFF) {
    test(`${staff.role}: denied privileged routes redirect to role default`, async ({ page }) => {
      if (!(privilegedDenied[staff.role] ?? []).length) return;
      await loginAs(page, staff);
      for (const route of privilegedDenied[staff.role]) {
        await page.goto(route);
        await expect(page).toHaveURL(new RegExp(`${defaultRoute[staff.role].replace('/', '\\/')}$`));
      }
    });
  }
});
