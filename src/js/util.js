/* Shared helpers: DOM building, syntax highlighting, LaTeX rendering (KaTeX) and progress storage. */
(function (root) {
'use strict';
const MOOC = root.MOOC = { parts: [], pages: [], version: 2 };
/* the course being built (title, storage key, ...): set by build.py; defaults are those of index.html */
const CFG = MOOC.config = Object.assign({ title: 'Assembly and C Programming MOOC', storageKey: 'asm-c-mooc-progress-v1', appId: 'assembly-and-c-mooc', filePrefix: 'asm-c-mooc-progress-', groups: { 1: 'Introduction to Programming', 2: 'Advanced Course in Programming' } }, root.MOOC_CONFIG || {});

/* ---------- DOM helpers ---------- */
function el(tag, props, ...kids) {
  const e = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  kids.flat(Infinity).forEach(c => { if (c == null || c === false) return; e.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return e;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const slug = s => String(s).toLowerCase().replace(/<[^>]+>/g, '').replace(/\$[^$]*\$/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'x';

/* ---------- icons (Font Awesome style paths, drawn inline so the page works offline) ---------- */
const ICON = {
  pencil: '<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="M410.3 231l11.3-11.3-33.9-33.9-62.1-62.1L291.7 89.8l-11.3 11.3-22.6 22.6L58.6 322.9c-10.4 10.4-18 23.3-22.2 37.4L1 480.7c-2.5 8.4-.2 17.5 6.1 23.7s15.3 8.5 23.7 6.1l120.3-35.4c14.1-4.2 27-11.8 37.4-22.2L387.7 253.7 410.3 231zM160 399.4l-9.1 22.7c-4 3.1-8.5 5.4-13.3 6.9L59.4 452l23-78.1c1.4-4.9 3.8-9.4 6.9-13.3l22.7-9.1v32c0 8.8 7.2 16 16 16h32zM362.7 18.7L348.3 33.2 325.7 55.8 314.3 67.1l33.9 33.9 62.1 62.1 33.9 33.9 11.3-11.3 22.6-22.6 14.5-14.5c25-25 25-65.5 0-90.5L453.3 18.7c-25-25-65.5-25-90.5 0zm-47.4 168l-144 144c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l144-144c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"/></svg>',
  quiz: '<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm169.8-90.7c7.9-22.3 29.1-37.3 52.8-37.3h58.3c34.9 0 63.1 28.3 63.1 63.1c0 22.6-12.1 43.5-31.7 54.8L280 264.4c-.2 13-10.9 23.6-24 23.6c-13.3 0-24-10.7-24-24V250.5c0-8.6 4.6-16.5 12.1-20.8l44.3-25.4c4.7-2.7 7.6-7.7 7.6-13.1c0-8.4-6.8-15.1-15.1-15.1H222.6c-3.4 0-6.4 2.1-7.5 5.3l-.4 1.2c-4.4 12.5-18.2 19-30.6 14.6s-19-18.2-14.6-30.6l.4-1.2zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>',
  grad: '<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M219.3 .5c3.1-.6 6.3-.6 9.4 0l200 40C439.9 42.7 448 52.6 448 64s-8.1 21.3-19.3 23.5L352 102.9V160c0 70.7-57.3 128-128 128s-128-57.3-128-128V102.9L48 93.3v65.1l15.7 78.4c.9 4.7-.3 9.6-3.3 13.3s-7.6 5.9-12.4 5.9H16c-4.8 0-9.3-2.1-12.4-5.9s-4.3-8.6-3.3-13.3L16 158.4V86.6C6.5 83.3 0 74.3 0 64C0 52.6 8.1 42.7 19.3 40.5l200-40zM111.9 327.7c10.5-3.4 21.8 .4 29.4 8.5l71 75.5c6.3 6.7 17 6.7 23.3 0l71-75.5c7.6-8.1 18.9-11.9 29.4-8.5C401 348.6 448 409.4 448 481.3c0 17-13.8 30.7-30.7 30.7H30.7C13.8 512 0 498.2 0 481.3c0-71.9 47-132.7 111.9-153.6z"/></svg>',
  info: '<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/></svg>',
  warn: '<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="M256 32c14.2 0 27.3 7.5 34.5 19.8l216 368c7.3 12.4 7.3 27.7 .2 40.1S486.3 480 472 480H40c-14.3 0-27.6-7.7-34.7-20.1s-7-27.8 .2-40.1l216-368C228.7 39.5 241.8 32 256 32zm0 128c-13.3 0-24 10.7-24 24V296c0 13.3 10.7 24 24 24s24-10.7 24-24V184c0-13.3-10.7-24-24-24zm32 224a32 32 0 1 0 -64 0 32 32 0 1 0 64 0z"/></svg>',
  up: '<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM385 215c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-71-71V376c0 13.3-10.7 24-24 24s-24-10.7-24-24V177.9l-71 71c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9L239 103c9.4-9.4 24.6-9.4 33.9 0L385 215z"/></svg>',
  arrow: '<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M438.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L338.8 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l306.7 0L233.4 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z"/></svg>',
  menu: '<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg>',
  save: '<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M64 32C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64H384c35.3 0 64-28.7 64-64V173.3c0-17-6.7-33.3-18.7-45.3L352 50.7C340 38.7 323.7 32 306.7 32H64zm0 96c0-17.7 14.3-32 32-32H288c17.7 0 32 14.3 32 32v64c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32V128zM224 288a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>',
  load: '<svg viewBox="0 0 576 512" aria-hidden="true"><path fill="currentColor" d="M88.7 223.8L0 375.8V96C0 60.7 28.7 32 64 32H181.5c17 0 33.3 6.7 45.3 18.7l26.5 26.5c12 12 28.3 18.7 45.3 18.7H416c35.3 0 64 28.7 64 64v32H144c-22.8 0-43.8 12.1-55.3 31.8zm27.6 16.1C122.1 230 132.6 224 144 224H544c11.5 0 22 6.1 27.7 16.1s5.7 22.2-.1 32.1l-112 192C453.9 474 443.4 480 432 480H32c-11.5 0-22-6.1-27.7-16.1s-5.7-22.2 .1-32.1l112-192z"/></svg>',
  chip: '<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 3v3M12 3v3M15 3v3M9 18v3M12 18v3M15 18v3M3 9h3M3 12h3M3 15h3M18 9h3M18 12h3M18 15h3"/><path d="M10 10h4v4h-4z"/></g></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  check: '<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg>'
};
const icon = (n, cls) => { const s = el('span', { class: 'ico' + (cls ? ' ' + cls : ''), html: ICON[n] || '' }); return s; };

/* ---------- syntax highlighting (token classes tk-*, coloured by the stylesheet) ---------- */
let ASM_INS = null;
const ASM_DIR = /^(ORG|EQU|SET|END|PSECT|CONFIG|GLOBAL|PROCESSOR|BANKSEL|PAGESEL|HIGH|LOW|BANKMASK)$/i;
const ASM_RE = /(;[^\n]*)|(^[ \t]*#[ \t]*(?:include|define)\b)|('[^'\n]*'|"[^"\n]*"|<[^>\n]*\.inc>)|(^[ \t]*[A-Za-z_]\w*:)|\b(0[xX][0-9A-Fa-f]+|[hHbBdD]'[0-9A-Fa-f]+'|[0-9][0-9A-Fa-f]*[hH]|[01]+[bB]|[0-9]+[dD]?)\b|([A-Za-z_][A-Za-z0-9_]*)|(\$)|([,()+\-*\/])/gm;
const C_KW = /^(void|while|if|else|for|do|char|int|short|long|unsigned|signed|float|double|return|const|static|volatile|struct|union|enum|typedef|switch|case|break|continue|default|sizeof|bit|__bit|_Bool|bool|extern|interrupt|__interrupt|uint8_t|int8_t|uint16_t|int16_t|uint32_t|int32_t)$/;
const C_CONST = /^(true|false|NULL|EOF)$/;
const C_RE = /(\/\/[^\n]*|\/\*.*?\*\/)|(^[ \t]*#[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|\b(0[xX][0-9A-Fa-f]+[uUlL]*|0[bB][01]+|[0-9]+\.?[0-9]*(?:[eE][-+]?[0-9]+)?[fFuUlL]*)\b|\b(_{0,2}[A-Za-z_]\w*)\b(\s*\()?|([{}()\[\];,.])|([-+*\/%=!<>&|^~?:]+)/gm;
function isSfrName(w) { const P = root.PIC; const u = w.toUpperCase(); return !!(P && (P.SFR[u] !== undefined || P.BITS[u])); }
function hlAsm(line) {
  if (!ASM_INS) ASM_INS = new RegExp('^(' + Object.keys(root.Asm.INS).concat(['SWAP']).join('|') + ')$', 'i');
  let out = '', last = 0, m;
  ASM_RE.lastIndex = 0;
  while ((m = ASM_RE.exec(line))) {
    out += esc(line.slice(last, m.index));
    const [all, com, pp, str, lab, num, word, dollar, punct] = m;
    if (com) out += '<span class="tk-com">' + esc(com) + '</span>';
    else if (pp) out += '<span class="tk-kw">' + esc(pp) + '</span>';
    else if (str) out += '<span class="tk-str">' + esc(str) + '</span>';
    else if (lab) out += '<span class="tk-fn">' + esc(lab) + '</span>';
    else if (num) out += '<span class="tk-num">' + esc(num) + '</span>';
    else if (dollar) out += '<span class="tk-num">$</span>';
    else if (punct) out += '<span class="tk-pun">' + esc(punct) + '</span>';
    else if (word) {
      if (ASM_INS.test(word)) out += '<span class="tk-kw">' + esc(word) + '</span>';
      else if (ASM_DIR.test(word)) out += '<span class="tk-dir">' + esc(word) + '</span>';
      else if (isSfrName(word)) out += '<span class="tk-sfr">' + esc(word) + '</span>';
      else out += esc(word);
    } else out += esc(all);
    last = m.index + all.length;
    if (all.length === 0) ASM_RE.lastIndex++;
  }
  return out + esc(line.slice(last));
}
function hlC(line, st) {
  let out = '', last = 0, m;
  if (st.inBlock) {
    const e = line.indexOf('*/');
    if (e < 0) return '<span class="tk-com">' + esc(line) + '</span>';
    out += '<span class="tk-com">' + esc(line.slice(0, e + 2)) + '</span>'; line = line.slice(e + 2); st.inBlock = false;
  }
  C_RE.lastIndex = 0;
  while ((m = C_RE.exec(line))) {
    const bs = line.indexOf('/*', last);
    if (bs >= 0 && bs < m.index && !/["']/.test(line.slice(last, bs))) break;
    out += esc(line.slice(last, m.index));
    const [all, com, pp, str, num, word, paren, punct, op] = m;
    if (com) out += '<span class="tk-com">' + esc(com) + '</span>';
    else if (pp) out += '<span class="tk-kw">' + esc(pp) + '</span>';
    else if (str) out += '<span class="tk-str">' + esc(str) + '</span>';
    else if (num) out += '<span class="tk-num">' + esc(num) + '</span>';
    else if (word) {
      if (C_KW.test(word)) out += '<span class="tk-kw">' + esc(word) + '</span>';
      else if (C_CONST.test(word)) out += '<span class="tk-num">' + esc(word) + '</span>';
      else if (paren) out += '<span class="tk-fn">' + esc(word) + '</span>';
      else if (isSfrName(word)) out += '<span class="tk-sfr">' + esc(word) + '</span>';
      else out += esc(word);
      if (paren) out += esc(paren.slice(0, -1)) + '<span class="tk-pun">(</span>';
    } else if (punct) out += '<span class="tk-pun">' + esc(punct) + '</span>';
    else if (op) out += '<span class="tk-op">' + esc(op) + '</span>';
    else out += esc(all);
    last = m.index + all.length;
    if (all.length === 0) C_RE.lastIndex++;
  }
  const rest = line.slice(last);
  const bs = rest.indexOf('/*');
  if (bs >= 0) { out += esc(rest.slice(0, bs)) + '<span class="tk-com">' + esc(rest.slice(bs)) + '</span>'; if (rest.indexOf('*/', bs + 2) < 0) st.inBlock = true; }
  else out += esc(rest);
  return out;
}
function highlight(text, lang) {
  const lines = String(text).replace(/\r/g, '').split('\n');
  const st = { inBlock: false };
  return lines.map(l => lang === 'asm' ? hlAsm(l) : lang === 'c' ? hlC(l, st) : esc(l));
}
function codeBlock(text, lang, opts) {
  opts = opts || {};
  const lines = highlight(String(text).replace(/\n+$/, ''), lang);
  const start = opts.start || 1;
  const html = lines.map((l, i) => (opts.lines ? '<span class="ln">' + (start + i) + '</span>' : '') + l).join('\n');
  const label = opts.label !== undefined ? opts.label : ({ asm: 'Assembly', c: 'C' }[lang] || '');
  return el('div', { class: 'code-wrap', 'data-lang': label || null }, el('pre', { class: 'code lang-' + (lang || 'text') }, el('code', { html })));
}

/* ---------- LaTeX: $...$ inline and $$...$$ display, rendered with KaTeX ---------- */
const mathCache = new Map();
function tex(src, display) {
  const key = (display ? 'D' : 'I') + src;
  if (mathCache.has(key)) return mathCache.get(key);
  let html;
  try { html = root.katex ? root.katex.renderToString(src, { displayMode: display, throwOnError: false, strict: 'ignore', output: 'html' }) : esc(src); }
  catch (e) { html = '<span class="math-err">' + esc(src) + '</span>'; }
  mathCache.set(key, html);
  return html;
}
const SKIP_TAGS = { CODE: 1, PRE: 1, TEXTAREA: 1, SCRIPT: 1, STYLE: 1, INPUT: 1, SELECT: 1, OPTION: 1 };
function renderMath(rootEl) {
  if (!rootEl) return;
  const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (n.nodeValue.indexOf('$') < 0) return NodeFilter.FILTER_REJECT;
      for (let p = n.parentNode; p && p !== rootEl.parentNode; p = p.parentNode) { if (SKIP_TAGS[p.nodeName] || (p.classList && (p.classList.contains('katex') || p.classList.contains('no-math')))) return NodeFilter.FILTER_REJECT; }
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(n => {
    const s = n.nodeValue;
    const re = /\$\$([\s\S]+?)\$\$|\$((?:\\\$|[^$])+?)\$/g;
    let m, last = 0, any = false;
    const frag = document.createDocumentFragment();
    while ((m = re.exec(s))) {
      any = true;
      if (m.index > last) frag.append(document.createTextNode(s.slice(last, m.index)));
      const span = document.createElement(m[1] !== undefined ? 'div' : 'span');
      span.className = m[1] !== undefined ? 'math-display' : 'math-inline';
      span.innerHTML = tex(m[1] !== undefined ? m[1] : m[2], m[1] !== undefined);
      frag.append(span);
      last = m.index + m[0].length;
    }
    if (!any) return;
    if (last < s.length) frag.append(document.createTextNode(s.slice(last)));
    n.parentNode.replaceChild(frag, n);
  });
}

/* ---------- progress storage: automatic save in the browser + save/load to a file ---------- */
const KEY = CFG.storageKey;
const APP_ID = CFG.appId;
let mem = null, listeners = [], storageOk = null, lastLocalSave = null;
function freshState() { return { app: APP_ID, version: 1, created: new Date().toISOString(), ex: {}, pos: null, visited: {}, fileSavedAt: null, changesSinceFile: 0 }; }
function probeStorage() {
  if (storageOk !== null) return storageOk;
  try { const k = '__probe__' + Math.random(); root.localStorage.setItem(k, '1'); root.localStorage.removeItem(k); storageOk = true; } catch (e) { storageOk = false; }
  return storageOk;
}
const Store = {
  load() {
    if (mem) return mem;
    let s = null;
    if (probeStorage()) { try { s = JSON.parse(root.localStorage.getItem(KEY) || 'null'); } catch (e) { s = null; } }
    mem = (s && typeof s === 'object' && s.ex) ? Object.assign(freshState(), s) : freshState();
    return mem;
  },
  persist() {
    if (!probeStorage()) return false;
    try { root.localStorage.setItem(KEY, JSON.stringify(mem)); lastLocalSave = new Date(); return true; } catch (e) { storageOk = false; return false; }
  },
  changed(kind) { this.load(); if (kind !== 'pos') mem.changesSinceFile = (mem.changesSinceFile || 0) + 1; this.persist(); listeners.forEach(f => { try { f(kind); } catch (e) { /* ignore */ } }); },
  onChange(f) { listeners.push(f); },
  get(id) { return this.load().ex[id] || null; },
  set(id, v) { v.at = new Date().toISOString(); this.load().ex[id] = v; this.changed('ex'); },
  setPos(pos) { const s = this.load(); s.pos = pos; s.visited[pos.key] = 1; this.persist(); },
  reset() { mem = freshState(); this.persist(); listeners.forEach(f => f('reset')); },
  storageAvailable: () => probeStorage(),
  lastLocalSave: () => lastLocalSave,
  /* everything needed to restore the progress later */
  exportData() {
    const s = this.load();
    return JSON.stringify({ app: APP_ID, version: 1, savedAt: new Date().toISOString(), courseVersion: MOOC.version, ex: s.ex, pos: s.pos, visited: s.visited, created: s.created }, null, 1);
  },
  parseImport(text) {
    let d;
    try { d = JSON.parse(text); } catch (e) { throw new Error('This file is not a progress file (it is not valid JSON).'); }
    if (d && CFG.sibling && d.app === CFG.sibling.appId) throw new Error('This file holds your progress in the other course, the ' + CFG.sibling.title + '. Load it in that course (' + CFG.sibling.href + ') instead.');
    if (!d || d.app !== APP_ID || typeof d.ex !== 'object') throw new Error('This file is not a progress file of this course.');
    return d;
  },
  importData(d, mode) {
    const s = this.load();
    if (mode === 'merge') {
      Object.keys(d.ex).forEach(id => {
        const a = s.ex[id], b = d.ex[id];
        if (!a) s.ex[id] = b;
        else if (b.done && !a.done) s.ex[id] = b;
        else if (b.done === a.done && (b.at || '') > (a.at || '')) s.ex[id] = b;
      });
      Object.assign(s.visited, d.visited || {});
      if (!s.pos) s.pos = d.pos || null;
    } else {
      mem = Object.assign(freshState(), { ex: d.ex || {}, pos: d.pos || null, visited: d.visited || {}, created: d.created || new Date().toISOString() });
    }
    this.load().fileSavedAt = new Date().toISOString(); this.load().changesSinceFile = 0;
    this.persist();
    listeners.forEach(f => f('import'));
  },
  markFileSaved() { const s = this.load(); s.fileSavedAt = new Date().toISOString(); s.changesSinceFile = 0; this.persist(); listeners.forEach(f => f('file')); },
  sandbox(fn) {
    const keep = mem, keepL = listeners, keepP = this.persist;
    mem = freshState(); listeners = []; this.persist = () => true;
    try { return fn(); } finally { mem = keep; listeners = keepL; this.persist = keepP; }
  }
};

/* save the progress to a file on the user's computer (no server needed) */
let fileHandle = null;
async function saveToFile() {
  const data = Store.exportData();
  const name = CFG.filePrefix + new Date().toISOString().slice(0, 10) + '.json';
  if (root.showSaveFilePicker && root.isSecureContext !== false) {
    try {
      if (!fileHandle) fileHandle = await root.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Course progress', accept: { 'application/json': ['.json'] } }] });
      const w = await fileHandle.createWritable();
      await w.write(data); await w.close();
      Store.markFileSaved();
      return { ok: true, how: 'file', name: fileHandle.name };
    } catch (e) {
      if (e && e.name === 'AbortError') return { ok: false, cancelled: true };
      fileHandle = null;   /* fall back to a normal download */
    }
  }
  const blob = new Blob([data], { type: 'application/json' });
  const a = el('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  Store.markFileSaved();
  return { ok: true, how: 'download', name };
}
function pickFile() {
  return new Promise((resolve) => {
    const inp = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; inp.remove(); if (!f) return resolve(null); const rd = new FileReader(); rd.onload = () => resolve({ name: f.name, text: String(rd.result) }); rd.onerror = () => resolve(null); rd.readAsText(f); });
    document.body.append(inp); inp.click();
  });
}

Object.assign(MOOC, { el, esc, $, $$, slug, icon, ICON, highlight, codeBlock, renderMath, tex, Store, saveToFile, pickFile });
})(typeof window !== 'undefined' ? window : globalThis);
