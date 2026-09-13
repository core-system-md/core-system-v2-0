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
  const rpcFailures = [];
  const rpcResults = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (!url.includes('/rest/v1/rpc/validate_license') && !url.includes('/rest/v1/rpc/create_pin_session')) return;
    const body = await response.text();
    if (response.status() >= 400) rpcFailures.push(`${url.split('/rpc/')[1]} HTTP ${response.status()}: ${body}`);
    else if (url.includes('/create_pin_session')) rpcResults.push(body);
  });

  await clearBrowserAuth(page);
  await page.getByLabel('مفتاح الترخيص').fill(E2E_LICENSE_KEY);
  await page.getByRole('button', { name: 'التحقق من الترخيص' }).click();
  await expect(page.getByLabel('رمز PIN (4 أرقام)')).toBeVisible();
  await page.getByLabel('رمز PIN (4 أرقام)').fill(staff.pin);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

  if (rpcFailures.length) throw new Error(`Auth RPC failure for ${staff.role}: ${rpcFailures.join(' | ')}`);
  const alert = page.getByRole('alert');
  if (await alert.isVisible().catch(() => false)) {
    throw new Error(`Auth UI error for ${staff.role}: ${await alert.innerText()}; create_pin_session=${rpcResults.join(' | ')}`);
  }
  if (!rpcResults.length) throw new Error(`create_pin_session produced no browser response for ${staff.role}`);
  if (rpcResults.some((body) => body.includes('"success":false'))) {
    throw new Error(`create_pin_session rejected ${staff.role}: ${rpcResults.join(' | ')}`);
  }
  await expect(page).toHaveURL(new RegExp(`${expectedDefault[staff.role].replace('/', '\\/')}$`));
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
