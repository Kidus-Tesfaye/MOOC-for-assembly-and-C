/* Application shell: sidebar, pages, router, progress saving UI and the self-test. The course settings
   (title, groups, storage key, texts) come from MOOC.config, which build.py writes for each course. */
(function (root) {
'use strict';
const { el, esc, $, $$, slug, icon, ICON, codeBlock, renderMath, Store, buildExercise, sampleOut, saveToFile, pickFile } = MOOC;
const CFG = MOOC.config;
const COURSE = CFG.title;
const GROUPS = CFG.groups;
const plain = s => String(s).replace(/<[^>]+>/g, '');

/* ---------- indexing ---------- */
function indexCourse() {
  MOOC.flat = []; MOOC.allEx = []; MOOC.exById = {};
  MOOC.parts.forEach(p => {
    p.slug = 'part-' + p.num;
    p.group = p.group || (p.num <= 7 ? 1 : 2);
    p.sections.forEach((s, si) => {
      s.idx = si; s.num = si + 1; s.slug = s.num + '-' + slug(s.title); s.part = p; s.exs = [];
      s.key = p.num + '.' + s.num;
      s.blocks.forEach(b => {
        if (b.k !== 'ex') return;
        let id = 'p' + p.num + '-' + s.num + '-' + slug(b.title), k = 2;
        while (MOOC.exById[id]) id = 'p' + p.num + '-' + s.num + '-' + slug(b.title) + '-' + (k++);
        b.id = id; b.part = p; b.sec = s; b.n = s.exs.length + 1;
        s.exs.push(b); MOOC.allEx.push(b); MOOC.exById[id] = b;
      });
      MOOC.flat.push({ p, s });
    });
  });
}
const isDone = id => { const s = Store.get(id); return !!(s && s.done); };
const isTried = id => { const s = Store.get(id); return !!(s && s.tries); };
function stats(exs) { let d = 0; exs.forEach(e => { if (isDone(e.id)) d++; }); return { done: d, total: exs.length, pct: exs.length ? Math.round(100 * d / exs.length) : 0 }; }
const partExs = p => p.sections.reduce((a, s) => a.concat(s.exs), []);
const secHref = (p, s) => '#/' + p.slug + '/' + s.slug;

/* ---------- small UI pieces ---------- */
function toast(msg, kind) {
  $$('.toast').forEach(x => x.remove());
  const t = el('div', { class: 'toast' + (kind ? ' ' + kind : ''), role: 'status', text: msg });
  document.body.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 4200);
}
function modal(title, bodyNodes, buttons) {
  const bg = el('div', { class: 'modal-bg', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const box = el('div', { class: 'modal' }, el('h3', { text: title }), el('div', { class: 'modal-b' }, bodyNodes), el('div', { class: 'modal-btns' }, buttons.map(b => el('button', { class: 'mbtn ' + (b.cls || ''), type: 'button', text: b.text, onclick: () => { close(); b.onclick && b.onclick(); } }))));
  bg.append(box);
  bg.addEventListener('click', e => { if (e.target === bg) close(); });
  document.addEventListener('keydown', onKey);
  document.body.append(bg);
  const f = $('button.primary', box) || $('button', box); if (f) f.focus();
}
async function doSave() {
  const r = await saveToFile();
  if (r.ok) toast(r.how === 'file' ? 'Progress saved to the file ' + r.name + '.' : 'Progress saved: the file ' + r.name + ' was downloaded. Keep it somewhere safe.');
  drawTop();
}
async function doLoad() {
  const f = await pickFile();
  if (!f) return;
  let d;
  try { d = Store.parseImport(f.text); } catch (e) { modal('Cannot load this file', [el('p', { text: e.message })], [{ text: 'OK', cls: 'primary' }]); return; }
  const n = Object.values(d.ex).filter(x => x.done).length;
  const cur = Object.values(Store.load().ex).filter(x => x.done).length;
  modal('Load progress from ' + f.name + '?', [
    el('p', { text: 'The file was saved on ' + (d.savedAt ? new Date(d.savedAt).toLocaleString() : 'an unknown date') + ' and contains ' + n + ' completed exercise' + (n === 1 ? '' : 's') + '.' }),
    el('p', { text: 'This browser currently has ' + cur + ' completed exercise' + (cur === 1 ? '' : 's') + '. Combine keeps everything that is completed in either one; Replace uses only the file.' })
  ], [{ text: 'Cancel' }, { text: 'Replace', onclick: () => { Store.importData(d, 'replace'); toast('Progress loaded from ' + f.name + '.'); render(); } }, { text: 'Combine', cls: 'primary', onclick: () => { Store.importData(d, 'merge'); toast('Progress from ' + f.name + ' combined with this browser.'); render(); } }]);
}

/* ---------- chrome ---------- */
function crumbs() {
  const c = root.__cur || {};
  const sep = () => el('span', { class: 'cr-sep', 'aria-hidden': 'true', text: '/' });
  const items = [el('a', { href: '#/', text: CFG.short || 'Home' })];
  if (c.p) items.push(sep(), c.s ? el('a', { href: '#/' + c.p.slug, text: 'Part ' + c.p.num }) : el('b', { text: 'Part ' + c.p.num }));
  if (c.s) items.push(sep(), el('b', { text: c.s.num + '. ' + c.s.title }));
  const named = { progress: 'My progress and saving', exercises: 'All exercises' }[c.kind] || (c.kind === 'page' && c.page ? c.page.title : '');
  if (named) items.push(sep(), el('b', { text: named }));
  return el('nav', { class: 'crumbs', 'aria-label': 'You are here' }, items);
}
function drawTop() {
  const top = $('#topbar'); if (!top) return;
  top.innerHTML = '';
  const s = Store.load();
  const unsaved = s.changesSinceFile || 0;
  top.append(
    el('button', { class: 'mbtn menu-btn', type: 'button', onclick: () => document.body.classList.add('menu-open') }, icon('menu'), 'Menu'),
    crumbs(),
    el('div', { class: 'top-actions' },
      el('button', { class: 'mbtn', type: 'button', onclick: doSave, title: 'Save your progress to a file on this computer' }, icon('save'), el('span', { class: 'lbl' }, 'Save', el('span', { class: 'lbl-x', text: ' progress' })), unsaved ? el('span', { class: 'badge-dot', title: unsaved + ' change(s) not yet saved to a file', text: unsaved > 99 ? '99+' : String(unsaved) }) : null),
      el('button', { class: 'mbtn', type: 'button', onclick: doLoad, title: 'Load progress from a file you saved before' }, icon('load'), el('span', { class: 'lbl' }, 'Load', el('span', { class: 'lbl-x', text: ' progress' })))));
  const blob = $('#points-blob');
  if (blob) { const t = stats(MOOC.allEx); blob.innerHTML = ''; blob.append(el('span', { class: 'pb-ico', html: ICON.star }), el('span', { class: 'pb-v', text: t.done }), el('span', { class: 'pb-l', text: t.done === 1 ? 'point' : 'points' })); blob.title = t.done + ' of ' + t.total + ' exercises completed (' + t.pct + '%). Click for your progress.'; }
}
function navItem(href, label, active, extra) {
  return el('li', { class: 'nav-li' }, el('a', { class: 'nav-a' + (active ? ' active' : '') + (extra || ''), href }, el('div', { class: 'nav-label' }, label)));
}
function drawSide(cur) {
  const sb = $('#sidebar'); sb.innerHTML = '';
  const brand = el('a', { class: 'brand', href: '#/' }, el('span', { class: 'brand-mark', html: ICON.chip }),
    el('span', { class: 'brand-txt' }, el('b', { text: COURSE }), el('small', { text: 'PIC16F887 · ' + MOOC.parts.length + ' parts · ' + MOOC.allEx.length + ' exercises' })));
  const ul = el('ul', { class: 'nav' });
  ul.append(navItem('#/', 'About this course', cur.kind === 'home'));
  ul.append(navItem('#/progress', 'My progress and saving', cur.kind === 'progress'));
  ul.append(navItem('#/exercises', 'All exercises', cur.kind === 'exercises'));
  MOOC.pages.filter(pg => pg.nav).forEach(pg => ul.append(navItem('#/' + pg.slug, pg.title, cur.kind === 'page' && cur.page === pg)));
  let lastG = 0;
  MOOC.parts.forEach(p => {
    if (p.group !== lastG) { lastG = p.group; ul.append(el('li', { class: 'nav-group' }, el('div', { class: 'nav-g', text: GROUPS[p.group] }))); }
    const active = cur.p === p;
    const st = stats(partExs(p));
    const done = st.total && st.done === st.total;
    ul.append(el('li', { class: 'nav-li' }, el('a', { class: 'nav-a nav-part' + (active ? ' active' : '') + (done ? ' done' : ''), href: '#/' + p.slug, title: done ? 'All exercises done' : null },
      el('span', { class: 'nav-num', html: done ? ICON.check : String(p.num) }),
      el('span', { class: 'nav-txt' }, el('b', { text: 'Part ' + p.num }), el('small', { html: p.title })),
      st.total ? el('span', { class: 'nav-cnt', text: st.done + '/' + st.total }) : null)));
    if (active) {
      const sub = el('ul', { class: 'nav-sub' });
      p.sections.forEach(s => sub.append(el('li', {}, el('a', { class: 'nav-sa' + (cur.s === s ? ' active' : ''), href: secHref(p, s) }, s.num + '. ' + s.title))));
      ul.append(sub);
    }
  });
  sb.append(brand, ul, el('button', { class: 'mbtn close-menu', type: 'button', onclick: () => document.body.classList.remove('menu-open') }, 'Close menu'));
}

/* ---------- blocks ---------- */
function textBox(kind, title, html, objectives) {
  const ic = { info: 'info', warn: 'warn', key: 'info', lo: 'grad' }[kind] || 'info';
  return el('aside', { class: 'tbox ' + kind }, el('h3', { class: 'tbox-h' }, el('span', { class: 'tbox-ico', html: ICON[ic] }), title), el('div', { class: 'tbox-b', html: objectives ? '<p>After this section</p><ul>' + objectives.map(o => '<li>' + o + '</li>').join('') + '</ul>' : html }));
}
function tableEl(b) {
  return el('div', { class: 'table-wrap' + (b.small ? ' small' : '') }, el('table', { class: 'mtable' },
    el('thead', {}, el('tr', {}, b.head.map((h, i) => el('th', { class: b.mono && b.mono.includes(i) ? 'm' : '', html: h })))),
    el('tbody', {}, b.rows.map(r => el('tr', {}, r.map((c, i) => el('td', { class: b.mono && b.mono.includes(i) ? 'm' : '', html: String(c) })))))), b.cap ? el('div', { class: 'cap', html: b.cap }) : null);
}
function renderBlock(b, hooks) {
  switch (b.k) {
    case 'text': return el('div', { class: 'lesson', html: b.html });
    case 'h2': return el('h2', { class: 'sec-h', id: b.id || ('h-' + slug(b.text)), html: b.text });
    case 'h3': return el('h3', { class: 'sec-h3', html: b.text });
    case 'box': return textBox(b.kind, b.title, b.html);
    case 'code': return el('div', { class: 'code-block' }, b.title ? el('div', { class: 'code-title', text: b.title }) : null, codeBlock(b.text, b.lang, { lines: b.lines }), b.cap ? el('div', { class: 'cap', html: b.cap }) : null);
    case 'out': return el('div', {}, sampleOut(b.text, b), b.cap ? el('div', { class: 'cap', html: b.cap }) : null);
    case 'table': return tableEl(b);
    case 'fig': return el('figure', { class: 'fig' }, el('div', { html: b.html }), b.cap ? el('figcaption', { class: 'cap', html: b.cap }) : null);
    case 'example': return el('div', { class: 'example' },
      el('div', { class: 'example-h' }, el('span', { class: 'ex-tag', text: 'Example' }), el('span', { html: b.title })),
      codeBlock(b.text, b.lang, { lines: b.lineNumbers !== false && b.text.split('\n').length > 3 }),
      b.lines.length ? el('table', { class: 'explain' }, b.lines.map(l => el('tr', {}, el('td', { class: 'm' }, el('code', { text: l[0] })), el('td', { html: l[1] })))) : null,
      b.result ? el('div', { class: 'example-r', html: b.result }) : null);
    case 'side': return el('div', { class: 'side' },
      el('div', { class: 'side-col' }, el('div', { class: 'side-h', text: b.cTitle || 'C' }), codeBlock(b.c, 'c')),
      el('div', { class: 'side-col' }, el('div', { class: 'side-h', text: b.asmTitle || 'Assembly' }), codeBlock(b.asm, 'asm')),
      b.cap ? el('div', { class: 'cap side-cap', html: b.cap }) : null);
    case 'ex': return buildExercise(b, hooks);
  }
  return null;
}

/* ---------- footers ---------- */
function partNavPaper(p, curS) {
  return el('div', { class: 'pits paper' }, el('div', { class: 'pits-t' }, el('span', { class: 'eyebrow', text: 'Part ' + p.num }), el('b', { html: p.title })),
    el('ol', { class: 'pits-l' }, p.sections.map(s => { const st = stats(s.exs); return el('li', { class: curS === s ? 'cur' : '' }, el('a', { href: secHref(p, s) }, el('span', { class: 'pis-n', text: s.num }), el('span', { class: 'pis-x', text: s.title }), st.total ? el('span', { class: 'pis-c' + (st.done === st.total ? ' all' : ''), text: st.done + '/' + st.total }) : null)); })));
}
function siteFooter() {
  return el('footer', { class: 'site-footer' }, el('div', { class: 'sf-card' },
    el('div', { class: 'sf-brand' }, el('span', { class: 'brand-mark', html: ICON.chip }), el('b', { text: COURSE })),
    el('p', { html: CFG.footer }),
    el('div', { class: 'sf-btns' }, el('button', { class: 'mbtn', type: 'button', onclick: doSave }, icon('save'), 'Save progress'), el('button', { class: 'mbtn', type: 'button', onclick: doLoad }, icon('load'), 'Load progress')),
    el('p', { class: 'sf-small', html: 'Everything runs in your browser: ' + CFG.engine + ', and your progress is stored on your own computer. <a href="#/about-the-material">About the material and its tools.</a>' })));
}
function coursePageFooter(p, s) {
  return el('div', { class: 'cpf' }, el('div', { class: 'cpf-in' }, partNavPaper(p, s)));
}

/* ---------- pages ---------- */
function onChange() { drawTop(); drawSide(root.__cur || {}); }
function renderHome() {
  root.__cur = { kind: 'home' };
  const home = MOOC.pages.find(pg => pg.slug === 'home');
  const page = el('div', {});
  const t = stats(MOOC.allEx);
  const tg = nextTarget();
  const stat = (v, l) => el('div', { class: 'hero-stat' }, el('b', { text: v }), el('span', { text: l }));
  page.append(el('section', { class: 'hero' + (CFG.heroCode ? ' with-card' : '') },
    el('div', { class: 'hero-l' },
      el('span', { class: 'hero-eyebrow', text: CFG.eyebrow || 'PIC16F887' }),
      el('h1', { class: 'hero-t', text: COURSE }),
      el('p', { class: 'hero-tag', text: CFG.tagline }),
      CFG.lead ? el('p', { class: 'hero-lead', text: CFG.lead }) : null,
      el('div', { class: 'hero-stats' }, stat(MOOC.parts.length, 'parts'), stat(MOOC.allEx.length, 'exercises'), stat(t.done, t.done === 1 ? 'point earned' : 'points earned')),
      el('div', { class: 'hero-cta' },
        el('a', { class: 'mbtn light', href: secHref(tg.p, tg.s) }, icon('play'), t.done ? 'Continue learning' : 'Start learning'),
        el('a', { class: 'mbtn ghost', href: '#/progress' }, 'My progress and saving')),
      el('p', { class: 'hero-next' }, t.done ? 'Next: ' : 'First: ', el('a', { href: secHref(tg.p, tg.s), text: 'Part ' + tg.p.num + ', ' + tg.s.num + '. ' + tg.s.title }))),
    CFG.heroCode ? el('div', { class: 'hero-r', 'aria-hidden': 'true' }, el('div', { class: 'hero-card' },
      el('div', { class: 'hero-card-h' }, el('i', {}), el('i', {}), el('i', {}), el('span', { text: CFG.heroCode.title })),
      codeBlock(CFG.heroCode.text, CFG.heroCode.lang, { label: '' }))) : null));
  const art = el('article', { class: 'content' });
  art.append(el('h1', { text: 'About this course' }));
  (home ? home.blocks : []).forEach(b => art.append(renderBlock(b, { onChange })));
  art.append(el('h2', { class: 'sec-h', text: 'Course structure' }));
  let lastG = 0;
  const rows = [];
  MOOC.parts.forEach(p => {
    const st = stats(partExs(p));
    if (p.group !== lastG) { lastG = p.group; rows.push(el('tr', { class: 'grp' }, el('td', { colspan: 3 }, el('b', { text: GROUPS[p.group] })))); }
    rows.push(el('tr', {}, el('td', {}, el('a', { href: '#/' + p.slug, text: 'Part ' + p.num })), el('td', { html: p.title }), el('td', { class: 'r', text: st.done + ' / ' + st.total })));
  });
  art.append(el('div', { class: 'table-wrap' }, el('table', { class: 'mtable' }, el('thead', {}, el('tr', {}, el('th', { text: 'Part' }), el('th', { text: 'Topic' }), el('th', { class: 'r', text: 'Exercises done' }))), el('tbody', {}, rows))));
  if (CFG.sibling) art.append(el('aside', { class: 'sibling' },
    el('span', { class: 'brand-mark small', html: ICON.chip }),
    el('div', {}, el('div', { class: 'eyebrow', text: 'The other course in this series' }),
      el('h3', {}, el('a', { href: CFG.sibling.href, text: CFG.sibling.title })),
      el('p', { text: CFG.sibling.blurb }),
      el('p', { class: 'cap', html: 'It is the file <code>' + esc(CFG.sibling.href) + '</code>: keep it in the same folder as this one for the link to work. The two courses save their progress separately.' }))));
  page.append(art);
  return page;
}
function renderPart(p) {
  root.__cur = { kind: 'part', p };
  const art = el('article', { class: 'content' });
  art.append(el('div', { class: 'eyebrow', text: 'Part ' + p.num + ' · ' + GROUPS[p.group] }));
  art.append(el('h1', { html: p.title }));
  if (p.intro) art.append(el('div', { class: 'lesson part-intro', html: p.intro }));
  art.append(el('div', { class: 'paper pis' }, el('div', { class: 'pis-t', text: 'In this part' }), el('ol', { class: 'pis-l' }, p.sections.map(s => { const st = stats(s.exs); return el('li', {}, el('a', { href: secHref(p, s) }, el('span', { class: 'pis-n', text: s.num }), el('span', { class: 'pis-x', text: s.title }), st.total ? el('span', { class: 'pis-c' + (st.done === st.total ? ' all' : ''), text: st.done + ' / ' + st.total }) : null)); }))));
  const exs = partExs(p);
  const det = el('details', { class: 'paper acc' }, el('summary', {}, el('span', { text: 'List of exercises in this part' }), el('span', { class: 'acc-ico', html: ICON.chevron })),
    el('div', { class: 'acc-b' }, p.sections.map(s => s.exs.length ? el('div', { class: 'acc-sec' }, el('div', { class: 'acc-st', text: s.num + '. ' + s.title }), el('ul', {}, s.exs.map(e => el('li', { class: isDone(e.id) ? 'done' : '' }, el('a', { href: secHref(p, s) + '/' + e.id, text: e.title }), el('span', { class: 'acc-k', text: e.type === 'code' ? (e.lang === 'asm' ? 'assembly' : 'C') : 'quiz' }), isDone(e.id) ? el('span', { class: 'acc-ok', html: ICON.check }) : null)))) : null)));
  art.append(det);
  return art;
}
function renderSection(p, s) {
  root.__cur = { kind: 'section', p, s };
  const art = el('article', { class: 'content' });
  art.append(el('a', { class: 'uplink', href: '#/' + p.slug }, el('span', { class: 'ico', html: ICON.up }), 'Part ' + p.num + ': ', el('span', { html: p.title })));
  art.append(el('h1', { text: s.title }));
  if (s.objectives && s.objectives.length) art.append(textBox('lo', 'Learning objectives', null, s.objectives));
  s.blocks.forEach(b => art.append(renderBlock(b, { onChange })));
  const i = MOOC.flat.findIndex(x => x.s === s);
  const next = MOOC.flat[i + 1];
  const eos = (kind, href, label) => el('a', { class: 'eos-card', href }, el('span', { class: 'eos-txt' }, el('span', { class: 'eyebrow', text: kind }), el('b', { html: label })), el('span', { class: 'ico', html: ICON.arrow }));
  if (next && next.p === p) art.append(eos('Next section', secHref(next.p, next.s), next.s.num + '. ' + esc(next.s.title)));
  else if (next) art.append(eos('End of Part ' + p.num + ' · next part', '#/' + next.p.slug, 'Part ' + next.p.num + ': ' + next.p.title));
  else art.append(eos('You reached the end of the course', '#/progress', 'Check your points and save your progress'));
  art.append(el('p', { class: 'eos-points', text: 'Your points are shown in the badge in the bottom-right corner of the page.' }));
  return el('div', {}, art, coursePageFooter(p, s));
}
function renderProgress() {
  root.__cur = { kind: 'progress' };
  const art = el('article', { class: 'content' });
  const t = stats(MOOC.allEx);
  const s = Store.load();
  art.append(el('h1', { text: 'My progress and saving' }));
  art.append(el('div', { class: 'stats-row' },
    el('div', { class: 'paper stat' }, el('b', { text: t.done + ' / ' + t.total }), el('span', { text: 'exercises completed' })),
    el('div', { class: 'paper stat' }, el('b', { text: t.pct + ' %' }), el('span', { text: 'of the course' })),
    el('div', { class: 'paper stat' }, el('b', { text: MOOC.parts.filter(p => { const x = stats(partExs(p)); return x.total && x.done === x.total; }).length + ' / ' + MOOC.parts.length }), el('span', { text: 'parts completed' }))));
  art.append(el('h2', { class: 'sec-h', text: 'Saving your progress' }));
  const ok = Store.storageAvailable();
  art.append(textBox(ok ? 'info' : 'warn', ok ? 'Your progress is saved automatically in this browser' : 'This browser does not allow automatic saving', ok ?
    '<p>Every answer you check is stored immediately in this browser on this computer. You do not need a server or an account.</p><p>The browser copy is lost if you clear the browsing data, use a private window, or open the course on another computer or in another browser. To be safe, also <b>save your progress to a file</b> from time to time. You can load that file later in any browser.</p>' :
    '<p>Your browser blocks the storage of this page (this can happen with some browsers when a file is opened directly from the disk, or in private windows). Your answers are kept only until you close the page.</p><p><b>Use “Save progress” to keep a file</b>, and “Load progress” next time.</p>'));
  const last = s.fileSavedAt ? new Date(s.fileSavedAt).toLocaleString() : 'never';
  art.append(el('div', { class: 'paper save-panel' },
    el('p', {}, 'Last saved to a file: ', el('b', { text: last }), s.changesSinceFile ? el('span', { class: 'warn-t', text: ' · ' + s.changesSinceFile + ' change' + (s.changesSinceFile === 1 ? '' : 's') + ' since then' }) : null),
    el('div', { class: 'btns' },
      el('button', { class: 'mbtn primary', type: 'button', onclick: doSave }, icon('save'), 'Save progress to a file'),
      el('button', { class: 'mbtn outlined', type: 'button', onclick: doLoad }, icon('load'), 'Load progress from a file'),
      el('button', { class: 'mbtn danger', type: 'button', onclick: () => modal('Reset all progress?', [el('p', { text: 'This removes every completed exercise and saved answer from this browser. Files you saved are not changed. This cannot be undone.' })], [{ text: 'Cancel' }, { text: 'Reset progress', cls: 'danger-fill', onclick: () => { Store.reset(); toast('Progress reset.'); render(); } }]) }, 'Reset progress')),
    el('p', { class: 'cap', html: 'In Chrome and Edge, “Save progress” lets you choose the file the first time and then updates the same file each time you press it. In other browsers the file is downloaded to your Downloads folder. The file name looks like <code>' + esc(CFG.filePrefix) + '2026-11-01.json</code>.' })));
  art.append(el('h2', { class: 'sec-h', text: 'Points by part' }));
  art.append(el('div', { class: 'table-wrap' }, el('table', { class: 'mtable' }, el('thead', {}, el('tr', {}, el('th', { text: 'Part' }), el('th', { text: 'Topic' }), el('th', { class: 'r', text: 'Points' }), el('th', { text: 'Progress' }))),
    el('tbody', {}, MOOC.parts.map(p => { const st = stats(partExs(p)); return el('tr', {}, el('td', {}, el('a', { href: '#/' + p.slug, text: 'Part ' + p.num })), el('td', { html: p.title }), el('td', { class: 'r', text: st.done + ' / ' + st.total }), el('td', {}, el('div', { class: 'bar' }, el('i', { style: 'width:' + st.pct + '%' })))); })))));
  return art;
}
function renderAllExercises() {
  root.__cur = { kind: 'exercises' };
  const art = el('article', { class: 'content' });
  art.append(el('h1', { text: 'All exercises' }));
  art.append(el('p', { class: 'lead-p', text: 'Every exercise of the course, part by part. Completed exercises are marked with a tick.' }));
  MOOC.parts.forEach(p => {
    const st = stats(partExs(p));
    art.append(el('h2', { class: 'sec-h' }, el('a', { href: '#/' + p.slug, text: 'Part ' + p.num + ': ' }), el('span', { html: p.title }), el('small', { class: 'h-count', text: '  ' + st.done + ' / ' + st.total })));
    p.sections.forEach(s => {
      if (!s.exs.length) return;
      art.append(el('div', { class: 'allex-sec' }, el('div', { class: 'acc-st', text: s.num + '. ' + s.title }), el('ul', { class: 'allex' }, s.exs.map(e => el('li', { class: isDone(e.id) ? 'done' : (isTried(e.id) ? 'tried' : '') }, el('a', { href: secHref(p, s) + '/' + e.id, text: e.title }), el('span', { class: 'acc-k', text: e.type === 'code' ? (e.lang === 'asm' ? 'assembly' : 'C') : 'quiz' }), isDone(e.id) ? el('span', { class: 'acc-ok', html: ICON.check }) : null)))));
    });
  });
  return art;
}
function renderStaticPage(pg) {
  root.__cur = { kind: 'page', page: pg };
  const art = el('article', { class: 'content' });
  art.append(el('h1', { text: pg.title }));
  pg.blocks.forEach(b => art.append(renderBlock(b, { onChange })));
  return art;
}
function nextTarget() {
  const pos = Store.load().pos;
  if (pos) { const p = MOOC.parts[pos.p - 1]; if (p && p.sections[pos.s]) return { p, s: p.sections[pos.s] }; }
  const firstOpen = MOOC.flat.find(x => x.s.exs.some(e => !isDone(e.id)));
  return firstOpen || MOOC.flat[0];
}

/* ---------- router ---------- */
function render() {
  const h = decodeURIComponent(location.hash || '#/');
  const main = $('#content'); main.innerHTML = '';
  document.body.classList.remove('menu-open');
  let m, node, title = COURSE, scrollTo = null;
  if ((m = /^#\/part-(\d+)(?:\/(\d+)[^/]*)?(?:\/([\w-]+))?/.exec(h)) && MOOC.parts[+m[1] - 1]) {
    const p = MOOC.parts[+m[1] - 1];
    if (m[2]) {
      const s = p.sections[Math.min(Math.max(+m[2] - 1, 0), p.sections.length - 1)];
      node = renderSection(p, s); title = s.title + ' - ' + COURSE;
      Store.setPos({ p: p.num, s: s.idx, key: s.key });
      if (m[3]) scrollTo = 'ex-' + m[3];
    } else { node = renderPart(p); title = 'Part ' + p.num + ' - ' + COURSE; }
  } else if (h === '#/progress') { node = renderProgress(); title = 'My progress and saving - ' + COURSE; }
  else if (h === '#/exercises') { node = renderAllExercises(); title = 'All exercises - ' + COURSE; }
  else if ((m = /^#\/([\w-]+)$/.exec(h)) && MOOC.pages.find(pg => pg.slug === m[1] && pg.slug !== 'home')) { const pg = MOOC.pages.find(x => x.slug === m[1]); node = renderStaticPage(pg); title = pg.title + ' - ' + COURSE; }
  else node = renderHome();
  main.append(node);
  main.append(siteFooter());
  renderMath(main);
  document.title = title;
  drawTop(); drawSide(root.__cur || {});
  if (scrollTo) { const t = document.getElementById(scrollTo); if (t) { t.scrollIntoView({ block: 'start' }); t.classList.add('flash'); setTimeout(() => t.classList.remove('flash'), 1600); return; } }
  window.scrollTo(0, 0);
}

/* ---------- self-test: every model solution must pass and a wrong answer must fail ---------- */
MOOC.selfTest = function (filter) {
  const fails = [], seen = new Set();
  let n = 0;
  const t0 = Date.now();
  Store.sandbox(() => {
    MOOC.allEx.forEach(ex => {
      if (filter && !filter(ex)) return;
      n++;
      const bad = (msg) => fails.push({ id: ex.id, title: ex.title, part: ex.part.num, issue: msg });
      if (seen.has(ex.id)) bad('duplicate id'); seen.add(ex.id);
      if (!ex.title || !ex.q) bad('missing title or question');
      if (ex.type !== 'code' && !ex.why) bad('missing explanation (why)');
      if (!ex.hint || !String(ex.hint).length) bad('missing hint');
      try {
        const card = buildExercise(ex, null), api = card._api;
        if (api.problem) { bad('assembler problem in exercise data: ' + api.problem[0].msg); return; }
        if (ex.type === 'mcq' && (!ex.opts || ex.opts.length < 2 || [].concat(ex.a).some(i => i < 0 || i >= ex.opts.length))) bad('bad mcq options');
        if (ex.type === 'code' && !ex.solution) { bad('no solution'); return; }
        api.reset && api.reset();
        api.wrong(); let r = api.check();
        if (r.ok) bad('a wrong answer was accepted');
        api.solve(); r = api.check();
        if (!r.ok) bad('the model solution was rejected: ' + (r.msg || '') + ' ' + (card.querySelector('.run-out') ? card.querySelector('.run-out').textContent.slice(0, 400) : ''));
        if (typeof api.solution() !== 'string') bad('no solution text');
      } catch (e) { bad('exception: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')); }
    });
  });
  const out = { exercises: n, parts: MOOC.parts.length, ms: Date.now() - t0, failures: fails };
  root.__selfTestResult = out;
  return out;
};

function boot() {
  indexCourse();
  const app = $('#app');
  app.append(el('nav', { id: 'sidebar', 'aria-label': 'Course contents' }), el('div', { class: 'menu-backdrop', onclick: () => document.body.classList.remove('menu-open') }),
    el('div', { id: 'main' }, el('header', { id: 'topbar' }), el('main', { id: 'content', tabindex: '-1' })),
    el('a', { id: 'points-blob', href: '#/progress', 'aria-label': 'My points and progress' }));
  Store.onChange((kind) => { if (kind === 'ex' || kind === 'file') { drawTop(); drawSide(root.__cur || {}); } });
  window.addEventListener('hashchange', render);
  render();
  if (!Store.storageAvailable()) setTimeout(() => toast('This browser does not allow this page to store data. Use “Save progress” to keep your work in a file.', 'warn'), 800);
  if (location.hash === '#selftest') { const r = MOOC.selfTest(); console.log('selftest', JSON.stringify(r)); }
}
MOOC.boot = boot;
MOOC.render = render;
document.addEventListener('DOMContentLoaded', () => { if (MOOC.parts.length) boot(); });
})(window);
