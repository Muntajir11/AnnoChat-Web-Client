import { test, expect } from '@playwright/test';

test.use({
  launchOptions: {
    args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
  },
  permissions: ['camera', 'microphone'],
});

test('two tabs can match for video', async ({ browser }) => {
  test.skip(!process.env.E2E, 'Set E2E=1 with redis+server+web running');
  test.setTimeout(60000);
  const a = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const b = await browser.newContext({ permissions: ['camera', 'microphone'] });
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  await pageA.goto('/');
  await pageA.getByText('Start Video Chat').click();
  await expect(pageA.getByRole('button', { name: /Find match/ })).toBeVisible({ timeout: 15000 });

  await pageB.goto('/');
  await pageB.getByText('Start Video Chat').click();
  await expect(pageB.getByRole('button', { name: /Find match/ })).toBeVisible({ timeout: 15000 });

  await pageA.getByRole('button', { name: /Find match/ }).click();
  await pageB.getByRole('button', { name: /Find match/ }).click();
  await expect(pageA.getByRole('button', { name: 'Report' })).toBeVisible({ timeout: 20000 });
  await expect(pageB.getByRole('button', { name: 'Report' })).toBeVisible({ timeout: 20000 });
  await a.close();
  await b.close();
});
