/* Browser check: loads index.html in headless Chromium, reports console errors, runs the self-test
   and takes screenshots.  Usage: node tools/check.js [outdir] [hash ...] */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const out = process.argv[2] || '/tmp/shots';
  const hashes = process.argv.slice(3);
  const file = 'file://' + path.resolve(__dirname, '..', 'index.html');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto(file);
  await page.waitForTimeout(500);
  const st = await page.evaluate(() => { const r = MOOC.selfTest(); return r; });
  console.log('SELFTEST exercises=' + st.exercises + ' ms=' + st.ms + ' failures=' + st.failures.length);
  st.failures.slice(0, 40).forEach(f => console.log('  FAIL [' + f.id + '] ' + f.issue.slice(0, 300)));
  for (const h of hashes) {
    await page.goto(file + h);
    await page.waitForTimeout(400);
    const name = (h.replace(/[^a-z0-9]+/gi, '_') || 'home').slice(0, 60);
    await page.screenshot({ path: out + '/' + name + '.png', fullPage: true });
  }
  if (errors.length) console.log('ERRORS:\n' + errors.slice(0, 20).join('\n'));
  else console.log('no console errors');
  await browser.close();
})();
