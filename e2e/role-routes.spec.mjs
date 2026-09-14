import { test, expect } from '@playwright/test';
import { E2E_STAFF, E2E_LICENSE_KEY } from './fixtures/staff.mjs';
import { E2E_SESSION_IDS } from './fixtures/patients.mjs';
import { resetPinRateLimit } from './reset-pin-rate-limit.mjs';

const BASE_ROUTES = ['/admin', '/doctor', '/reception', '/super-admin'];
const roleAccess = {
  super_admin: [
    '/super-admin', '/super-admin/feature-flags', '/super-admin/core-rules', '/super-admin/billing',
    '/super-admin/alerts', '/super-admin/tier-overrides', '/super-admin/health-scores',
    '/admin', '/admin/revenue', '/admin/staff', '/admin/schedule', '/admin/patients',
    '/admin/inventory', '/admin/audit', '/admin/breaches', '/admin/billing',
    '/doctor', `/doctor/session/${E2E_SESSION_IDS[0]}`,
    '/reception', '/reception/inquiries', '/reception/invoices',
  ],
  clinic_admin: [
    '/admin', '/admin/revenue', '/admin/staff', '/admin/schedule', '/admin/patients',
    '/admin/inventory', '/admin/audit', '/admin/breaches', '/admin/billing',
    '/doctor', `/doctor/session/${E2E_SESSION_IDS[0]}`,
    '/reception', '/reception/inquiries', '/reception/invoices',
  ],
  doctor: ['/doctor', `/doctor/session/${E2E_SESSION_IDS[0]}`],
  receptionist: ['/reception', '/reception/inquiries', '/reception/invoices'],
};

const expectedDefault = {
  super_admin: '/super-admin',
  clinic_admin: '/admin',
  doctor: '/doctor',
  receptionist: '/reception',
};

async function clearBrowserAuth(page) {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

async function loginAs(page, staff) {
  await clearBrowserAuth(page);

  await page.getByLabel('مفتاح الترخيص').fill(E2E_LICENSE_KEY);
  await page.getByRole('button', { name: 'التحقق من الترخيص' }).click();

  if (staff.role === 'receptionist') {
    await resetPinRateLimit();
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
  } else {
    await page.getByRole('button', { name: 'تسجيل باستخدام البريد' }).click();
    await page.getByLabel('البريد الإلكتروني').fill(staff.email);
    await page.getByLabel('كلمة المرور').fill(staff.password);
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  }

  const alert = page.getByRole('alert');
  if (await alert.isVisible().catch(() => false)) {
    throw new Error(`Auth UI error for ${staff.role}: ${await alert.innerText()}`);
  }

  await expect(page).toHaveURL(new RegExp(`${expectedDefault[staff.role].replace('/', '\\/')}$`));
}

test.describe('role and screen coverage', () => {
  for (const staff of E2E_STAFF) {
    test(`${staff.role}: default route and every permitted screen`, async ({ page }) => {
      const browserErrors = [];
      page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(`CONSOLE: ${message.text()}`); });
      page.on('pageerror', (error) => browserErrors.push(`PAGEERROR: ${error.message}\n${error.stack ?? 'NO_STACK'}`));

      await loginAs(page, staff);
      for (const route of roleAccess[staff.role]) {
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('body')).toContainText(/./);
      }
      expect(browserErrors, `${staff.role} produced unexpected browser errors\n${browserErrors.join('\n')}`).toEqual([]);
    });
  }

  test('every protected base route rejects anonymous users', async ({ page }) => {
    for (const route of BASE_ROUTES) {
      await clearBrowserAuth(page);
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
    }
  });
});
