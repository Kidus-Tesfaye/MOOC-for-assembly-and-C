/* Authoring language for the course content (global D). Text may contain LaTeX between $...$ (inline)
   and $$...$$ (display); write it with the R`...` tag (String.raw) so backslashes stay as they are. */
(function (root) {
'use strict';
const MOOC = root.MOOC;
const D = root.D = {};
root.R = String.raw;

/* number helpers for content files (answers are computed, never typed by hand) */
root.H = {
  b8: n => (n & 255).toString(2).padStart(8, '0'),
  b4: n => (n & 15).toString(2).padStart(4, '0'),
  b16: n => (n & 0xFFFF).toString(2).padStart(16, '0'),
  h2: n => (n & 255).toString(16).toUpperCase().padStart(2, '0'),
  h4: n => (n & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'),
  nib: s => s.slice(0, 4) + ',' + s.slice(4),
  /* literal n in any base, for regular expressions on C code */
  lit: n => { const h = n.toString(16), b = n.toString(2); const alts = [String(n), '0[xX]0*' + h, '0[bB]0*' + (b === '0' ? '' : b)]; if (n === 0) alts.push('0[bB]0+', '0[xX]0+'); return '(?:' + alts.join('|') + ')'; }
};
D.assignRe = (name, n) => new RegExp('\\b' + name + '\\s*=\\s*' + root.H.lit(n) + '\\s*;');

/* ---------- parts and sections ---------- */
D.part = (def) => { def.num = MOOC.parts.length + 1; MOOC.parts.push(def); return def; };
D.page = (def) => { MOOC.pages.push(def); return def; };

/* ---------- lesson blocks ---------- */
D.T = html => ({ k: 'text', html });
D.H = (text, id) => ({ k: 'h2', text, id });
D.H3 = (text) => ({ k: 'h3', text });
D.INFO = (title, html) => ({ k: 'box', kind: 'info', title, html });
D.WARN = (title, html) => ({ k: 'box', kind: 'warn', title, html });
D.KEY = (title, html) => ({ k: 'box', kind: 'key', title, html });
D.CODE = (text, lang, o) => Object.assign({ k: 'code', text, lang: lang || 'c' }, o || {});
D.OUT = (text, o) => Object.assign({ k: 'out', text }, o || {});
D.TABLE = (head, rows, o) => Object.assign({ k: 'table', head, rows }, o || {});
D.FIG = (html, cap) => ({ k: 'fig', html, cap });
D.EX = (title, text, lang, lines, result, o) => Object.assign({ k: 'example', title, text, lang: lang || 'asm', lines: lines || [], result }, o || {});
D.SIDE = (c, asm, o) => Object.assign({ k: 'side', c, asm }, o || {});

/* ---------- exercises: an optional difficulty number may come first (kept for old snippets) ---------- */
function ex(type, a) {
  a = Array.from(a);
  if (typeof a[0] === 'number') a.shift();
  return { type, a };
}
const mk = (type, title, q, why, extra, more) => Object.assign({ k: 'ex', type, title, q, why }, more || {}, extra || {});
D.mc = function () { const { a } = ex('mcq', arguments); const [title, q, opts, ans, why, extra] = a; return mk('mcq', title, q, why, extra, { opts, a: ans }); };
D.tf = function () { const { a } = ex('mcq', arguments); const [title, q, truth, why, extra] = a; return mk('mcq', title, q, why, extra, { opts: ['True', 'False'], a: truth ? 0 : 1, tf: true }); };
D.num = function () { const { a } = ex('input', arguments); const [title, q, ans, why, extra] = a; return mk('input', title, q, why, Object.assign({ kind: 'num' }, extra || {}), { ans: [].concat(ans) }); };
D.txt = function () { const { a } = ex('input', arguments); const [title, q, ans, why, extra] = a; return mk('input', title, q, why, Object.assign({ kind: 'text' }, extra || {}), { ans: [].concat(ans) }); };
D.multi = function () { const { a } = ex('input', arguments); const [title, q, fields, why, extra] = a; return mk('input', title, q, why, extra, { fields }); };
D.fill = function () { const { a } = ex('fill', arguments); const [title, q, tpl, why, extra] = a; return mk('fill', title, q, why, extra, { tpl }); };
D.asm = function () { const { a } = ex('code', arguments); const [title, q, spec, why, extra] = a; return mk('code', title, q, why, extra, Object.assign({ lang: 'asm' }, spec)); };
D.c = function () { const { a } = ex('code', arguments); const [title, q, spec, why, extra] = a; return mk('code', title, q, why, extra, Object.assign({ lang: 'c' }, spec)); };
D.trace = function () { const { a } = ex('trace', arguments); const [title, q, spec, why, extra] = a; return mk('trace', title, q, why, extra, Object.assign({}, spec)); };
D.match = function () { const { a } = ex('match', arguments); const [title, q, pairs, why, extra] = a; return mk('match', title, q, why, extra, { pairs }); };
D.order = function () { const { a } = ex('order', arguments); const [title, q, steps, why, extra] = a; return mk('order', title, q, why, extra, { steps }); };
D.bits = function () { const { a } = ex('bits', arguments); const [title, q, spec, why, extra] = a; return mk('bits', title, q, why, extra, Object.assign({}, spec)); };
})(typeof window !== 'undefined' ? window : globalThis);
