import { test, expect } from '@playwright/test';

test('two tabs match and exchange a P2P message', async ({ browser }) => {
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
  await pageA.getByPlaceholder('Type a message').fill('hello');
  await pageA.keyboard.press('Enter');
  await expect(pageB.getByText('hello', { exact: true })).toBeVisible({ timeout: 10000 });
  if (process.env.STATS_TOKEN) {
    const stats = await pageA.request.get(`http://localhost:5000/stats?token=${process.env.STATS_TOKEN}`);
    const json = await stats.json();
    expect(json.relayPairs).toBe(0);
  }
  await a.close();
  await b.close();
});
