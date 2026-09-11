import { test, expect } from '@playwright/test';
import { E2E_STAFF, E2E_LICENSE_KEY } from './fixtures/staff.mjs';
import { E2E_SESSION_IDS } from './fixtures/patients.mjs';

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
  await expect(page.getByLabel('رمز PIN (4 أرقام)')).toBeVisible();
  await page.getByLabel('رمز PIN (4 أرقام)').fill(staff.pin);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  try {
    await expect(page).toHaveURL(new RegExp(`${expectedDefault[staff.role].replace('/', '\\/')}$`));
  } catch (error) {
    const alertText = await page.getByRole('alert').allTextContents().catch(() => []);
    const storedAuth = await page.evaluate(() => ({
      authStore: localStorage.getItem('auth-store'),
      pinSession: sessionStorage.getItem('core-system-pin-session'),
    }));
    throw new Error(`${error.message}\n[E2E] ${staff.role} login diagnostics: alerts=${JSON.stringify(alertText)}, authStore=${storedAuth.authStore}, pinSession=${storedAuth.pinSession ? 'present' : 'missing'}`);
  }
}

test.describe('role and screen coverage', () => {
  for (const staff of E2E_STAFF) {
    test(`${staff.role}: default route and every permitted screen`, async ({ page }) => {
      const browserErrors = [];
      page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
      page.on('pageerror', (error) => browserErrors.push(`PAGEERROR: ${error.message}`));

      await loginAs(page, staff);
      for (const route of roleAccess[staff.role]) {
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('body')).toContainText(/./);
      }
      expect(browserErrors, `${staff.role} produced unexpected browser errors`).toEqual([]);
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
