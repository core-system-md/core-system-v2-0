import { test, expect } from '@playwright/test';
import { E2E_STAFF, E2E_LICENSE_KEY, E2E_TENANT_ID } from './fixtures/staff.mjs';
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

const deniedByRole = {
  super_admin: [],
  clinic_admin: ['/super-admin', '/super-admin/feature-flags', '/super-admin/core-rules', '/super-admin/billing', '/super-admin/alerts', '/super-admin/tier-overrides', '/super-admin/health-scores'],
  doctor: ['/admin', '/reception', '/super-admin'],
  receptionist: ['/admin', '/doctor', '/super-admin'],
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
  await expect(page.getByRole('button', { name: 'تسجيل باستخدام البريد' })).toBeVisible();
  await page.getByRole('button', { name: 'تسجيل باستخدام البريد' }).click();
  await page.getByLabel('البريد الإلكتروني').fill(staff.email);
  await page.getByLabel('كلمة المرور').fill(staff.password);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await expect(page).toHaveURL(/\/((admin)|(doctor)|(reception)|(super-admin))/);
}

test.describe('role and screen coverage', () => {
  for (const staff of E2E_STAFF) {
    test(`${staff.role}: default route and every permitted screen`, async ({ page }) => {
      const browserErrors = [];
      page.on('console', (message) => { if (message.type() === 'error') browserErrors.push(message.text()); });
      page.on('pageerror', (error) => browserErrors.push(`PAGEERROR: ${error.message}`));

      await loginAs(page, staff);
      const expectedDefault = staff.role === 'super_admin' ? '/super-admin' : staff.role === 'clinic_admin' ? '/admin' : staff.role === 'doctor' ? '/doctor' : '/reception';
      await expect(page).toHaveURL(new RegExp(`${expectedDefault.replace('/', '\\/')}$`));

      for (const route of roleAccess[staff.role]) {
        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('body')).toContainText(/./);
      }

      expect(browserErrors, `${staff.role} produced unexpected browser errors`).toEqual([]);
    });
  }

  test('route map covers every protected base area', async ({ page }) => {
    for (const route of BASE_ROUTES) {
      await page.goto(route);
      await expect(page).toHaveURL(/\/login$/);
    }
  });
});
