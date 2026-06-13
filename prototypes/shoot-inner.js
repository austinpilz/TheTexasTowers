const { chromium } = require('/usr/lib/node_modules/playwright');
const path = require('path');
const PUB = path.join(__dirname, '..', 'public');
const pages = [
  ['02-TheConceptionAndApproval,1952-1953/index.html', 'inner-02-text'],
  ['00-TheColdWar/index.html', 'inner-00-coldwar'],
  ['07-TheAKL-17/index.html', 'inner-07-gallery'],
  ['21-FromTheMenOfTheTexasTowers/FredBock/index.html', 'inner-21-depth2'],
  ['TexasTower4/ChuckZimmaro/DiveReport-1999-07-14.html', 'inner-divereport'],
];
(async () => {
  const browser = await chromium.launch();
  for (const [rel, name] of pages) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5 });
    const p = await ctx.newPage();
    const fails = [];
    p.on('requestfailed', r => fails.push(r.url().split('/').slice(-2).join('/')));
    await p.goto('file://' + path.join(PUB, rel), { waitUntil: 'networkidle' });
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(__dirname, 'shots', name + '.png'), fullPage: true });
    await ctx.close();
    console.log(name.padEnd(22), fails.length ? 'FAILED: ' + fails.join(', ') : 'ok');
  }
  await browser.close();
})();
