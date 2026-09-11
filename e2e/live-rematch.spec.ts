import { test, expect } from '@playwright/test';

test('leave then rematch delivers to both tabs', async ({ browser }) => {
  test.skip(!process.env.E2E, 'Set E2E=1 with redis+server+web running');
  const a = await browser.newContext();
  const b = await browser.newContext();
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  await pageA.goto('/');
  await pageB.goto('/');
  await pageA.getByText('Start Text Chat').click();
  await pageB.getByText('Start Text Chat').click();
  await pageA.getByRole('button', { name: /Find/ }).click();
  await pageB.getByRole('button', { name: /Find/ }).click();
  await expect(pageA.getByText(/Matched/)).toBeVisible({ timeout: 15000 });
  await expect(pageA.getByPlaceholder('Type a message')).toBeEnabled({ timeout: 15000 });
  await pageA.locator('form button.bg-red-600').click();
  await expect(pageA.getByRole('button', { name: /Find/ })).toBeVisible({ timeout: 10000 });
  await expect(pageB.getByText('Stranger disconnected')).toBeVisible({ timeout: 10000 });
  await pageA.waitForTimeout(2200);
  await pageA.getByRole('button', { name: /Find/ }).click();
  await pageB.getByRole('button', { name: /Find/ }).click();
  await expect(pageA.getByText(/Matched/)).toBeVisible({ timeout: 15000 });
  await expect(pageB.getByText(/Matched/)).toBeVisible({ timeout: 15000 });
  await a.close();
  await b.close();
});

test('searching can be canceled', async ({ browser }) => {
  test.skip(!process.env.E2E, 'Set E2E=1 with redis+server+web running');
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/');
  await page.getByText('Start Text Chat').click();
  await page.getByRole('button', { name: /Find/ }).click();
  await expect(page.getByRole('button', { name: /Cancel/ })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: /Cancel/ }).click();
  await expect(page.getByRole('button', { name: /Find/ })).toBeVisible({ timeout: 10000 });
  await ctx.close();
});
