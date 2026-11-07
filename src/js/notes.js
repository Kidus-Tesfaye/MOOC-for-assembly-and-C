/* Notes on the course text. Select text, choose "Add note" in the small menu, write the note: the text is
   highlighted in yellow with a note icon, and a click on it opens the note again. A note is anchored by the
   text it quotes plus a little context before and after, so it still finds its place when the page is
   rendered again. Notes are kept with the progress (browser storage and progress files). */
(function (root) {
'use strict';
const { el, $$, ICON, Store } = MOOC;

/* text that can carry a note, and parts of those areas that never do */
const NOTABLE = '.lesson, .content > h1, .sec-h, .sec-h3, .tbox, .table-wrap, .code-block, .example, .sample-out, .side, .fig, .q, .ex-titles h3, .part-intro';
const SKIP = '.katex-mathml, .note-ico, .ln, button, textarea, input, select, .editor, .btns, .run-out, .fb';
const BUBBLE = '<svg viewBox="0 0 24 22" aria-hidden="true"><path d="M3 2.5h18a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H11l-5 4.5v-4.5H3A1.5 1.5 0 0 1 1.5 14V4A1.5 1.5 0 0 1 3 2.5z" fill="#ffe866" stroke="#5b4a00" stroke-width="1.4" stroke-linejoin="round"/><path d="M6 7h12M6 10.5h9" stroke="#5b4a00" stroke-width="1.4" stroke-linecap="round"/></svg>';
const CONTEXT = 40;

let article = null;   // the article of the current page
let page = null;      // { key, label, href } of the current page, or null where notes are not possible
let menu = null, pop = null, pending = null, pendingBox = null, mouseDown = false, timer = null;

/* ---------- the text of the page, as one string over its notable text nodes ---------- */
function model(art) {
  const nodes = [];
  let text = '';
  const w = document.createTreeWalker(art, NodeFilter.SHOW_TEXT, { acceptNode(n) {
    const p = n.parentElement;
    return p && p.closest(NOTABLE) && !p.closest(SKIP) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
  } });
  for (let n = w.nextNode(); n; n = w.nextNode()) { nodes.push({ n, s: text.length }); text += n.nodeValue; }
  return { nodes, text };
}
function rangeToAnchor(range, M) {
  let a = -1, b = -1;
  for (const { n, s } of M.nodes) {
    if (!range.intersectsNode(n)) continue;
    const st = n === range.startContainer ? range.startOffset : 0;
    const en = n === range.endContainer ? range.endOffset : n.nodeValue.length;
    if (en <= st) continue;
    if (a < 0) a = s + st;
    b = s + en;
  }
  if (a < 0) return null;
  while (a < b && /\s/.test(M.text[a])) a++;
  while (b > a && /\s/.test(M.text[b - 1])) b--;
  if (b <= a) return null;
  return { quote: M.text.slice(a, b), prefix: M.text.slice(Math.max(0, a - CONTEXT), a), suffix: M.text.slice(b, b + CONTEXT) };
}
const commonEnd = (x, y) => { let k = 0; while (k < x.length && k < y.length && x[x.length - 1 - k] === y[y.length - 1 - k]) k++; return k; };
const commonStart = (x, y) => { let k = 0; while (k < x.length && k < y.length && x[k] === y[k]) k++; return k; };
/* the place of a note in the page: the occurrence of its quote whose context matches best */
function locate(note, M) {
  const q = note.quote || '';
  if (!q) return null;
  let best = -1, bestScore = -1;
  for (let i = M.text.indexOf(q); i >= 0; i = M.text.indexOf(q, i + 1)) {
    const score = commonEnd(M.text.slice(Math.max(0, i - CONTEXT), i), note.prefix || '') + commonStart(M.text.slice(i + q.length, i + q.length + CONTEXT), note.suffix || '');
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best < 0 ? null : { start: best, end: best + q.length };
}
/* wrap the characters start...end of the page text in <mark> elements (one per text node) */
function wrap(M, start, end, note) {
  const marks = [];
  for (const { n, s } of M.nodes) {
    const e = s + n.nodeValue.length;
    if (e <= start || s >= end) continue;
    const a = Math.max(start, s) - s, b = Math.min(end, e) - s;
    if (b <= a) continue;
    if (/^\s*$/.test(n.nodeValue.slice(a, b)) && /^(TABLE|THEAD|TBODY|TR|UL|OL)$/.test(n.parentNode.nodeName)) continue;
    let node = n;
    if (b < node.nodeValue.length) node.splitText(b);
    if (a > 0) node = node.splitText(a);
    const m = document.createElement('mark');
    m.className = 'note-mark';
    m.dataset.note = note.id;
    m.title = note.text;
    node.parentNode.insertBefore(m, node);
    m.appendChild(node);
    marks.push(m);
  }
  return marks;
}
function unwrapAll() {
  $$('mark.note-mark', article).forEach(m => {
    $$('.note-ico', m).forEach(i => i.remove());
    const p = m.parentNode;
    if (!p) return;
    while (m.firstChild) p.insertBefore(m.firstChild, m);
    p.removeChild(m);
    p.normalize();
  });
}
function notesHere() {
  return Object.values(Store.notes()).filter(n => page && n.page === page.key).sort((x, y) => ((x.created || '') < (y.created || '') ? -1 : 1));
}
/* highlight every note of the page */
function paint() {
  if (!article) return;
  unwrapAll();
  notesHere().forEach(n => {
    const at = locate(n, model(article));
    if (!at) return;
    const marks = wrap(model(article), at.start, at.end, n);
    if (!marks.length) return;
    const ico = el('span', { class: 'note-ico', role: 'button', tabindex: '0', title: n.text, 'aria-label': 'Open the note on this text', html: BUBBLE });
    ico.dataset.note = n.id;
    marks[0].insertBefore(ico, marks[0].firstChild);
  });
}

/* ---------- the small menu that appears next to a selection ---------- */
function hideMenu() { if (menu) menu.style.display = 'none'; pending = null; }
function showMenu(anchor, box, last) {
  pending = anchor; pendingBox = box;
  if (!menu) {
    menu = el('div', { class: 'sel-menu', role: 'menu' },
      el('button', { type: 'button', role: 'menuitem', onmousedown: (e) => e.preventDefault(), onclick: () => { const a = pending, r = pendingBox; hideMenu(); if (a) openEditor({ anchor: a, box: r }); } },
        el('span', { class: 'ico', html: ICON.note }), 'Add note'));
    document.body.append(menu);
  }
  menu.style.display = 'block';
  const w = menu.offsetWidth, h = menu.offsetHeight;
  const coarse = root.matchMedia && root.matchMedia('(pointer: coarse)').matches;
  let top = box.top + root.scrollY - h - 10;
  if (coarse || box.top < h + 80) top = box.bottom + root.scrollY + 10;
  const left = Math.max(root.scrollX + 8, Math.min(last.right + root.scrollX - w / 2, root.scrollX + document.documentElement.clientWidth - w - 8));
  menu.style.top = top + 'px';
  menu.style.left = left + 'px';
}
function checkSelection() {
  if (!article || !page || pop) return hideMenu();
  const sel = root.getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return hideMenu();
  const r = sel.getRangeAt(0);
  if (!article.contains(r.commonAncestorContainer)) return hideMenu();
  const at = rangeToAnchor(r, model(article));
  if (!at || at.quote.length > 2000) return hideMenu();
  const rects = r.getClientRects();
  showMenu(at, r.getBoundingClientRect(), rects.length ? rects[rects.length - 1] : r.getBoundingClientRect());
}

/* ---------- the note editor ---------- */
const shorten = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
function closeEditor() {
  if (pop) { pop.remove(); pop = null; }
  $$('mark.note-mark.active').forEach(m => m.classList.remove('active'));
}
function openEditor(o) {
  closeEditor();
  const isNew = !o.note;
  const n = o.note ? Object.assign({}, o.note) : { id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), page: page.key, label: page.label, href: page.href, quote: o.anchor.quote, prefix: o.anchor.prefix, suffix: o.anchor.suffix, text: '' };
  const ta = el('textarea', { class: 'note-ta', rows: 4, placeholder: 'Write your note…', 'aria-label': 'Your note' });
  ta.value = n.text || '';
  const bSave = el('button', { class: 'mbtn primary', type: 'button' }, 'Save note');
  const upd = () => { bSave.disabled = !ta.value.trim(); };
  const save = () => {
    const t = ta.value.trim();
    if (!t) return;
    n.text = t;
    Store.saveNote(n);
    closeEditor();
    const sel = root.getSelection(); if (sel) sel.removeAllRanges();
    paint();
  };
  const del = () => {
    if (!root.confirm('Delete this note?')) return;
    Store.deleteNote(n.id);
    closeEditor();
    paint();
  };
  bSave.addEventListener('click', save);
  ta.addEventListener('input', upd);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeEditor(); }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); }
  });
  pop = el('div', { class: 'note-pop', role: 'dialog', 'aria-label': isNew ? 'New note' : 'Note' },
    el('div', { class: 'note-pop-h' }, el('span', { class: 'note-pop-ico', html: BUBBLE }), el('b', { text: isNew ? 'New note' : 'Your note' }), n.updated ? el('small', { text: new Date(n.updated).toLocaleString() }) : null),
    el('blockquote', { class: 'note-quote', text: shorten(n.quote, 180) }),
    ta,
    el('div', { class: 'note-pop-btns' }, isNew ? null : el('button', { class: 'mbtn danger', type: 'button', onclick: del }, 'Delete'), el('span', { class: 'grow' }),
      el('button', { class: 'mbtn', type: 'button', onclick: closeEditor }, 'Cancel'), bSave));
  pop.dataset.orig = n.text || '';
  document.body.append(pop);
  upd();
  const box = o.box;
  const w = pop.offsetWidth;
  const left = Math.max(root.scrollX + 8, Math.min(box.left + root.scrollX, root.scrollX + document.documentElement.clientWidth - w - 8));
  pop.style.top = (box.bottom + root.scrollY + 12) + 'px';
  pop.style.left = left + 'px';
  ta.focus();
  if (!isNew) $$('mark.note-mark').forEach(m => { if (m.dataset.note === n.id) m.classList.add('active'); });
}
function openNote(id) {
  const n = Store.notes()[id];
  if (!n || !article) return;
  const m = $$('mark.note-mark', article).find(x => x.dataset.note === id);
  if (!m) return;
  openEditor({ note: n, box: m.getBoundingClientRect() });
}
const dirty = () => pop && $$('textarea', pop)[0] && $$('textarea', pop)[0].value.trim() !== (pop.dataset.orig || '').trim();

