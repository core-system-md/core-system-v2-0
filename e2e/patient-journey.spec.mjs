import { test, expect } from '@playwright/test';
import { E2E_SESSION_IDS } from './fixtures/patients.mjs';

test('survey entry renders for all 20 seeded patient sessions', async ({ page }) => {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`));

  for (const sessionId of E2E_SESSION_IDS) {
    await page.goto(`/survey/${sessionId}`);
    await expect(page.getByRole('heading', { name: /الصفحة 1 من 5 — الهوية والمعلومات الأساسية/ })).toBeVisible();
    await expect(page.getByText(/نوع الزيارة/)).toBeVisible();
    await expect(page.getByText(/سبب الزيارة/)).toBeVisible();
  }

  expect(errors, 'unexpected browser errors').toEqual([]);
});

test('page 1 blocks incomplete submission', async ({ page }) => {
  await page.goto(`/survey/${E2E_SESSION_IDS[0]}`);
  await page.getByRole('button', { name: /التالي — الصفحة 2/ }).click();
  await expect(page.getByText('يرجى اختيار نوع الزيارة')).toBeVisible();
  await expect(page.getByText('يرجى ذكر سبب الزيارة')).toBeVisible();
  await expect(page.getByText('يرجى اختيار إجراء واحد على الأقل')).toBeVisible();
  await expect(page.getByText('يجب الموافقة على الشروط للمتابعة')).toBeVisible();
});

test('page 1 accepts valid data and advances to page 2', async ({ page }) => {
  const rpcResponses = [];
  page.on('response', async (response) => {
    if (!response.url().includes('/rest/v1/rpc/save_patient_intake_page')) return;
    let body = '';
    try { body = (await response.text()).slice(0, 1000); } catch { /* response may already be unavailable */ }
    rpcResponses.push({ status: response.status(), url: response.url(), body });
  });

  await page.goto(`/survey/${E2E_SESSION_IDS[1]}`);
  await page.getByRole('button', { name: 'زيارة متابعة' }).click();
  await page.getByPlaceholder('اشرح سبب زيارتك باختصار...').fill('متابعة حالة سابقة');
  await page.getByRole('button', { name: 'فحص عام' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /التالي — الصفحة 2/ }).click();

  const pageTwo = page.getByRole('heading', { name: /الصفحة 2 من 5 — النوايا السريرية/ });
  try {
    await expect(pageTwo).toBeVisible({ timeout: 10000 });
  } catch (error) {
    const alerts = await page.getByRole('alert').allTextContents().catch(() => []);
    throw new Error(`${error.message}\n[E2E] survey RPC diagnostics: ${JSON.stringify(rpcResponses)}, alerts=${JSON.stringify(alerts)}`);
  }
});