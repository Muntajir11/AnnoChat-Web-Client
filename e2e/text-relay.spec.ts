import { test, expect } from '@playwright/test';

function stubDataChannelNeverOpens() {
  return () => {
    const Original = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends Original {
      createDataChannel() {
        const ch = new EventTarget() as RTCDataChannel;
        Object.assign(ch, { readyState: 'connecting', send() {}, close() {}, label: 'chat' });
        return ch;
      }
    } as typeof RTCPeerConnection;
  };
}

test('forced relay still delivers', async ({ browser }) => {
  test.skip(!process.env.E2E, 'Set E2E=1 with redis+server+web running');
  test.setTimeout(45000);
  const a = await browser.newContext();
  const b = await browser.newContext();
  await a.addInitScript(stubDataChannelNeverOpens());
  await b.addInitScript(stubDataChannelNeverOpens());
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  await pageA.goto('/');
  await pageB.goto('/');
  await pageA.getByText('Start Text Chat').click();
  await pageB.getByText('Start Text Chat').click();
  await pageA.getByRole('button', { name: /Find/ }).click();
  await pageB.getByRole('button', { name: /Find/ }).click();
  await expect(pageA.getByText(/Matched/)).toBeVisible({ timeout: 15000 });
  await pageA.waitForTimeout(9000);
  await expect(pageA.getByPlaceholder('Type a message')).toBeEnabled({ timeout: 5000 });
  await pageA.getByPlaceholder('Type a message').fill('relay-hi');
  await pageA.keyboard.press('Enter');
  await expect(pageB.getByText('relay-hi')).toBeVisible({ timeout: 15000 });
  if (process.env.STATS_TOKEN) {
    const stats = await pageA.request.get(`http://localhost:5000/stats?token=${process.env.STATS_TOKEN}`);
    const json = await stats.json();
    expect(json.relayPairs).toBeGreaterThan(0);
  }
  await a.close();
  await b.close();
});
