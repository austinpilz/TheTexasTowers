const { chromium } = require('/usr/lib/node_modules/playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const url = 'file://' + path.join(__dirname, '..', 'public', 'index.html');
  const d = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const dp = await d.newPage();
  const errs = [];
  dp.on('requestfailed', r => errs.push(r.url().split('/').pop()));
  await dp.goto(url, { waitUntil: 'networkidle' }); await dp.waitForTimeout(400);
  await dp.screenshot({ path: path.join(__dirname, 'shots', 'PROD-index-desktop.png'), fullPage: true }); await d.close();
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mp = await m.newPage(); await mp.goto(url, { waitUntil: 'networkidle' }); await mp.waitForTimeout(400);
  await mp.screenshot({ path: path.join(__dirname, 'shots', 'PROD-index-mobile.png'), fullPage: true }); await m.close();
  await browser.close();
  console.log('failed requests:', errs.length ? errs.join(', ') : 'none');
})();
