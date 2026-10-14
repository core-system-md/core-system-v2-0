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
    await expect(page.getByRole('heading', { name: /الصفحة 1 من 5/ })).toBeVisible();
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
  await page.goto(`/survey/${E2E_SESSION_IDS[1]}`);
  await page.getByRole('button', { name: 'زيارة متابعة' }).click();
  await page.getByPlaceholder('اشرح سبب زيارتك باختصار...').fill('متابعة حالة سابقة');
  await page.getByRole('button', { name: 'فحص عام' }).click();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /التالي — الصفحة 2/ }).click();
  const saveAlert = page.getByRole('alert');
  const page2Heading = page.getByRole('heading', { name: /الصفحة 2 من 5/ });
  const validationMessages = [
    'يرجى اختيار نوع الزيارة',
    'يرجى ذكر سبب الزيارة',
    'يرجى اختيار إجراء واحد على الأقل',
    'يجب الموافقة على الشروط للمتابعة',
  ];

  // Capture unhandled browser failures and wait for a concrete terminal state:
  // next page, server/save alert, or field-level validation error.
  const browserErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text());
  });
  page.on('pageerror', (error) => browserErrors.push(`PAGEERROR: ${error.message}`));

  const readOutcome = async () => {
    const [headingCount, alertCount, ...validationCounts] = await Promise.all([
      page2Heading.count(),
      saveAlert.count(),
      ...validationMessages.map((message) => page.getByText(message, { exact: true }).count()),
    ]);
    return {
      headingCount,
      alertCount,
      validationMessages: validationMessages.filter((_, index) => validationCounts[index] > 0),
    };
  };

  try {
    await expect.poll(async () => {
      const outcome = await readOutcome();
      return outcome.headingCount + outcome.alertCount + outcome.validationMessages.length;
    }, { timeout: 15000 }).toBeGreaterThan(0);
  } catch {
    const outcome = await readOutcome();
    const saving = await page.getByText('جارٍ حفظ البيانات...').count();
    throw new Error(`[E2E] survey page-1 had no terminal UI state: ${JSON.stringify({ ...outcome, saving, browserErrors, bodyText: (await page.locator('body').innerText()).slice(-1000) })}`);
  }

  if (await saveAlert.isVisible()) {
    throw new Error(`[E2E] survey page-1 save error: ${await saveAlert.textContent()}; browserErrors=${JSON.stringify(browserErrors)}`);
  }
  const outcome = await readOutcome();
  if (outcome.validationMessages.length) {
    throw new Error(`[E2E] UI validation blocked a completed test submission: ${JSON.stringify(outcome.validationMessages)}; browserErrors=${JSON.stringify(browserErrors)}`);
  }
  await expect(page2Heading).toBeVisible();
});
