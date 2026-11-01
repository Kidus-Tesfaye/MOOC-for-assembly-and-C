/* Finds mathematical symbols or calculations written outside LaTeX in the course text.
   Usage: node tools/latex_audit.js   (needs the built index.html) */
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  const hits = await p.evaluate(() => {
    const out = [];
    const strip = (s) => String(s)
      .replace(/<code>[\s\S]*?<\/code>/g, ' ').replace(/<pre[\s\S]*?<\/pre>/g, ' ')
      .replace(/\$\$[\s\S]*?\$\$/g, ' ').replace(/\$(?:\\\$|[^$])+?\$/g, ' ')
      .replace(/<[^>]+>/g, ' ').replace(/&lt;|&gt;|&amp;/g, ' ');
    const SYM = /[×÷≥≤≠≈−±√∞∑πΩµμ⁰¹²³⁴⁵⁶⁷⁸⁹½²]/;
    const CALC = /\d\s*[+*/×=<>]\s*\d|\d\s+-\s+\d|=\s*\d+\s*[+\-*/]|\d\s*%|\w\^\w|\b\d+\s*x\s*\d+\b/;
    const check = (where, s) => {
      if (s == null || typeof s !== 'string') return;
      const t = strip(s);
      const m1 = SYM.exec(t), m2 = CALC.exec(t);
      if (m1 || m2) { const m = m1 || m2; out.push(where + ' :: ' + t.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\s+/g, ' ')); }
    };
    const walkEx = (w, e) => {
      ['q', 'why', 'sol', 'note', 'title'].forEach(k => check(w + '.' + k, e[k]));
      [].concat(e.hint || []).forEach((h, i) => check(w + '.hint' + i, h));
      (e.opts || []).forEach((o, i) => check(w + '.opt' + i, o));
      (e.fields || []).forEach((f, i) => { check(w + '.field' + i, f.label); check(w + '.fieldsol' + i, f.solText); });
      (e.pairs || []).forEach((pr, i) => { check(w + '.pair' + i, pr[0]); check(w + '.pairR' + i, pr[1]); });
      (e.steps || []).forEach((st, i) => check(w + '.step' + i, st));
      if (e.fb && !Array.isArray(e.fb)) Object.keys(e.fb).forEach(k => check(w + '.fb' + k, e.fb[k]));
      if (Array.isArray(e.fb)) e.fb.forEach((f, i) => check(w + '.fb' + i, f.msg));
      (e.tests || []).forEach((t, i) => check(w + '.test' + i, t.name));
    };
    const walkBlocks = (w, blocks) => blocks.forEach((bl, i) => {
      const ww = w + '#' + i;
      if (bl.k === 'ex') return walkEx(ww + '[' + bl.title + ']', bl);
      if (bl.k === 'out') return;   /* program output is literal text */
      ['html', 'text', 'title', 'cap', 'result'].forEach(k => { if (bl.k === 'code' && k === 'text') return; if ((bl.k === 'example') && k === 'text') return; check(ww + '.' + k, bl[k]); });
      if (bl.k === 'table') { bl.head.forEach(h => check(ww + '.head', h)); bl.rows.forEach(r => r.forEach(c => check(ww + '.cell', String(c)))); }
      if (bl.k === 'example') bl.lines.forEach(l => check(ww + '.line', l[1]));
    });
    MOOC.pages.forEach(pg => walkBlocks('page:' + pg.slug, pg.blocks));
    MOOC.parts.forEach(pt => { check('part' + pt.num + '.intro', pt.intro); pt.sections.forEach(s => { (s.objectives || []).forEach(o => check('p' + pt.num + '.' + s.num + '.obj', o)); check('p' + pt.num + '.' + s.num + '.title', s.title); walkBlocks('p' + pt.num + '.' + s.num, s.blocks); }); });
    return out;
  });
  console.log(hits.length + ' possible issues');
  hits.forEach(h => console.log(h));
  await b.close();
})();
