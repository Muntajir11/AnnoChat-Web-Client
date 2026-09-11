import { test, expect } from '@playwright/test';

test('matched pair sees disconnect after the other tab leaves', async ({ browser }) => {
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
  await pageA.getByPlaceholder('Type a message').fill('ping-now');
  await pageA.locator('form button[type="submit"]').click();
  await expect(pageB.getByText('ping-now', { exact: true })).toBeVisible({ timeout: 10000 });
  await pageA.locator('form button.bg-red-600').click();
  await expect(pageB.getByRole('button', { name: /Find/ })).toBeVisible({ timeout: 10000 });
  await expect(pageB.getByText('Matched! Say hello to your stranger.')).toHaveCount(0);
  await a.close();
  await b.close();
});