/* ---------- events ---------- */
document.addEventListener('mousedown', (e) => {
  mouseDown = true;
  if (menu && !menu.contains(e.target)) hideMenu();
  if (pop && !pop.contains(e.target) && !(e.target.closest && e.target.closest('.note-ico, mark.note-mark')) && !dirty()) closeEditor();
});
document.addEventListener('mouseup', () => { mouseDown = false; setTimeout(checkSelection, 10); });
document.addEventListener('selectionchange', () => { if (mouseDown) return; clearTimeout(timer); timer = setTimeout(checkSelection, 350); });
document.addEventListener('keyup', (e) => { if (e.shiftKey || e.key === 'Shift') setTimeout(checkSelection, 10); });
document.addEventListener('click', (e) => {
  const t = e.target.closest && e.target.closest('.note-ico, mark.note-mark');
  if (!t || !article || !article.contains(t)) return;
  const sel = root.getSelection();
  if (sel && !sel.isCollapsed) return;   /* the reader is selecting text, not opening the note */
  e.preventDefault();
  openNote(t.dataset.note);
});
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('note-ico')) { e.preventDefault(); openNote(e.target.dataset.note); }
  if (e.key === 'Escape') hideMenu();
});
root.addEventListener('resize', hideMenu);

MOOC.Notes = {
  BUBBLE,
  /* called after every page render: info is { key, label, href } or null where notes are not possible */
  attach(art, info) { hideMenu(); closeEditor(); article = art || null; page = info || null; if (article && page) paint(); },
  /* scroll to a note of the current page and open it */
  show(id) {
    const m = article && $$('mark.note-mark', article).find(x => x.dataset.note === id);
    if (!m) return false;
    m.scrollIntoView({ block: 'center' });
    $$('mark.note-mark', article).forEach(x => { if (x.dataset.note === id) { x.classList.add('flash-note'); setTimeout(() => x.classList.remove('flash-note'), 1800); } });
    return true;
  },
  repaint: () => paint()
};
})(window);
