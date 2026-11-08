/* Exercise engine. Every exercise type builds an "api" object
   { el, read(), write(v), check() -> {ok,msg}, solution() -> html, reset(), solve(), wrong() }.
   Programming exercises (C and assembly) run in the simulators and are checked by tests. */
(function (root) {
'use strict';
const { el, esc, $, $$, highlight, codeBlock, renderMath, Store, icon } = MOOC;
const TYPE_LABEL = { mcq: 'Quiz', input: 'Quiz', fill: 'Quiz', code: 'Programming exercise', trace: 'Quiz', match: 'Quiz', order: 'Quiz', bits: 'Quiz' };
const KIND_LABEL = { mcq: 'multiple choice', input: 'short answer', fill: 'fill in the blanks', trace: 'trace the program', match: 'matching', order: 'put in order', bits: 'set the bits' };

/* ---------- value parsing ---------- */
function normText(s, cs) {
  s = String(s).trim().replace(/\s+/g, ' ').replace(/\s*,\s*/g, ',').replace(/\s*([()=;])\s*/g, '$1').replace(/[.;]+$/, '');
  return cs ? s : s.toLowerCase();
}
function parseNum(raw) {
  let s = String(raw).trim().replace(/^\$|\$$/g, '');
  if (s === '') return null;
  if (/^[-+]/.test(s)) { const v = parseNum(s.slice(1).trim()); return v === null ? null : (s[0] === '-' ? -v : v); }
  const n = Asm.parseNumber(s.replace(/[\s_]/g, ''));
  if (n !== null) return n;
  const t = s.replace(/,(?=\d{3}(\D|$))/g, '').replace(/\s/g, '');
  if (/^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return parseFloat(t);
  return null;
}
function parseHex(raw) {
  const s = String(raw).trim().replace(/[\s_,]/g, '');
  let m;
  if ((m = /^0[xX]([0-9a-fA-F]+)$/.exec(s)) || (m = /^[hH]'([0-9a-fA-F]+)'$/.exec(s)) || (m = /^([0-9a-fA-F]+)[hH]$/.exec(s)) || (m = /^([0-9a-fA-F]+)$/.exec(s))) return parseInt(m[1], 16);
  return null;
}
function parseBin(raw) {
  const s = String(raw).trim().replace(/[\s_,]/g, '');
  let m;
  if ((m = /^0[bB]([01]+)$/.exec(s)) || (m = /^[bB]'([01]+)'$/.exec(s)) || (m = /^([01]+)[bB]$/.exec(s)) || (m = /^([01]+)$/.exec(s))) return { v: parseInt(m[1], 2), len: m[1].length };
  return null;
}
function checkValue(raw, spec) {
  raw = String(raw == null ? '' : raw);
  if (raw.trim() === '') return { ok: false, empty: true };
  const kind = spec.kind || 'num';
  if (kind === 'text') {
    const n = normText(raw, spec.cs);
    for (const a of spec.ans) if (a instanceof RegExp ? a.test(raw.trim()) : normText(String(a), spec.cs) === n) return { ok: true };
    return { ok: false };
  }
  if (kind === 'hex') {
    const v = parseHex(raw);
    if (v === null) return { ok: false, bad: 'That is not a hexadecimal number (use the digits 0–9 and the letters A–F).' };
    return { ok: spec.ans.some(a => (typeof a === 'string' ? parseHex(a) : a) === v) };
  }
  if (kind === 'bin') {
    const b = parseBin(raw);
    if (!b) return { ok: false, bad: 'That is not a binary number (use only the digits 0 and 1).' };
    return { ok: spec.ans.some(a => { const ab = typeof a === 'string' ? parseBin(a) : { v: a, len: 0 }; return ab.v === b.v && (!spec.exact || ab.len === b.len); }) };
  }
  let v = parseNum(raw);
  if (v === null) {
    const units = [].concat(spec.unit || [], spec.unitAlt || []).filter(Boolean);
    for (const u of units) { const r = raw.trim(); if (r.toLowerCase().endsWith(String(u).toLowerCase())) { v = parseNum(r.slice(0, r.length - String(u).length)); if (v !== null) break; } }
  }
  if (v === null) return { ok: false, bad: 'I could not read that as a number. Type digits only (for example 25, 0x19 or 0b00011001).' };
  const tol = spec.tol || 0, rel = spec.rel || 0;
  const ok = spec.ans.some(a => { const x = typeof a === 'string' ? parseNum(a) : a; return Math.abs(v - x) <= Math.max(tol, rel * Math.abs(x)) + 1e-9; });
  return { ok, value: v };
}
function matchFb(fb, raw) {
  if (!fb || !Array.isArray(fb)) return null;
  for (const f of fb) {
    const m = f.m;
    if (m instanceof RegExp ? m.test(raw.trim()) : typeof m === 'function' ? m(raw.trim()) : (typeof m === 'number' ? parseNum(raw) === m : normText(raw) === normText(String(m)))) return f.msg;
  }
  return null;
}
function stripComments(src, lang) {
  if (lang === 'asm') return src.split('\n').map(l => l.replace(/;.*$/, '')).join('\n');
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffled(arr, seed) {
  const a = arr.map((v, i) => ({ v, i })); let s = seed || 1;
  const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const toBin = (v, n) => (v >>> 0).toString(2).padStart(n || 8, '0');
const onEnter = (ctx, e) => e.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey && ctx.check) { ev.preventDefault(); ctx.check(); } });
const btn = (text, cls, onclick, title) => el('button', { class: 'mbtn ' + (cls || ''), type: 'button', title, onclick }, text);

/* ======================= quiz types ======================= */
const T = {};
T.mcq = function (ex, ctx) {
  const multi = Array.isArray(ex.a);
  const answers = [].concat(ex.a);
  const name = 'o' + ctx.uid;
  const order = ex.tf || ex.fixed ? ex.opts.map((_, i) => i) : shuffled(ex.opts, hashStr(String(ex.id || '') + '|' + ex.title)).map(x => x.i);
  const box = el('div', { class: 'opts' });
  const by = {};
  order.forEach(i => {
    const inp = el('input', { type: multi ? 'checkbox' : 'radio', name, value: i });
    const row = el('label', { class: 'opt' }, inp, el('span', { class: 'opt-t', html: ex.opts[i] }));
    inp.addEventListener('change', () => { Object.keys(by).forEach(k => { by[k].row.classList.remove('wrong', 'right'); by[k].row.classList.toggle('sel', by[k].inp.checked); }); });
    box.append(row);
    by[i] = { inp, row };
  });
  const idx = ex.opts.map((_, i) => i);
  const sel = () => idx.filter(i => by[i].inp.checked);
  const api = {
    el: el('div', {}, multi ? el('p', { class: 'cap', text: 'Select all correct answers.' }) : null, box),
    read: sel,
    write(v) { idx.forEach(i => { by[i].inp.checked = (v || []).includes(i); by[i].row.classList.toggle('sel', by[i].inp.checked); by[i].row.classList.remove('wrong', 'right'); }); },
    reset() { api.write([]); },
    check() {
      const s = sel();
      idx.forEach(i => by[i].row.classList.remove('wrong', 'right'));
      if (!s.length) return { ok: false, msg: 'Choose an answer first.' };
      const ok = s.length === answers.length && s.every(i => answers.includes(i));
      if (ok) { s.forEach(i => by[i].row.classList.add('right')); return { ok: true }; }
      s.forEach(i => { if (!answers.includes(i)) by[i].row.classList.add('wrong'); });
      const fb = s.map(i => ex.fb && ex.fb[i]).find(Boolean);
      return { ok: false, msg: fb || (multi ? (s.every(i => answers.includes(i)) ? 'You are on the right track, but at least one correct answer is still missing.' : 'At least one of the selected answers is not correct.') : 'That is not the right choice. Think again, or use the hint.') };
    },
    solution() { return 'Correct answer: <b>' + answers.map(i => ex.opts[i]).join(' &nbsp;+&nbsp; ') + '</b>'; },
    solve() { api.write(answers); },
    wrong() { const w = idx.find(i => !answers.includes(i)); api.write([w]); }
  };
  return api;
};
T.input = function (ex, ctx) {
  const fields = ex.fields || [{ label: ex.fieldLabel, ans: ex.ans, kind: ex.kind, unit: ex.unit, unitAlt: ex.unitAlt, tol: ex.tol, rel: ex.rel, exact: ex.exact, cs: ex.cs, placeholder: ex.placeholder, fb: ex.fb, solText: ex.solText, solInput: ex.solInput, width: ex.width }];
  const inputs = fields.map((f) => el('input', { class: 'inline-in', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': String(f.label || ex.title).replace(/<[^>]+>/g, ''), placeholder: f.placeholder || '', style: 'width:' + (f.width || (f.kind === 'text' ? 16 : 9)) + 'em' }));
  const wrap = el('div', { class: 'fields' }, fields.map((f, i) => el('label', {}, f.label ? el('span', { html: f.label }) : null, inputs[i], f.unit ? el('span', { class: 'u', html: f.unitTex || esc(f.unit) }) : null)));
  const clear = () => inputs.forEach(i => i.classList.remove('good', 'bad'));
  inputs.forEach(i => { i.addEventListener('input', clear); onEnter(ctx, i); });
  const api = {
    el: wrap,
    read: () => inputs.map(i => i.value),
    write(v) { clear(); inputs.forEach((i, k) => { i.value = (v && v[k]) || ''; }); },
    reset() { api.write([]); },
    check() {
      clear(); let good = 0, msg = '', empty = 0;
      fields.forEach((f, i) => {
        const raw = inputs[i].value, r = checkValue(raw, f);
        if (r.empty) { empty++; inputs[i].classList.add('bad'); return; }
        if (r.ok) { good++; inputs[i].classList.add('good'); return; }
        inputs[i].classList.add('bad');
        if (!msg) msg = r.bad || matchFb(f.fb, raw) || '';
      });
      if (empty === fields.length) return { ok: false, msg: 'Type your answer first.' };
      if (good === fields.length) return { ok: true };
      if (fields.length > 1) return { ok: false, msg: good + ' of ' + fields.length + ' answers are correct. ' + (msg || 'Check the boxes marked in red.') };
      return { ok: false, msg: msg || 'That is not the answer I expected. Check your working, or use the hint.' };
    },
    solution() { return fields.map(f => (f.label ? f.label + ' ' : '') + '<b>' + (f.solText || esc(String(f.ans.find(x => !(x instanceof RegExp)))) + (f.unit ? ' ' + esc(f.unit) : '')) + '</b>').join('<br>'); },
    solve() { fields.forEach((f, i) => { const a = f.ans.find(x => !(x instanceof RegExp)); inputs[i].value = a !== undefined ? String(a) : (f.solInput || ''); }); },
    wrong() { fields.forEach((f, i) => { inputs[i].value = f.kind === 'text' ? 'zzzz qqqq' : f.kind === 'bin' ? '10101010101' : '9999999'; }); }
  };
  return api;
};
T.fill = function (ex, ctx) {
  const blanks = [];
  const lang = ex.lang || 'asm';
  const L = (i) => { let s = '', n = i + 1; while (n > 0) { s = String.fromCharCode(97 + (n - 1) % 26) + s; n = Math.floor((n - 1) / 26); } return s; };
  const tpl = ex.tpl.replace(/\{\{([^}]*)\}\}/g, (m, body) => { blanks.push(body.split('||').map(s => s.trim())); return 'qx' + L(blanks.length - 1) + 'qx'; });
  const lines = lang === 'text' ? tpl.split('\n').map(esc) : highlight(tpl, lang);
  let html = lines.join(lang === 'text' ? '<br>' : '\n');
  blanks.forEach((alts, i) => { html = html.replace('qx' + L(i) + 'qx', '<input class="inline-in" type="text" data-i="' + i + '" autocomplete="off" autocapitalize="off" spellcheck="false" size="' + Math.max(4, Math.min(28, alts[0].length + 2)) + '" aria-label="Blank ' + (i + 1) + '">'); });
  const box = el('div', { class: 'fillbox' + (lang === 'text' ? ' plain' : '') + ' no-math', html });
  const inputs = [];
  $$('input', box).forEach(i => { inputs[+i.dataset.i] = i; i.addEventListener('input', () => i.classList.remove('good', 'bad')); onEnter(ctx, i); });
  const same = (raw, alts) => {
    const n = normText(raw, !!ex.cs);
    return alts.some(a => {
      if (normText(a, !!ex.cs) === n) return true;
      const an = Asm.parseNumber(a.trim()), rn = Asm.parseNumber(raw.trim().replace(/\s+/g, ''));
      return an !== null && rn !== null && an === rn;
    });
  };
  const api = {
    el: box,
    read: () => inputs.map(i => i.value),
    write(v) { inputs.forEach((i, k) => { i.value = (v && v[k]) || ''; i.classList.remove('good', 'bad'); }); },
    reset() { api.write([]); },
    check() {
      let good = 0, empty = 0;
      inputs.forEach((inp, i) => {
        inp.classList.remove('good', 'bad');
        if (inp.value.trim() === '') { empty++; inp.classList.add('bad'); return; }
        if (same(inp.value, blanks[i])) { good++; inp.classList.add('good'); } else inp.classList.add('bad');
      });
      if (empty === inputs.length) return { ok: false, msg: 'Fill in the blanks first.' };
      if (good === inputs.length) return { ok: true };
      return { ok: false, msg: good + ' of ' + inputs.length + ' blanks are correct. Fix the blanks marked in red.' };
    },
    solution() {
      const filled = ex.tpl.replace(/\{\{([^}]*)\}\}/g, (m, b) => b.split('||')[0].trim());
      return lang === 'text' ? '<p>' + esc(filled).replace(/\n/g, '<br>') + '</p>' : codeBlock(filled, lang).outerHTML;
    },
    solve() { blanks.forEach((alts, i) => { inputs[i].value = alts[0]; }); },
    wrong() { inputs.forEach(i => { i.value = ''; }); }
  };
  return api;
};
T.trace = function (ex, ctx) {
  const watch = ex.watch || ['W'];
  const res = Asm.run(ex.code, { pre: ex.pre, init: ex.init, trace: true, watch, maxTrace: ex.maxRows || 14, maxSteps: 4000, events: ex.events });
  const rows = res.trace;
  const init0 = {};
  const base = Asm.run(ex.code, { pre: ex.pre, init: ex.init, maxSteps: 0, watch });
  watch.forEach(n => { init0[n] = base.ok ? base.get(n) : 0; });
  const inputs = [];
  const tbl = el('table', { class: 'trace' },
    el('tr', {}, el('th', { text: '#' }), el('th', { text: 'Instruction just executed' }), watch.map(w => el('th', { text: w + (ex.hdr && ex.hdr[w] ? ' ' + ex.hdr[w] : '') }))),
    el('tr', {}, el('td', { class: 'init', text: '0' }), el('td', { class: 'ins', text: 'start' }), watch.map(w => el('td', { class: 'init', text: String(init0[w]) }))),
    rows.map((r, i) => {
      const tds = watch.map(w => { const inp = el('input', { type: 'text', autocomplete: 'off', spellcheck: 'false', 'aria-label': w + ' after step ' + (i + 1) }); inp.addEventListener('input', () => inp.classList.remove('good', 'bad')); onEnter(ctx, inp); inputs.push({ i, w, inp, want: r.vals[w] }); return el('td', {}, inp); });
      return el('tr', {}, el('td', { class: 'init', text: String(i + 1) }), el('td', { class: 'ins', text: r.text }), tds);
    }));
  const api = {
    el: el('div', {}, codeBlock(ex.code, 'asm', { lines: true }), el('p', { class: 'cap', text: 'Fill in the value of each register after each executed instruction (decimal; hexadecimal such as 0x1F and binary such as 0b0101 are also accepted).' }), el('div', { class: 'tbl-wrap' }, tbl)),
    read: () => inputs.map(x => x.inp.value),
    write(v) { inputs.forEach((x, k) => { x.inp.value = (v && v[k]) || ''; x.inp.classList.remove('good', 'bad'); }); },
    reset() { api.write([]); },
    check() {
      let good = 0, empty = 0;
      inputs.forEach(x => {
        x.inp.classList.remove('good', 'bad');
        const raw = x.inp.value;
        if (raw.trim() === '') { empty++; x.inp.classList.add('bad'); return; }
        const v = parseNum(raw);
        if (v !== null && v === x.want) { good++; x.inp.classList.add('good'); } else x.inp.classList.add('bad');
      });
      if (empty === inputs.length) return { ok: false, msg: 'Fill in the table first.' };
      if (good === inputs.length) return { ok: true };
      return { ok: false, msg: good + ' of ' + inputs.length + ' cells are correct. Fix the cells marked in red (start from the first red cell: later values depend on earlier ones).' };
    },
    solution() {
      return '<div class="tbl-wrap"><table class="trace"><tr><th>#</th><th>Instruction</th>' + watch.map(w => '<th>' + esc(w) + '</th>').join('') + '</tr>' +
        rows.map((r, i) => '<tr><td class="init">' + (i + 1) + '</td><td class="ins">' + esc(r.text) + '</td>' + watch.map(w => '<td class="init">' + r.vals[w] + '</td>').join('') + '</tr>').join('') + '</table></div>';
    },
    solve() { inputs.forEach(x => { x.inp.value = String(x.want); }); },
    wrong() { inputs.forEach(x => { x.inp.value = ''; }); },
    problem: res.ok ? null : res.errors
  };
  return api;
};
T.match = function (ex, ctx) {
  const rights = ex.pairs.map(p => p[1]).concat(ex.extra || []);
  const order = shuffled(rights, hashStr(ex.title || 'm')).map(x => x.v);
  const sels = ex.pairs.map((p) => {
    const s = el('select', { 'aria-label': 'Match for ' + String(p[0]).replace(/<[^>]+>/g, '') }, el('option', { value: '', text: '— choose —' }), order.map(o => el('option', { value: o, text: o })));
    s.addEventListener('change', () => s.classList.remove('good', 'bad'));
    return s;
  });
  const box = el('div', {}, ex.pairs.map((p, i) => el('div', { class: 'matchrow' }, el('div', { class: 'l', html: p[0] }), sels[i])));
  const api = {
    el: box,
    read: () => sels.map(s => s.value),
    write(v) { sels.forEach((s, i) => { s.value = (v && v[i]) || ''; s.classList.remove('good', 'bad'); }); },
    reset() { api.write([]); },
    check() {
      let good = 0, empty = 0;
      sels.forEach((s, i) => { s.classList.remove('good', 'bad'); if (!s.value) { empty++; s.classList.add('bad'); } else if (s.value === ex.pairs[i][1]) { good++; s.classList.add('good'); } else s.classList.add('bad'); });
      if (empty === sels.length) return { ok: false, msg: 'Choose a match for each item first.' };
      if (good === sels.length) return { ok: true };
      return { ok: false, msg: good + ' of ' + sels.length + ' matches are correct. Fix the ones marked in red.' };
    },
    solution() { return '<ul>' + ex.pairs.map(p => '<li>' + p[0] + ' → <b>' + esc(p[1]) + '</b></li>').join('') + '</ul>'; },
    solve() { sels.forEach((s, i) => { s.value = ex.pairs[i][1]; }); },
    wrong() { sels.forEach((s, i) => { s.value = ex.pairs[(i + 1) % ex.pairs.length][1]; }); }
  };
  return api;
};
T.order = function (ex) {
  const n = ex.steps.length;
  let perm = shuffled(ex.steps, hashStr(ex.title || 'o')).map(x => x.i);
  if (perm.every((v, i) => v === i)) perm = perm.slice(1).concat(perm[0]);
  const initial = perm.slice();
  const list = el('ol', { class: 'orderlist' });
  function draw(mark) {
    list.innerHTML = '';
    perm.forEach((si, pos) => {
      const up = el('button', { type: 'button', 'aria-label': 'Move up', text: '▲', onclick: () => { [perm[pos - 1], perm[pos]] = [perm[pos], perm[pos - 1]]; draw(); } });
      const dn = el('button', { type: 'button', 'aria-label': 'Move down', text: '▼', onclick: () => { [perm[pos + 1], perm[pos]] = [perm[pos], perm[pos + 1]]; draw(); } });
      if (pos === 0) up.disabled = true; if (pos === n - 1) dn.disabled = true;
      list.append(el('li', { class: mark ? (si === pos ? 'good' : 'bad') : '' }, el('span', { class: 'tx', html: ex.steps[si] }), up, dn));
    });
    renderMath(list);
  }
  draw();
  const api = {
    el: el('div', {}, el('p', { class: 'cap', text: 'Use the arrows to put the steps in the correct order (first step at the top).' }), list),
    read: () => perm.slice(),
    write(v) { perm = Array.isArray(v) && v.length === n ? v.slice() : initial.slice(); draw(); },
    reset() { api.write(null); },
    check() {
      const good = perm.filter((si, pos) => si === pos).length;
      draw(true);
      if (good === n) return { ok: true };
      return { ok: false, msg: good + ' of ' + n + ' steps are in the right place (marked green).' };
    },
    solution() { return '<ol>' + ex.steps.map(s => '<li>' + s + '</li>').join('') + '</ol>'; },
    solve() { perm = ex.steps.map((_, i) => i); draw(); },
    wrong() { perm = initial.slice(); draw(); }
  };
  return api;
};
T.bits = function (ex) {
  const init = (ex.init || '00000000').split('').map(Number);
  let val = init.slice();
  const want = ex.want.split('');
  const names = ex.names || ['b7', 'b6', 'b5', 'b4', 'b3', 'b2', 'b1', 'b0'];
  const readout = el('div', { class: 'bitval' });
  const btns = val.map((v, i) => el('button', { type: 'button', 'aria-label': names[i] + ' bit ' + (7 - i), onclick: () => { val[i] ^= 1; draw(); } }));
  const row = el('div', { class: 'bitrow' }, btns.map((b, i) => el('div', { class: 'bitcell' }, el('small', { text: names[i] }), b, el('span', { class: 'idx', text: 'bit ' + (7 - i) }))));
  function draw(mark) {
    btns.forEach((b, i) => { b.textContent = val[i]; b.classList.toggle('one', !!val[i]); b.classList.remove('good', 'bad'); if (mark && want[i] !== 'x') b.classList.add(want[i] === String(val[i]) ? 'good' : 'bad'); });
    const v = parseInt(val.join(''), 2);
    readout.textContent = (ex.reg || 'Register') + ' = 0b' + val.join('') + '  =  0x' + v.toString(16).toUpperCase().padStart(2, '0') + '  =  ' + v;
  }
  draw();
  const api = {
    el: el('div', {}, el('p', { class: 'cap', text: 'Click a bit to switch it between 0 and 1.' + (ex.maskNote ? ' ' + ex.maskNote : '') }), row, readout),
    read: () => val.join(''),
    write(v) { val = (typeof v === 'string' && v.length === 8) ? v.split('').map(Number) : init.slice(); draw(); },
    reset() { api.write(null); },
    check() {
      draw(true);
      const bad = val.filter((v, i) => want[i] !== 'x' && want[i] !== String(v)).length;
      if (!bad) return { ok: true };
      return { ok: false, msg: bad + ' bit' + (bad > 1 ? 's are' : ' is') + ' wrong (marked red).' };
    },
    solution() { const w = ex.want.replace(/x/g, '0'); return (ex.reg || 'Register') + ' = <b>0b' + w + '</b>' + (ex.want.includes('x') ? ' (the bits marked x do not matter)' : '') + ' = 0x' + parseInt(w, 2).toString(16).toUpperCase().padStart(2, '0'); },
    solve() { val = want.map((c, i) => c === 'x' ? init[i] : Number(c)); draw(); },
    wrong() { val = want.map((c) => c === 'x' ? 1 : 1 - Number(c)); draw(); }
  };
  return api;
};

/* ======================= code editor with highlighting ======================= */
function makeEditor(initial, lang, onSubmit) {
  const ta = el('textarea', { spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', wrap: 'off', 'aria-label': (lang === 'asm' ? 'Assembly' : 'C') + ' code editor' });
  ta.value = initial || '';
  const hl = el('pre', { class: 'ed-hl', 'aria-hidden': 'true' }, el('code'));
  const gut = el('div', { class: 'ed-gutter', 'aria-hidden': 'true' });
  const bar = el('div', { class: 'ed-cur', 'aria-hidden': 'true' });
  const area = el('div', { class: 'ed-area' }, bar, hl, ta);
  const wrap = el('div', { class: 'editor lang-' + lang }, gut, area);
  let errLine = 0;
  const upd = () => {
    const text = ta.value;
    const lines = text.split('\n');
    hl.firstChild.innerHTML = highlight(text, lang).join('\n') + '\n';
    const cur = curLine();
    let s = ''; for (let i = 1; i <= lines.length; i++) s += '<div class="' + (i === errLine ? 'err' : '') + (i === cur ? ' cur' : '') + '">' + i + '</div>';
    gut.innerHTML = s;
    bar.style.top = (10 + (cur - 1) * 22) + 'px';
    const h = Math.max(8, lines.length + 1) * 22 + 20;
    area.style.height = h + 'px'; gut.style.height = h + 'px';
  };
  const sync = () => { hl.scrollLeft = ta.scrollLeft; hl.scrollTop = ta.scrollTop; };
  const curLine = () => ta.value.slice(0, ta.selectionStart).split('\n').length;
  let lastCur = 0;
  const caret = () => {
    const c = curLine();
    if (c === lastCur) return;
    lastCur = c;
    Array.from(gut.children).forEach((d, i) => d.classList.toggle('cur', i + 1 === c));
    bar.style.top = (10 + (c - 1) * 22) + 'px';
  };
  ['keyup', 'click', 'focus', 'select'].forEach(ev => ta.addEventListener(ev, caret));
  document.addEventListener('selectionchange', () => { if (document.activeElement === ta) caret(); });
  ta.addEventListener('input', () => { errLine = 0; upd(); sync(); });
  ta.addEventListener('scroll', sync);
  const indentOf = (s) => /^[ \t]*/.exec(s)[0];
  /* Ctrl+/ (Cmd+/ on a Mac): comment out the selected lines, or the current line, or uncomment them when
     they are all comments already. The comment mark goes at the common indentation of the lines. */
  const TOKEN = lang === 'asm' ? ';' : '//';
  const COMMENTED = lang === 'asm' ? /^\s*;/ : /^\s*\/\//;
  const UNCOMMENT = lang === 'asm' ? /^(\s*);[ ]?/ : /^(\s*)\/\/[ ]?/;
  const toggleComment = () => {
    const v = ta.value, s = ta.selectionStart, t = ta.selectionEnd;
    const ls = v.lastIndexOf('\n', s - 1) + 1;
    const last = t > s && v[t - 1] === '\n' ? t - 1 : t;   /* a selection ending at the start of a line leaves that line alone */
    let le = v.indexOf('\n', last); if (le < 0) le = v.length;
    const lines = v.slice(ls, le).split('\n');
    const filled = lines.filter(l => l.trim());
    const uncomment = filled.length > 0 && filled.every(l => COMMENTED.test(l));
    const at = filled.length ? Math.min(...filled.map(l => indentOf(l).length)) : 0;
    const out = lines.map(l => uncomment ? l.replace(UNCOMMENT, '$1') : (l.trim() || !filled.length ? l.slice(0, at) + TOKEN + ' ' + l.slice(at) : l));
    const block = out.join('\n');
    ta.focus();
    ta.setSelectionRange(ls, le);
    let ok = false;
    try { ok = document.execCommand('insertText', false, block); } catch (err) { ok = false; }   /* keeps Ctrl+Z working */
    if (!ok || ta.value !== v.slice(0, ls) + block + v.slice(le)) ta.value = v.slice(0, ls) + block + v.slice(le);
    if (s === t) {   /* only the cursor: keep it at the same place in its line */
      const col = s - ls;
      let nc = col;
      if (uncomment) { const m = UNCOMMENT.exec(lines[0]); const pos = m[1].length, cut = m[0].length - pos; nc = col <= pos ? col : Math.max(pos, col - cut); }
      else if (col >= at) nc = col + TOKEN.length + 1;
      ta.setSelectionRange(ls + nc, ls + nc);
    } else ta.setSelectionRange(ls, ls + block.length);
    errLine = 0; upd(); sync();
  };
  ta.addEventListener('keydown', e => {
    const s = ta.selectionStart, t = ta.selectionEnd, v = ta.value;
    if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === '/' || e.code === 'Slash' || e.code === 'NumpadDivide')) { e.preventDefault(); toggleComment(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      if (s !== t && v.slice(s, t).includes('\n')) {
        const block = v.slice(ls, t);
        const nb = e.shiftKey ? block.replace(/^( {1,4}|\t)/gm, '') : block.replace(/^/gm, '    ');
        ta.value = v.slice(0, ls) + nb + v.slice(t); ta.selectionStart = ls; ta.selectionEnd = ls + nb.length;
      } else if (e.shiftKey) {
        const line = v.slice(ls); const m = /^( {1,4}|\t)/.exec(line);
        if (m) { ta.value = v.slice(0, ls) + v.slice(ls + m[0].length); ta.selectionStart = ta.selectionEnd = Math.max(ls, s - m[0].length); }
      } else { ta.value = v.slice(0, s) + '    ' + v.slice(t); ta.selectionStart = ta.selectionEnd = s + 4; }
      upd(); return;
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onSubmit && onSubmit(); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const before = v.slice(0, s), line = before.slice(before.lastIndexOf('\n') + 1);
      let ind = indentOf(line);
      if (lang === 'c' && /\{\s*$/.test(line)) ind += '    ';
      const after = v.slice(t);
      if (lang === 'c' && /\{\s*$/.test(line) && /^\s*\}/.test(after)) {
        const ins = '\n' + ind + '\n' + indentOf(line);
        ta.value = before + ins + after; ta.selectionStart = ta.selectionEnd = s + 1 + ind.length;
      } else { ta.value = before + '\n' + ind + after; ta.selectionStart = ta.selectionEnd = s + 1 + ind.length; }
      upd(); return;
    }
    if (e.key === '}' && lang === 'c') {
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      if (/^\s+$/.test(v.slice(ls, s)) && s === t) {
        e.preventDefault();
        const cur = v.slice(ls, s), ni = cur.slice(0, Math.max(0, cur.length - 4));
        ta.value = v.slice(0, ls) + ni + '}' + v.slice(t); ta.selectionStart = ta.selectionEnd = ls + ni.length + 1; upd();
      }
    }
  });
  upd();
  return { wrap, ta, upd, setError(line) { errLine = line || 0; upd(); } };
}

/* ======================= running programs ======================= */
function normOut(s) { return String(s).replace(/\r\n?/g, '\n').split('\n').map(l => l.replace(/[ \t]+$/, '')).join('\n').replace(/\n+$/, ''); }
function showStr(s) { return s === '' ? '(nothing)' : s; }
function fmtVal(v) { return typeof v === 'string' ? '"' + v + '"' : (Array.isArray(v) ? '[' + v.join(', ') + ']' : String(v)); }
function matchesWant(got, want) {
  if (Array.isArray(want) && want.length === 2 && typeof want[0] === 'number' && typeof got === 'number') return got >= want[0] && got <= want[1];
  if (want instanceof RegExp) return want.test(String(got));
  if (Array.isArray(want)) return JSON.stringify(got) === JSON.stringify(want);
  if (typeof want === 'number' && typeof got === 'number' && !Number.isInteger(want)) return Math.abs(got - want) < 1e-3 * Math.max(1, Math.abs(want));
  return got === want;
}
function wantText(want) { return Array.isArray(want) && want.length === 2 && typeof want[0] === 'number' ? 'between ' + want[0] + ' and ' + want[1] : fmtVal(want); }
function runC(ex, src, t) {
  return CInterp.run(src, { stdin: t.stdin, maxSteps: t.maxSteps, maxCycles: t.maxCycles || (t.stdin !== undefined || t.out !== undefined ? 5e6 : 2e6), events: t.events, init: t.init, files: ex.files, call: t.call, args: t.args, retString: t.retString, setGlobals: t.setGlobals, lcdPins: ex.lcdPins });
}
function runAsm(ex, src, t) {
  return Asm.run(src, { pre: ex.pre, post: ex.post, init: t.init, maxSteps: t.maxSteps, events: t.events, snaps: (t.at || []).map(a => a.step), lcdPins: ex.lcdPins });
}
/* evaluate one test case, returns {pass, lines:[...], r} */
function evalTest(ex, src, t, n, total) {
  const isAsm = ex.lang === 'asm';
  const r = isAsm ? runAsm(ex, src, t) : runC(ex, src, t);
  const nm = t.name || (total > 1 ? 'Test ' + n : 'Test');
  const out = { pass: true, msgs: [], r, nm };
  const fail = (m, detail) => { out.pass = false; out.msgs.push({ t: m, detail }); };
  if (!r.ok && (isAsm || r.errors.some(e => e.kind === 'compile'))) { out.compile = true; out.pass = false; return out; }
  if (!isAsm && r.errors.length) { fail(nm + ': the program stopped with an error on line ' + r.errors[0].line + ': ' + r.errors[0].msg); return out; }
  if (isAsm) {
    if (r.halted === 'limit' && !t.limitOk) fail(nm + ': the program did not finish (still running after ' + r.m.steps + ' instructions). Is a loop never ending?');
    else if (r.halted === 'error') fail(nm + ': ' + (r.errors[0] ? r.errors[0].msg : 'error while running'));
  } else {
    const consoleTest = t.out !== undefined || t.outHas || t.outRe || t.outNot;
    if (consoleTest && r.halted === 'limit' && !t.limitOk) fail(nm + ': the program did not finish (it was still running after ' + r.rt.steps + ' steps). Is there a loop that never ends?');
  }
  if (out.pass) {
    if (t.out !== undefined) { const got = normOut(r.out), want = normOut(t.out); if (got !== want) fail(nm + ': the output is not what was expected.', { want, got, stdin: t.stdin }); }
    (t.outHas || []).forEach(s => { if (normOut(r.out).indexOf(s) < 0) fail(nm + ': the output should contain "' + s + '".', { got: normOut(r.out), stdin: t.stdin }); });
    if (t.outRe && !t.outRe.test(normOut(r.out))) fail(nm + ': ' + (t.outReMsg || 'the output does not have the expected form.'), { got: normOut(r.out), stdin: t.stdin });
    (t.outNot || []).forEach(s => { if (normOut(r.out).indexOf(s) >= 0) fail(nm + ': the output should not contain "' + s + '".', { got: normOut(r.out) }); });
    if (t.ret !== undefined) { if (!matchesWant(r.ret, t.ret)) fail(nm + ': ' + t.call + '(' + (t.args || []).map(fmtVal).join(', ') + ') returned ' + fmtVal(r.ret) + ' but should return ' + wantText(t.ret) + '.'); }
    if (t.arrays) t.arrays.forEach((want, i) => { if (want && JSON.stringify(r.arrays && r.arrays[i]) !== JSON.stringify(want)) fail(nm + ': after ' + t.call + '(...) the array should contain ' + fmtVal(want) + ' but contains ' + fmtVal(r.arrays && r.arrays[i]) + '.'); });
    if (t.strings) t.strings.forEach((want, i) => { if (want !== null && want !== undefined && (r.strings && r.strings[i]) !== want) fail(nm + ': after ' + t.call + '(...) the string should be "' + want + '" but it is "' + (r.strings && r.strings[i]) + '".'); });
    Object.keys(t.expect || {}).forEach(k => { const want = t.expect[k], got = r.get(k); if (!matchesWant(got, want)) fail(nm + ': ' + k + ' is ' + fmtVal(got) + ' but should be ' + wantText(want) + '.'); });
    Object.keys(t.globals || {}).forEach(k => { const want = t.globals[k], got = r.global(k); if (got === undefined) fail(nm + ": the global variable '" + k + "' is missing."); else if (!matchesWant(got, want)) fail(nm + ': the variable ' + k + ' is ' + fmtVal(got) + ' but should be ' + wantText(want) + '.'); });
    (t.at || []).forEach(a => {
      const g = r.snaps[a.step];
      Object.keys(a.expect || {}).forEach(k => { const want = a.expect[k], got = g(k); if (!matchesWant(got, want)) fail(nm + (a.label ? ' (' + a.label + ')' : ' (after ' + a.step + ' instructions)') + ': ' + k + ' is ' + fmtVal(got) + ' but should be ' + wantText(want) + '.'); });
    });
    if (t.check) { const m = t.check(r); if (m) fail(nm + ': ' + m); }
  }
  if (out.pass) out.msgs.push({ t: nm + (t.desc ? ': ' + t.desc : '') + ' passed.', ok: true });
  return out;
}

/* board view: LEDs of the output pins, the LCD and a timing diagram of the pins that changed */
function boardView(m, opts) {
  opts = opts || {};
  const P = root.PIC;
  const parts = [];
  const ports = [];
  'ABCDE'.split('').forEach(p => {
    const a = P.PORT_ADDR[p], tris = m.ram[P.TRIS_OF[a]], n = p === 'E' ? 3 : 8;
    const outMask = (~tris) & ((1 << n) - 1);
    if (!outMask && !(opts.showInputs && opts.showInputs.includes(p))) return;
    const latch = m.ram[a], pins = P.readPort(m, a);
    const leds = [];
    for (let b = n - 1; b >= 0; b--) {
      const isOut = (outMask >> b) & 1;
      const on = isOut ? (latch >> b) & 1 : (pins >> b) & 1;
      leds.push(el('div', { class: 'led-cell' + (isOut ? '' : ' in') }, el('span', { class: 'led' + (on ? ' on' : '') + (isOut ? '' : ' input'), title: 'R' + p + b + (isOut ? ' (output)' : ' (input)') + ' = ' + on }), el('small', { text: 'R' + p + b })));
    }
    ports.push(el('div', { class: 'port-row' }, el('span', { class: 'port-name', text: 'PORT' + p }), el('div', { class: 'leds' }, leds)));
  });
  if (ports.length) parts.push(el('div', { class: 'board-ports' }, ports));
  if (m.lcd && m.lcd.used) {
    const L1 = P.lcdLine(m.lcd, 1), L2 = P.lcdLine(m.lcd, 2);
    parts.push(el('div', { class: 'lcd' + (m.lcd.on ? '' : ' off') }, el('div', { class: 'lcd-line', text: m.lcd.on ? L1 : ' '.repeat(16) }), el('div', { class: 'lcd-line', text: m.lcd.on ? L2 : ' '.repeat(16) })));
  }
  /* timing diagram */
  const sigs = [];
  'ABCDE'.split('').forEach(p => { const a = P.PORT_ADDR[p]; for (let b = 0; b < 8; b++) { const w = P.waveform(m, a, b); if (w.rises.length + w.falls.length >= 2) sigs.push({ name: 'R' + p + b, a, b, w }); } });
  if (sigs.length && m.cycles > 0) {
    const show = sigs.slice(0, 6), W = 640, rowH = 26, H = show.length * rowH + 22, T = m.cycles;
    let svg = '<svg viewBox="0 0 ' + (W + 60) + ' ' + H + '" class="scope" role="img" aria-label="Timing diagram of the output pins">';
    show.forEach((s, i) => {
      const y0 = 8 + i * rowH, hi = y0 + 2, lo = y0 + rowH - 8;
      const ev = []; let prev = 0;
      m.log.forEach(e => { if (e[1] === s.a) { const v = (e[2] >> s.b) & 1; if (v !== prev) { ev.push([e[0], v]); prev = v; } } });
      let d = 'M60 ' + lo, cur = 0;
      ev.forEach(([c, v]) => { const x = 60 + W * c / T; d += ' L' + x.toFixed(1) + ' ' + (cur ? hi : lo) + ' L' + x.toFixed(1) + ' ' + (v ? hi : lo); cur = v; });
      d += ' L' + (60 + W) + ' ' + (cur ? hi : lo);
      svg += '<text x="4" y="' + (lo - 2) + '" class="scope-l">' + s.name + '</text><path d="' + d + '" class="scope-w"/>';
    });
    const ms = T * 4 / (P.oscFreq(m) || 4e6) * 1000;
    svg += '<text x="60" y="' + (H - 4) + '" class="scope-t">0</text><text x="' + (W + 58) + '" y="' + (H - 4) + '" text-anchor="end" class="scope-t">' + (ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : ms >= 1 ? ms.toFixed(1) + ' ms' : (ms * 1000).toFixed(0) + ' µs') + '</text></svg>';
    const per = show.map(s => { const w = s.w; if (w.rises.length < 2) return null; const pc = (w.rises[w.rises.length - 1] - w.rises[0]) / (w.rises.length - 1); const us = pc * 4e6 / (P.oscFreq(m) || 4e6); return s.name + ': period ≈ ' + (us >= 1000 ? (us / 1000).toFixed(us >= 100000 ? 0 : 2) + ' ms' : us.toFixed(0) + ' µs'); }).filter(Boolean);
    parts.push(el('div', { class: 'scope-box' }, el('div', { class: 'scope-h', text: 'Timing diagram of the output pins' + (sigs.length > 6 ? ' (first 6 signals)' : '') }), el('div', { html: svg }), per.length ? el('div', { class: 'cap', text: per.join(' · ') }) : null));
  }
  return parts.length ? el('div', { class: 'board' }, parts) : null;
}
function terminalView(segments, label) {
  const box = el('div', { class: 'term' }, el('div', { class: 'term-h', text: label || 'Output' }));
  const pre = el('pre', { class: 'term-b' });
  if (!segments.length || segments.every(s => !s.text)) pre.append(el('span', { class: 'term-empty', text: '(no output)' }));
  segments.forEach(s => pre.append(s.input ? el('span', { class: 'term-in', text: s.text }) : document.createTextNode(s.text)));
  box.append(pre);
  return box;
}
function asmRegisters(r) {
  const m = r.m, rows = [];
  const flag = (b) => (m.ram[3] >> b) & 1;
  rows.push(['W', m.W + ' (0x' + m.W.toString(16).toUpperCase().padStart(2, '0') + ')']);
  rows.push(['Z / DC / C', flag(2) + ' / ' + flag(1) + ' / ' + flag(0)]);
  Object.keys(r.asm.equs).forEach(k => { const a = root.PIC.canon(r.asm.equs[k]); if (root.PIC.isGPR(a)) rows.push([k, m.ram[a] + ' (0x' + m.ram[a].toString(16).toUpperCase().padStart(2, '0') + ')']); });
  [['OPTION_REG', 0x81, 0xFF], ['OSCCON', 0x8F, 0x68], ['ANSEL', 0x188, 0xFF], ['ANSELH', 0x189, 0x3F], ['INTCON', 0x0B, 0], ['TMR0', 0x01, 0], ['T1CON', 0x10, 0], ['ADCON0', 0x1F, 0], ['TXSTA', 0x98, 2]].forEach(([n, a, d]) => { if (m.ram[a] !== d) rows.push([n, toBin(m.ram[a]) + ' (0x' + m.ram[a].toString(16).toUpperCase().padStart(2, '0') + ')']); });
  root.PIC.describe(m).forEach(x => rows.push(x));
  return el('table', { class: 'regs' }, el('tr', {}, el('th', { text: 'Register' }), el('th', { text: 'Value' })), rows.map(x => el('tr', {}, el('td', { text: x[0] }), el('td', { text: x[1] }))));
}
function cGlobals(r) {
  const names = r.globalNames().filter(n => !/^_/.test(n)).slice(0, 12);
  if (!names.length) return null;
  return el('table', { class: 'regs' }, el('tr', {}, el('th', { text: 'Global variable' }), el('th', { text: 'Value' })), names.map(n => { const v = r.global(n); return el('tr', {}, el('td', { text: r.globalType(n) + ' ' + n }), el('td', { text: Array.isArray(v) ? '{' + v.join(', ') + '}' : typeof v === 'string' ? '"' + v.replace(/\0[\s\S]*$/, '') + '"' : (typeof v === 'number' && !Number.isInteger(v) ? v.toPrecision(7).replace(/\.?0+$/, '') : String(v)) })); }));
}
const HALT = { 'goto$': 'The program stopped at GOTO $ (it waits there forever).', end: 'The program reached the end of the code. (On a real PIC the processor would continue into empty program memory, so always finish the main code with a loop such as GOTO $.)', limit: 'The simulation stopped after the step limit; the program was still running.', error: 'The program stopped because of an error.', sleep: 'The program executed SLEEP.', cycles: 'The simulation stopped after the time limit; the program was still running.', tracelimit: '' };

T.code = function (ex, ctx) {
  const isAsm = ex.lang === 'asm';
  const out = el('div', { class: 'code-ex' });
  const ed = makeEditor(ex.start || '', isAsm ? 'asm' : 'c', () => ctx.check());
  const res = el('div', { class: 'run-out', 'aria-live': 'polite' });
  const tests = () => (ex.tests && ex.tests.length ? ex.tests : [{}]);
  const hasStdin = !isAsm && tests().some(t => t.stdin !== undefined);
  const stdinBox = hasStdin ? el('textarea', { class: 'stdin', rows: 3, spellcheck: 'false', 'aria-label': 'Input for the program' }) : null;
  if (stdinBox) stdinBox.value = tests()[0].stdin || '';
  if (ex.pre) out.append(el('div', { class: 'cap', text: 'Already written for you (read-only), placed before your code:' }), codeBlock(ex.pre, ex.lang));
  const mod = /Mac|iPhone|iPad/.test(root.navigator.platform || '') ? '⌘' : 'Ctrl';
  out.append(ed.wrap, el('div', { class: 'ed-keys', html: '<kbd>' + mod + '</kbd> + <kbd>/</kbd> comment out lines &nbsp;·&nbsp; <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> indent lines &nbsp;·&nbsp; <kbd>' + mod + '</kbd> + <kbd>Enter</kbd> run the tests' }));
  if (ex.post) out.append(el('div', { class: 'cap', text: 'Already written for you, placed after your code:' }), codeBlock(ex.post, ex.lang));
  if (stdinBox) out.append(el('details', { class: 'stdin-d' }, el('summary', { text: 'Input typed by the user when you press Run' }), stdinBox));
  const showErrors = (errs, kind) => {
    res.innerHTML = '';
    const e0 = errs[0];
    ed.setError(e0 && e0.line > 0 ? e0.line : 0);
    res.append(el('div', { class: 'res-box bad' }, el('div', { class: 'res-h', text: kind || (isAsm ? 'Assembler error' : 'Compiler error') }), el('ul', { class: 'tests' }, errs.slice(0, 5).map(e => el('li', { class: 'f', text: (e.line > 0 ? 'Line ' + e.line + ': ' : '') + e.msg })))));
  };
  const runOnce = () => {
    const src = ed.ta.value;
    const t0 = Object.assign({}, tests()[0]);
    if (stdinBox) t0.stdin = stdinBox.value;
    if (t0.call && !isAsm) { delete t0.call; }
    const r = isAsm ? runAsm(ex, src, t0) : runC(ex, src, Object.assign({}, t0, { maxCycles: t0.maxCycles || 3e6 }));
    res.innerHTML = '';
    if (!r.ok && (isAsm || r.errors.some(e => e.kind === 'compile'))) { showErrors(r.errors); return r; }
    ed.setError(r.errors && r.errors[0] ? r.errors[0].line : 0);
    const box = el('div', { class: 'res-box' });
    if (!isAsm) {
      const usesTerm = r.segments.length || r.m.txLog.length || (r.prog && r.prog.includes.has('stdio'));
      if (usesTerm) box.append(terminalView(r.segments, r.m.txLog.length && !r.out ? 'Serial terminal' : 'Output'));
      if (r.errors.length) box.append(el('div', { class: 'res-err', text: 'Error on line ' + r.errors[0].line + ': ' + r.errors[0].msg }));
      const st = r.halted === 'end' ? (tests()[0].call ? '' : 'The program finished.') : HALT[r.halted] || '';
      const info = [st];
      if (r.halted === 'limit' || r.halted === 'cycles') info.push('Simulated time: ' + (r.m.cycles / 1e6 * 4e6 / root.PIC.oscFreq(r.m)).toFixed(3) + ' s.');
      if (r.ramUsed > 368) info.push('Your variables use ' + r.ramUsed + ' bytes: more than the 368 bytes of RAM of the PIC16F887!');
      box.append(el('div', { class: 'res-info', text: info.filter(Boolean).join(' ') }));
      const b = boardView(r.m);
      if (b) box.append(b);
      const g = cGlobals(r); if (g && ex.showVars) box.append(g);
    } else {
      box.append(el('div', { class: 'res-info', text: (HALT[r.halted] || '') + ' ' + r.m.steps + ' instructions, ' + r.m.cycles + ' cycles.' }));
      const b = boardView(r.m);
      if (b) box.append(b);
      if (r.m.txLog.length) box.append(terminalView([{ text: r.get('TX') }], 'Serial terminal'));
      box.append(asmRegisters(r));
      if (r.m.warn.length) box.append(el('div', { class: 'res-err', text: r.m.warn[0] }));
    }
    (r.warnings || []).slice(0, 3).forEach(w => box.append(el('div', { class: 'res-warn', text: 'Warning' + (w.line ? ' (line ' + w.line + ')' : '') + ': ' + w.msg })));
    res.append(box);
    renderMath(res);
    return r;
  };
  const api = {
    el: el('div', {}, out, res),
    read: () => ed.ta.value,
    write(v) { ed.ta.value = v == null ? (ex.start || '') : v; ed.setError(0); ed.upd(); res.innerHTML = ''; },
    reset() { api.write(null); },
    run: runOnce,
    check() {
      const src = ed.ta.value;
      if (src.trim() === '' || src.trim() === (ex.start || '').trim() && ex.start && !ex.allowStart) { if (src.trim() === '') return { ok: false, msg: 'Write some code first.' }; }
      const clean = stripComments(src, ex.lang);
      const msgs = [];
      let fail = false;
      (ex.reqs || []).forEach(q => { if (!q.re.test(clean)) { fail = true; msgs.push({ t: q.msg }); } });
      (ex.forbid || []).forEach(q => { if (q.re.test(clean)) { fail = true; msgs.push({ t: q.msg }); } });
      const list = tests();
      let details = null, lastR = null, passed = 0;
      for (let i = 0; i < list.length; i++) {
        const tr = evalTest(ex, src, list[i], i + 1, list.length);
        lastR = tr.r;
        if (tr.compile) { showErrors(tr.r.errors); return { ok: false, msg: (isAsm ? 'The assembler' : 'The compiler') + ' found a problem, so the program cannot run yet. Read the message below the editor.' }; }
        tr.msgs.forEach(x => msgs.push({ t: x.t, ok: x.ok }));
        if (!tr.pass) { fail = true; if (!details) details = tr.msgs.find(x => x.detail); }
        else passed++;
      }
      ed.setError(0);
      res.innerHTML = '';
      const box = el('div', { class: 'res-box ' + (fail ? 'bad' : 'good') });
      box.append(el('div', { class: 'res-h', text: 'Test results: ' + passed + ' / ' + list.length + ' passed' + (fail && passed === list.length ? ' (but see the requirements)' : '') }));
      box.append(el('ul', { class: 'tests' }, msgs.map(x => el('li', { class: x.ok ? 'p' : 'f', text: x.t }))));
      if (details && details.detail) {
        const d = details.detail;
        if (d.stdin) box.append(el('div', { class: 'cmp' }, el('div', {}, el('b', { text: 'Input' }), el('pre', { text: d.stdin }))));
        box.append(el('div', { class: 'cmp' }, d.want !== undefined ? el('div', {}, el('b', { text: 'Expected output' }), el('pre', { text: showStr(d.want) })) : null, el('div', {}, el('b', { text: 'Your output' }), el('pre', { text: showStr(d.got) }))));
      }
      if (lastR && lastR.m && fail) { const b = boardView(lastR.m); if (b) box.append(el('div', { class: 'cap', text: 'State of the board at the end of the last test:' }), b); }
      res.append(box);
      renderMath(res);
      return { ok: !fail, msg: fail ? 'Not all tests pass yet. Read the test results below the editor.' : '' };
    },
    solution() { return codeBlock(ex.solution, ex.lang).outerHTML; },
    solve() { api.write(ex.solution); },
    wrong() { api.write(ex.start && ex.start.trim() !== ex.solution.trim() ? ex.start : ' '); },
    hasRun: true
  };
  return api;
};

/* ======================= exercise card ======================= */
let uidCounter = 0;
function buildExercise(ex, hooks) {
  const ctx = { uid: ++uidCounter };
  const saved = Store.get(ex.id) || { tries: 0, done: false };
  const hints = [].concat(ex.hint || []);
  let hintShown = 0;
  const isProg = ex.type === 'code';
  const card = el('section', { class: 'ex-card ' + (isProg ? 'prog' : 'quiz') + (saved.done ? ' done' : ''), id: 'ex-' + ex.id, 'aria-labelledby': 'exh-' + ex.id });
  const fb = el('div', { class: 'fb', 'aria-live': 'polite' });
  const hintBox = el('div', { class: 'fb hint' });
  const solBox = el('div', { class: 'fb sol' });
  hintBox.style.display = 'none'; solBox.style.display = 'none';
  const api = T[ex.type](ex, ctx);
  ctx.check = () => doCheck();
  const pts = el('span', { class: 'pt-got', text: saved.done ? '1' : '0' });
  const head = el('div', { class: 'ex-head' },
    el('span', { class: 'ex-ico', html: MOOC.ICON[isProg ? 'pencil' : 'quiz'] }),
    el('div', { class: 'ex-titles' }, el('span', { class: 'ex-kind', text: isProg ? 'Programming exercise · ' + (ex.lang === 'asm' ? 'Assembly' : 'C') : 'Quiz' }), el('h3', { id: 'exh-' + ex.id, text: ex.title })),
    el('div', { class: 'ex-points' }, el('span', { class: 'pt-l', text: 'Points' }), el('div', { class: 'pt-pills' }, pts, el('span', { class: 'pt-sep', text: '/' }), el('span', { class: 'pt-max', text: '1' }))));
  const body = el('div', { class: 'ex-body' });
  body.append(el('div', { class: 'q', html: ex.q }));
  if (ex.snippet) body.append(codeBlock(ex.snippet.text, ex.snippet.lang, ex.snippet.lines ? { lines: true } : null));
  if (ex.sample) body.append(sampleOut(ex.sample));
  if (ex.note) body.append(el('div', { class: 'cap', html: ex.note }));
  body.append(api.el);
  const bCheck = btn(isProg ? 'Test' : 'Check answer', 'primary', () => doCheck(), isProg ? 'Run the tests (Ctrl+Enter)' : '');
  const bRun = api.hasRun ? btn('▶ Run', '', () => { api.run(); }) : null;
  const bHint = hints.length ? btn('Hint', '', () => showHint()) : null;
  const bSol = btn('Show solution', '', () => showSolution(), 'Available after your first attempt');
  const bReset = api.reset && ex.type !== 'mcq' && ex.type !== 'input' ? btn('Reset', '', () => { if (isProg && api.read() !== (ex.start || '') && !confirm('Reset the editor to the starting code? Your code will be lost.')) return; api.reset(); fb.className = 'fb'; fb.innerHTML = ''; }) : null;
  bSol.disabled = !(saved.tries > 0);
  body.append(el('div', { class: 'btns' }, bRun, bCheck, bReset, bHint, bSol), fb, hintBox, solBox);
  card.append(head, body);
  if (api.problem) fb.innerHTML = 'Internal problem in this exercise: ' + esc(api.problem[0].msg);
  function showHint() {
    hintShown = Math.min(hints.length, hintShown + 1);
    hintBox.style.display = '';
    hintBox.innerHTML = '<b class="h">Hint' + (hints.length > 1 ? ' ' + hintShown + ' of ' + hints.length : '') + '</b>' + hints.slice(0, hintShown).map(h => '<div>' + h + '</div>').join('<hr>');
    bHint.textContent = hintShown >= hints.length ? 'Hint shown' : 'Next hint';
    renderMath(hintBox);
  }
  function showSolution() {
    if (bSol.disabled) return;
    solBox.style.display = '';
    solBox.innerHTML = '<b class="h">Model solution</b>' + api.solution() + (ex.sol ? '<div>' + ex.sol + '</div>' : '') + (ex.why ? '<div class="why"><b>Why:</b> ' + ex.why + '</div>' : '');
    renderMath(solBox);
    const st = Store.get(ex.id) || { tries: 0, done: false }; st.sol = true; Store.set(ex.id, st);
  }
  function setDone(done) { card.classList.toggle('done', done); pts.textContent = done ? '1' : '0'; }
  function doCheck() {
    const r = api.check();
    const st = Store.get(ex.id) || { tries: 0, done: false };
    st.tries = (st.tries || 0) + 1; st.ans = api.read();
    if (r.ok) st.done = true;
    Store.set(ex.id, st);
    bSol.disabled = false;
    if (r.ok) {
      setDone(true);
      fb.className = 'fb ok';
      fb.innerHTML = '<b class="h">' + (isProg ? 'All tests passed. ' : '') + 'Correct!</b>' + (ex.why ? ex.why : '') + (isProg ? ' <span class="pt-msg">You earned 1 point.</span>' : '');
    } else {
      fb.className = 'fb no';
      fb.innerHTML = '<b class="h">Not correct yet.</b>' + (r.msg || '') + ' <i>You can try again as many times as you like.</i>';
    }
    renderMath(fb);
    hooks && hooks.onChange && hooks.onChange(ex.id, !!r.ok);
    return r;
  }
  if (saved.ans !== undefined && saved.ans !== null) api.write(saved.ans);
  if (saved.done) { fb.className = 'fb ok'; fb.innerHTML = '<b class="h">Completed.</b>' + (ex.why || ''); }
  card._api = api; card._ex = ex; card._doCheck = doCheck;
  return card;
}
function sampleOut(text, opts) {
  opts = opts || {};
  const pre = el('div', { class: 'so-b' + (opts.mono === false ? '' : ' mono') });
  /* [[text]] marks what the user types */
  String(text).replace(/\n$/, '').split(/(\[\[[\s\S]*?\]\])/).forEach(part => {
    if (/^\[\[[\s\S]*\]\]$/.test(part)) pre.append(el('span', { class: 'so-in', text: part.slice(2, -2) }));
    else if (part) pre.append(document.createTextNode(part));
  });
  return el('div', { class: 'sample-out' }, el('div', { class: 'so-l', text: opts.label || 'Sample output' }), pre);
}

MOOC.buildExercise = buildExercise;
MOOC.sampleOut = sampleOut;
MOOC.exTypes = T;
MOOC.util = { parseNum, parseHex, parseBin, checkValue, normText, stripComments, toBin, normOut, evalTest };
})(typeof window !== 'undefined' ? window : globalThis);
