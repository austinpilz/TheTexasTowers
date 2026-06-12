// Screenshot both prototypes at desktop + mobile widths using global Playwright chromium.
const { chromium } = require('/usr/lib/node_modules/playwright');
const path = require('path');

const SHOTS = [
  { file: 'proposal-a.html', name: 'A-deep-atlantic' },
  { file: 'proposal-b.html', name: 'B-archive-light' },
];

(async () => {
  const browser = await chromium.launch();
  for (const { file, name } of SHOTS) {
    const url = 'file://' + path.join(__dirname, file);
    // Desktop full-page
    const d = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const dp = await d.newPage();
    await dp.goto(url, { waitUntil: 'networkidle' });
    await dp.waitForTimeout(400);
    await dp.screenshot({ path: path.join(__dirname, 'shots', `${name}-desktop.png`), fullPage: true });
    await d.close();
    // Mobile full-page
    const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const mp = await m.newPage();
    await mp.goto(url, { waitUntil: 'networkidle' });
    await mp.waitForTimeout(400);
    await mp.screenshot({ path: path.join(__dirname, 'shots', `${name}-mobile.png`), fullPage: true });
    await m.close();
    console.log('shot', name);
  }
  await browser.close();
})();
