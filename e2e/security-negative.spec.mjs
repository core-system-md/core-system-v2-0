import { test, expect } from '@playwright/test';
import { E2E_STAFF, E2E_LICENSE_KEY } from './fixtures/staff.mjs';
import { resetPinRateLimit } from './reset-pin-rate-limit.mjs';

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

async function reset(page) {
  await page.goto('/login');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload();
}

async function loginAs(page, staff) {
  await resetPinRateLimit();
  await reset(page);
  await page.getByLabel('مفتاح الترخيص').fill(E2E_LICENSE_KEY);
  await page.getByRole('button', { name: 'التحقق من الترخيص' }).click();
  await expect(page.getByLabel('رمز PIN (4 أرقام)')).toBeVisible();
  await page.getByLabel('رمز PIN (4 أرقام)').fill(staff.pin);

  const createPinResponse = page.waitForResponse(
    (response) => response.url().includes('/rest/v1/rpc/create_pin_session'),
    { timeout: 5000 },
  );
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

  let response;
  try {
    response = await createPinResponse;
  } catch (error) {
    const alert = page.getByRole('alert');
    const alertText = await alert.innerText().catch(() => '');
    throw new Error(`create_pin_session produced no browser response for ${staff.role} within 5s${alertText ? `; UI: ${alertText}` : ''}; ${error.message}`);
  }

  const body = await response.text();
  if (response.status() >= 400) {
    throw new Error(`create_pin_session HTTP ${response.status()} for ${staff.role}: ${body}`);
  }
  if (body.includes('"success":false')) {
    throw new Error(`create_pin_session rejected ${staff.role}: ${body}`);
  }

  const alert = page.getByRole('alert');
  if (await alert.isVisible().catch(() => false)) {
    throw new Error(`Auth UI error for ${staff.role}: ${await alert.innerText()}; create_pin_session=${body}`);
  }

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