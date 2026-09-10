import { test, expect } from '@playwright/test';
import { E2E_STAFF, E2E_LICENSE_KEY } from './fixtures/staff.mjs';

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
  await reset(page);
  await page.getByLabel('مفتاح الترخيص').fill(E2E_LICENSE_KEY);
  await page.getByRole('button', { name: 'التحقق من الترخيص' }).click();
  await page.getByRole('button', { name: 'تسجيل باستخدام البريد' }).click();
  await page.getByLabel('البريد الإلكتروني').fill(staff.email);
  await page.getByLabel('كلمة المرور').fill(staff.password);
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await expect(page).toHaveURL(/\/(admin|doctor|reception|super-admin)$/);
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
      await loginAs(page, staff);
      for (const route of privilegedDenied[staff.role] ?? []) {
        await page.goto(route);
        await expect(page).toHaveURL(new RegExp(`${defaultRoute[staff.role].replace('/', '\\/')}$`));
      }
    });
  }
});
