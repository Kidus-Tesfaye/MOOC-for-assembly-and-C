/* Browser check: loads each course file in headless Chromium, reports console errors, runs the self-test
   (every model solution must pass and every wrong answer must fail) and takes screenshots.
   Usage: node tools/check.js [--file assembly.html] [--mobile] [outdir] [hash ...]
   Without --file both courses are checked (index.html and assembly.html). Exit code 1 on any problem. */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const args = process.argv.slice(2), files = [], rest = [];
  let mobile = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file') files.push(args[++i]);
    else if (args[i] === '--mobile') mobile = true;
    else rest.push(args[i]);
  }
  const out = rest[0] || '/tmp/shots';
  const hashes = rest.slice(1);
  const root = path.resolve(__dirname, '..');
  const list = files.length ? files : ['index.html', 'assembly.html'].filter(f => fs.existsSync(path.join(root, f)));
  if (hashes.length) fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  let bad = 0;
  for (const f of list) {
    const file = 'file://' + path.join(root, f);
    const page = await browser.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
    await page.goto(file);
    await page.waitForTimeout(500);
    const st = await page.evaluate(() => MOOC.selfTest());
    console.log(f + ': SELFTEST parts=' + st.parts + ' exercises=' + st.exercises + ' ms=' + st.ms + ' failures=' + st.failures.length);
    st.failures.slice(0, 40).forEach(x => console.log('  FAIL [' + x.id + '] ' + x.issue.slice(0, 300)));
    bad += st.failures.length;
    for (const h of hashes) {
      await page.goto(file + h);
      await page.waitForTimeout(400);
      const name = f.replace(/\.html$/, '') + '_' + (h.replace(/^#\/?/, '').replace(/[^a-z0-9]+/gi, '_') || 'home').slice(0, 60) + (mobile ? '_mobile' : '');
      await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
    }
    if (errors.length) { console.log('ERRORS:\n' + errors.slice(0, 20).join('\n')); bad += errors.length; }
    else console.log('no console errors');
    await page.close();
  }
  await browser.close();
  process.exitCode = bad ? 1 : 0;
})();
