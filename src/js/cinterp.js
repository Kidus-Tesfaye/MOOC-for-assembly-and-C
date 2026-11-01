/* C interpreter for the course. It follows the rules of the Microchip XC8 compiler for the PIC16F887:
     char is 8 bits and UNSIGNED, short and int are 16 bits, short long is 24 bits, long is 32 bits,
     float and double are 32 bits (XC8 2.x in C99 mode), pointers are 16 bits, values are little endian.
   Supported: the preprocessor (#include, #define with parameters, #if/#ifdef), all C operators, if/else,
   while, do/while, for, switch, break/continue/return, functions, arrays, strings, pointers, struct/union,
   enum, typedef, const/volatile, the SFRs and bit names of <xc.h> (PORTD, RD0, PORTDbits.RD0, GIE ...),
   __delay_ms/__delay_us/_delay, void __interrupt() isr(void), and a small standard library.
   printf/puts/putchar write to the simulated serial terminal; scanf/getchar read the input given to the program.
   Recursion is rejected, as XC8 does for mid-range PICs (no software stack), and the 8-level hardware stack is checked. */
(function (root) {
'use strict';
const P = root.PIC;

class CError extends Error {
  constructor(msg, line, kind) { super(msg); this.line = line || 0; this.kind = kind || 'compile'; }
}
const STOP = { stop: true };

/* ======================= types ======================= */
const I = (bits, uns, name) => ({ k: 'int', bits, uns, name });
const T = {
  void: { k: 'void', name: 'void' },
  char: I(8, true, 'char'), schar: I(8, false, 'signed char'), uchar: I(8, true, 'unsigned char'),
  short: I(16, false, 'short'), ushort: I(16, true, 'unsigned short'),
  int: I(16, false, 'int'), uint: I(16, true, 'unsigned int'),
  slong: I(24, false, 'short long'), uslong: I(24, true, 'unsigned short long'),
  long: I(32, false, 'long'), ulong: I(32, true, 'unsigned long'),
  float: { k: 'float', bits: 32, name: 'float' }, double: { k: 'float', bits: 32, name: 'double' },
  bool: Object.assign(I(8, true, '_Bool'), { bool: true }), bit: Object.assign(I(1, true, '__bit'), { bit: true })
};
const ptr = (to) => ({ k: 'ptr', to });
const arr = (of, n) => ({ k: 'arr', of, n });
const isInt = t => t && t.k === 'int';
const isArith = t => t && (t.k === 'int' || t.k === 'float');
const isScalar = t => t && (t.k === 'int' || t.k === 'float' || t.k === 'ptr');
function sizeOf(t, line) {
  switch (t.k) {
    case 'int': return t.bit ? 1 : t.bits / 8;
    case 'float': return 4;
    case 'ptr': return 2;
    case 'arr': if (t.n == null) throw new CError('The size of this array is unknown.', line); return t.n * sizeOf(t.of, line);
    case 'struct': if (!t.complete) throw new CError("struct '" + t.tag + "' is used before its fields are declared.", line); return t.size;
    case 'void': throw new CError('void has no size.', line);
    case 'fn': throw new CError('A function has no size.', line);
  }
  return 1;
}
function typeName(t) {
  if (!t) return '?';
  if (t.k === 'ptr') return typeName(t.to) + ' *';
  if (t.k === 'arr') return typeName(t.of) + '[' + (t.n == null ? '' : t.n) + ']';
  if (t.k === 'struct') return (t.union ? 'union ' : 'struct ') + (t.tag || '(anonymous)');
  if (t.k === 'fn') return typeName(t.ret) + ' (*)(...)';
  return t.name;
}
function wrapInt(v, t) {
  if (t.bool) return v ? 1 : 0;
  if (t.bit) return Math.trunc(v) & 1;
  if (!Number.isFinite(v)) v = 0;
  v = Math.trunc(v);
  if (t.bits === 32) return t.uns ? (v >>> 0) : (v | 0);
  const mod = 2 ** t.bits;
  v %= mod; if (v < 0) v += mod;
  if (!t.uns && v >= mod / 2) v -= mod;
  return v;
}
function conv(v, from, to) {
  if (to.k === 'float') return Math.fround(Number(v));
  if (to.k === 'int') {
    if (to.bool) return v ? 1 : 0;
    if (from && from.k === 'float') { if (to.bit) return Math.trunc(v) & 1; return wrapInt(Math.trunc(v), to); }
    if (to.bit) return v & 1;
    return wrapInt(v, to);
  }
  if (to.k === 'ptr') return v & 0xFFFF;
  return v;
}
function promote(t) { if (t.k === 'int' && (t.bits < 16 || t.bool || t.bit)) return T.int; return t; }
function common(a, b) {
  if (a.k === 'float' || b.k === 'float') return T.float;
  a = promote(a); b = promote(b);
  if (a.bits === b.bits) return (a.uns || b.uns) ? I(a.bits, true, a.uns ? a.name : b.name) : a;
  return a.bits > b.bits ? a : b;
}

/* ======================= lexer ======================= */
const KEYWORDS = new Set(['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'int', 'long', 'register', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while', '_Bool', 'bit', '__bit', 'interrupt', '__interrupt', 'inline', 'near', 'far', '__near', '__far', 'persistent', '__persistent', 'eeprom', '__eeprom']);
const PUNCT = ['>>=', '<<=', '...', '->', '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '&=', '^=', '|=', '##',
  '{', '}', '[', ']', '(', ')', ';', ',', ':', '?', '=', '<', '>', '+', '-', '*', '/', '%', '&', '|', '^', '!', '~', '.', '#'];
function unescape(s, line) {
  const out = [];
  for (let i = 0; i < s.length; i++) {
    let c = s[i];
    if (c !== '\\') { out.push(c.charCodeAt(0) & 255); continue; }
    c = s[++i];
    const simple = { n: 10, r: 13, t: 9, '0': 0, '\\': 92, "'": 39, '"': 34, a: 7, b: 8, f: 12, v: 11, '?': 63, e: 27 };
    if (c === 'x') { let h = ''; while (/[0-9a-fA-F]/.test(s[i + 1] || '') && h.length < 2) h += s[++i]; out.push(parseInt(h || '0', 16)); }
    else if (/[0-7]/.test(c)) { let o = c; while (/[0-7]/.test(s[i + 1] || '') && o.length < 3) o += s[++i]; out.push(parseInt(o, 8) & 255); }
    else if (Object.prototype.hasOwnProperty.call(simple, c)) out.push(simple[c]);
    else throw new CError("Unknown escape sequence '\\" + c + "'.", line);
  }
  return out;
}
function lex(text, line0) {
  const toks = [];
  let i = 0, line = line0 || 1;
  const n = text.length;
  while (i < n) {
    const c = text[i];
    if (c === '\n') { line++; i++; continue; }
    if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') { i++; continue; }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1; while (j < n && /[A-Za-z0-9_]/.test(text[j])) j++;
      const w = text.slice(i, j);
      toks.push({ t: KEYWORDS.has(w) ? 'kw' : 'id', v: w, line }); i = j; continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(text[i + 1] || ''))) {
      let m = /^(0[xX][0-9a-fA-F]+|0[bB][01]+|[0-9]*\.[0-9]+(?:[eE][-+]?[0-9]+)?|[0-9]+\.(?:[eE][-+]?[0-9]+)?|[0-9]+[eE][-+]?[0-9]+|[0-9]+)([uUlLfF]*)/.exec(text.slice(i));
      if (!m) throw new CError('Bad number.', line);
      const body = m[1], suf = m[2].toLowerCase();
      let v, t, isF = /[.eE]/.test(body) && !/^0[xX]/.test(body);
      if (isF || suf.includes('f') && !/^0[xX]/.test(body)) { v = Math.fround(parseFloat(body)); t = T.float; }
      else {
        if (/^0[xX]/.test(body)) v = parseInt(body.slice(2), 16);
        else if (/^0[bB]/.test(body)) v = parseInt(body.slice(2), 2);
        else if (/^0[0-7]+$/.test(body)) v = parseInt(body, 8);
        else if (/^0[0-9]+$/.test(body)) throw new CError("'" + body + "' is not a valid number: a leading 0 means octal (base 8), which has no digits 8 or 9.", line);
        else v = parseInt(body, 10);
        const u = suf.includes('u'), l = suf.includes('l');
        const decimal = !/^0/.test(body) || body === '0';
        if (!l && v <= (u ? 0xFFFF : 0x7FFF)) t = u ? T.uint : T.int;
        else if (!l && !u && !decimal && v <= 0xFFFF) t = T.uint;
        else if (v <= (u ? 0xFFFFFFFF : 0x7FFFFFFF)) t = u ? T.ulong : T.long;
        else if (!decimal && v <= 0xFFFFFFFF) t = T.ulong;
        else { t = T.ulong; v = v % 4294967296; }
      }
      toks.push({ t: 'num', v, ty: t, line, raw: body + m[2] }); i += m[0].length; continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && text[j] !== c) { if (text[j] === '\\') j++; if (text[j] === '\n') throw new CError('A ' + (c === '"' ? 'string' : 'character constant') + ' is not closed on this line (missing ' + c + ').', line); j++; }
      if (j >= n) throw new CError('Missing closing ' + c + '.', line);
      const raw = text.slice(i + 1, j);
      const bytes = unescape(raw, line);
      if (c === '"') toks.push({ t: 'str', v: bytes, line, raw });
      else {
        if (bytes.length === 0) throw new CError("Empty character constant ''.", line);
        if (bytes.length > 1) throw new CError("A character constant holds one character: '" + raw + "' has " + bytes.length + '. Use double quotes " " for strings.', line);
        toks.push({ t: 'num', v: bytes[0], ty: T.int, line, raw: "'" + raw + "'", chr: true });
      }
      i = j + 1; continue;
    }
    let p = null;
    for (const q of PUNCT) if (text.startsWith(q, i)) { p = q; break; }
    if (!p) throw new CError("Unexpected character '" + c + "'.", line);
    toks.push({ t: 'op', v: p, line }); i += p.length;
  }
  return toks;
}

/* ======================= preprocessor ======================= */
function stripComments(src) {
  let out = '', i = 0, q = null;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (q) { out += c; if (c === '\\') { out += src[i + 1] || ''; i += 2; continue; } if (c === q || c === '\n') q = null; i++; continue; }
    if (c === '"' || c === "'") { q = c; out += c; i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      const body = e < 0 ? src.slice(i) : src.slice(i, e + 2);
      out += ' ' + body.replace(/[^\n]/g, '');
      if (e < 0) throw new CError('A /* comment is never closed with */.', (src.slice(0, i).match(/\n/g) || []).length + 1);
      i = e + 2; continue;
    }
    out += c; i++;
  }
  return out;
}
const HEADERS = {
  'xc.h': 'xc', 'pic.h': 'xc', 'htc.h': 'xc', 'pic16f887.h': 'xc', 'stdio.h': 'stdio', 'stdlib.h': 'stdlib', 'string.h': 'string', 'math.h': 'math', 'ctype.h': 'ctype',
  'stdint.h': 'stdint', 'stdbool.h': 'stdbool', 'stddef.h': 'stddef', 'limits.h': 'limits', 'LiquidCrystal.h': 'lcd', 'liquidcrystal.h': 'lcd', 'lcd.h': 'lcd', 'usart.h': 'usart'
};
function preprocess(src, opts) {
  opts = opts || {};
  const macros = Object.create(null);
  const includes = new Set();
  const warnings = [];
  const outToks = [];
  const define = (name, body, params) => { macros[name] = { body: body ? lex(body, 0) : [], params: params || null }; };
  define('__XC8', '1'); define('__XC', '1'); define('__PIC16F887', '1'); define('_16F887', '1'); define('NULL', '((void*)0)');
  const headerMacros = {
    xc: () => {
      define('__delay_ms', '_delay((unsigned long)((x)*(_XTAL_FREQ/4000.0)))', ['x']);
      define('__delay_us', '_delay((unsigned long)((x)*(_XTAL_FREQ/4000000.0)))', ['x']);
      define('NOP', '_nop()', []); define('CLRWDT', '_clrwdt()', []); define('SLEEP', '_sleep()', []);
      define('ei', '(GIE = 1)', []); define('di', '(GIE = 0)', []);
    },
    stdio: () => { define('EOF', '(-1)'); },
    stdbool: () => { define('bool', '_Bool'); define('true', '1'); define('false', '0'); },
    stdint: () => { define('INT8_MAX', '127'); define('UINT8_MAX', '255'); define('INT16_MAX', '32767'); define('UINT16_MAX', '65535'); },
    limits: () => { define('CHAR_BIT', '8'); define('CHAR_MAX', '255'); define('UCHAR_MAX', '255'); define('SCHAR_MAX', '127'); define('SCHAR_MIN', '(-128)'); define('INT_MAX', '32767'); define('INT_MIN', '(-32767-1)'); define('UINT_MAX', '65535u'); define('LONG_MAX', '2147483647L'); define('LONG_MIN', '(-2147483647L-1)'); define('ULONG_MAX', '4294967295UL'); },
    lcd: () => { define('line1', '0x80'); define('line2', '0xC0'); },
    stdlib: () => { define('RAND_MAX', '32767'); }
  };
  const files = opts.files || {};
  function expandTokens(toks, hide) {
    const out = [];
    for (let i = 0; i < toks.length; i++) {
      const tk = toks[i];
      if (tk.t !== 'id' || !macros[tk.v] || (tk.hide && tk.hide.has(tk.v)) || (hide && hide.has(tk.v))) { out.push(tk); continue; }
      const mac = macros[tk.v];
      const nh = new Set(tk.hide || []); if (hide) hide.forEach(h => nh.add(h)); nh.add(tk.v);
      if (mac.params) {
        if (!toks[i + 1] || toks[i + 1].v !== '(' || toks[i + 1].t !== 'op') { out.push(tk); continue; }
        let depth = 0, j = i + 1; const args = [[]];
        for (; j < toks.length; j++) {
          const x = toks[j];
          if (x.t === 'op' && x.v === '(') { depth++; if (depth === 1) continue; }
          if (x.t === 'op' && x.v === ')') { depth--; if (depth === 0) break; }
          if (x.t === 'op' && x.v === ',' && depth === 1) { args.push([]); continue; }
          args[args.length - 1].push(x);
        }
        if (j >= toks.length) throw new CError("The call of the macro '" + tk.v + "' is missing a ')'.", tk.line);
        if (mac.params.length === 0 && args.length === 1 && args[0].length === 0) args.length = 0;
        if (args.length !== mac.params.length) throw new CError("The macro '" + tk.v + "' takes " + mac.params.length + ' argument(s) but ' + args.length + ' were given.', tk.line);
        const expArgs = args.map(a => expandTokens(a, hide));
        const body = [];
        for (let b = 0; b < mac.body.length; b++) {
          const bt = mac.body[b];
          const pi = bt.t === 'id' ? mac.params.indexOf(bt.v) : -1;
          if (bt.t === 'op' && bt.v === '#' && mac.body[b + 1] && mac.params.indexOf(mac.body[b + 1].v) >= 0) {
            const a = args[mac.params.indexOf(mac.body[b + 1].v)];
            const s = a.map(x => x.raw || (x.t === 'str' ? '"' + x.raw + '"' : String(x.v))).join(' ');
            body.push({ t: 'str', v: Array.from(s).map(ch => ch.charCodeAt(0) & 255), line: tk.line, raw: s }); b++; continue;
          }
          if (pi >= 0) expArgs[pi].forEach(x => body.push(Object.assign({}, x, { line: tk.line })));
          else body.push(Object.assign({}, bt, { line: tk.line, hide: nh }));
        }
        expandTokens(body, nh).forEach(x => out.push(x));
        i = j;
      } else {
        const body = mac.body.map(bt => Object.assign({}, bt, { line: tk.line, hide: nh }));
        expandTokens(body, nh).forEach(x => out.push(x));
      }
    }
    return out;
  }
  function evalIf(toks, line) {
    const t2 = [];
    for (let i = 0; i < toks.length; i++) {
      const x = toks[i];
      if (x.t === 'id' && x.v === 'defined') {
        let name;
        if (toks[i + 1] && toks[i + 1].v === '(') { name = toks[i + 2] && toks[i + 2].v; i += 3; } else { name = toks[i + 1] && toks[i + 1].v; i += 1; }
        t2.push({ t: 'num', v: macros[name] ? 1 : 0, ty: T.long, line }); continue;
      }
      t2.push(x);
    }
    const ex = expandTokens(t2).map(x => x.t === 'id' ? { t: 'num', v: 0, ty: T.long, line } : x);
    const p = new Parser(ex, { typedefs: {} });
    const e = p.expr();
    return constEval(e) ? 1 : 0;
  }
  function processFile(text, fname, depth) {
    if (depth > 8) throw new CError('#include nested too deeply.', 0);
    const clean = stripComments(text.replace(/\r\n?/g, '\n'));
    const lines = clean.split('\n');
    const cond = [];   /* {active, done, parentActive} */
    const active = () => cond.every(c => c.active);
    for (let li = 0; li < lines.length; li++) {
      let line = lines[li];
      const ln = li + 1;
      let extra = 0;
      while (/\\\s*$/.test(line) && li + 1 < lines.length) { line = line.replace(/\\\s*$/, ' ') + lines[++li]; extra++; }
      const m = /^\s*#\s*([A-Za-z_]*)\s*(.*)$/.exec(line);
      const lineNo = fname ? 0 : ln;
      if (m) {
        const d = m[1], rest = m[2].trim();
        if (d === 'ifdef' || d === 'ifndef') { const on = !!macros[rest.split(/\s/)[0]]; cond.push({ active: d === 'ifdef' ? on : !on, done: d === 'ifdef' ? on : !on }); continue; }
        if (d === 'if') { const v = active() ? evalIf(lex(rest, lineNo), lineNo) : 0; cond.push({ active: !!v, done: !!v }); continue; }
        if (d === 'elif') { const c = cond[cond.length - 1]; if (!c) throw new CError('#elif without #if.', lineNo); if (c.done) c.active = false; else { const v = evalIf(lex(rest, lineNo), lineNo); c.active = !!v; c.done = !!v; } continue; }
        if (d === 'else') { const c = cond[cond.length - 1]; if (!c) throw new CError('#else without #if.', lineNo); c.active = !c.done; c.done = true; continue; }
        if (d === 'endif') { if (!cond.length) throw new CError('#endif without #if.', lineNo); cond.pop(); continue; }
        if (!active()) continue;
        if (d === 'include') {
          const im = /^[<"]([^>"]+)[>"]/.exec(rest);
          if (!im) throw new CError('#include needs a file name in <...> or "...".', lineNo);
          const name = im[1].trim();
          if (Object.prototype.hasOwnProperty.call(files, name)) { if (!includes.has('file:' + name)) { includes.add('file:' + name); processFile(files[name], name, depth + 1); } continue; }
          const h = HEADERS[name] || HEADERS[name.toLowerCase()];
          if (!h) throw new CError("Cannot find the include file '" + name + "'. The simulator knows <xc.h>, <stdio.h>, <stdlib.h>, <string.h>, <math.h>, <ctype.h>, <stdint.h>, <stdbool.h> and <limits.h>.", lineNo);
          if (!includes.has(h)) { includes.add(h); if (headerMacros[h]) headerMacros[h](); }
          continue;
        }
        if (d === 'define') {
          const dm = /^([A-Za-z_]\w*)(\(([^)]*)\))?\s*(.*)$/.exec(rest);
          if (!dm) throw new CError('#define needs a name.', lineNo);
          const params = dm[2] !== undefined ? dm[3].split(',').map(s => s.trim()).filter(Boolean) : null;
          macros[dm[1]] = { body: lex(dm[4] || '', lineNo), params };
          continue;
        }
        if (d === 'undef') { delete macros[rest.split(/\s/)[0]]; continue; }
        if (d === 'pragma' || d === 'line' || d === '') continue;
        if (d === 'error') throw new CError('#error ' + rest, lineNo);
        if (d === 'warning') { warnings.push({ line: lineNo, msg: rest }); continue; }
        throw new CError("Unknown preprocessor directive '#" + d + "'.", lineNo);
      }
      if (!active()) continue;
      if (line.trim() === '') continue;
      const toks = lex(line, lineNo);
      expandTokens(toks).forEach(t => { if (fname) t.line = 0; outToks.push(t); });
      void extra;
    }
    if (cond.length) throw new CError('#if/#ifdef without matching #endif.', 0);
  }
  processFile(src, null, 0);
  return { toks: outToks, includes, macros, warnings };
}

/* ======================= parser ======================= */
const BASE_WORDS = new Set(['void', 'char', 'short', 'int', 'long', 'float', 'double', 'signed', 'unsigned', '_Bool', 'bit', '__bit', 'struct', 'union', 'enum']);
const QUAL_WORDS = new Set(['const', 'volatile', 'static', 'extern', 'register', 'auto', 'typedef', 'inline', 'near', 'far', '__near', '__far', 'persistent', '__persistent', 'eeprom', '__eeprom', 'interrupt', '__interrupt']);
class Parser {
  constructor(toks, ctx) { this.toks = toks; this.i = 0; this.ctx = ctx || { typedefs: {} }; this.structs = this.ctx.structs || (this.ctx.structs = {}); this.enums = this.ctx.enums || (this.ctx.enums = {}); }
  peek(o) { return this.toks[this.i + (o || 0)]; }
  line() { const t = this.peek() || this.toks[this.toks.length - 1]; return t ? t.line : 0; }
  is(v, o) { const t = this.peek(o); return !!t && (t.t === 'op' || t.t === 'kw') && t.v === v; }
  eat(v) { if (this.is(v)) { this.i++; return true; } return false; }
  expect(v, what) {
    if (this.is(v)) return this.toks[this.i++];
    const t = this.peek();
    const prev = this.toks[this.i - 1];
    if (v === ';') throw new CError("Expected ';'" + (what ? ' ' + what : '') + (prev ? " after '" + (prev.raw || (prev.t === 'str' ? '"..."' : prev.v)) + "'" : '') + '. In C every statement ends with a semicolon.', prev ? prev.line : this.line());
    throw new CError("Expected '" + v + "'" + (what ? ' ' + what : '') + (t ? " but found '" + (t.raw || (t.t === 'str' ? '"..."' : t.v)) + "'" : ' but the code ended') + '.', t ? t.line : this.line());
  }
  ident(what) {
    const t = this.peek();
    if (!t || t.t !== 'id') throw new CError('Expected a name' + (what ? ' ' + what : '') + (t ? " but found '" + (t.raw || t.v) + "'" : '') + '.', t ? t.line : this.line());
    this.i++; return t.v;
  }
  isTypeStart(o) {
    const t = this.peek(o);
    if (!t) return false;
    if (t.t === 'kw') return BASE_WORDS.has(t.v) || QUAL_WORDS.has(t.v);
    return t.t === 'id' && Object.prototype.hasOwnProperty.call(this.ctx.typedefs, t.v);
  }
  /* declaration specifiers -> {t, storage, isr, isTypedef} */
  specifiers() {
    let sign = null, size = null, base = null, longs = 0, sawAny = false;
    const spec = { storage: null, isr: false, typedef: false, cnst: false, vol: false };
    const line = this.line();
    for (;;) {
      const t = this.peek();
      if (!t) break;
      if (t.t === 'kw' && QUAL_WORDS.has(t.v)) {
        this.i++;
        if (t.v === 'typedef') spec.typedef = true;
        else if (t.v === 'static' || t.v === 'extern') spec.storage = t.v;
        else if (t.v === 'const') spec.cnst = true;
        else if (t.v === 'volatile') spec.vol = true;
        else if (t.v === '__interrupt' || t.v === 'interrupt') { spec.isr = true; if (this.is('(')) { let d = 0; do { if (this.is('(')) d++; if (this.is(')')) d--; this.i++; } while (d > 0 && this.peek()); } }
        continue;
      }
      if (t.t === 'kw' && (t.v === 'struct' || t.v === 'union')) { this.i++; base = this.structSpec(t.v === 'union'); sawAny = true; continue; }
      if (t.t === 'kw' && t.v === 'enum') { this.i++; base = this.enumSpec(); sawAny = true; continue; }
      if (t.t === 'kw' && BASE_WORDS.has(t.v)) {
        this.i++; sawAny = true;
        if (t.v === 'signed' || t.v === 'unsigned') sign = t.v;
        else if (t.v === 'short') size = 'short';
        else if (t.v === 'long') longs++;
        else base = t.v;
        continue;
      }
      if (t.t === 'id' && !sawAny && Object.prototype.hasOwnProperty.call(this.ctx.typedefs, t.v)) { this.i++; base = this.ctx.typedefs[t.v]; sawAny = true; continue; }
      break;
    }
    if (!sawAny) throw new CError('Expected a type (for example int or char).', line);
    let ty;
    if (base && typeof base === 'object') ty = base;
    else if (base === 'void') ty = T.void;
    else if (base === 'float') ty = T.float;
    else if (base === 'double') ty = T.double;
    else if (base === '_Bool') ty = T.bool;
    else if (base === 'bit' || base === '__bit') ty = T.bit;
    else if (base === 'char') ty = sign === 'signed' ? T.schar : sign === 'unsigned' ? T.uchar : T.char;
    else if (size === 'short' && longs) ty = sign === 'unsigned' ? T.uslong : T.slong;
    else if (size === 'short') ty = sign === 'unsigned' ? T.ushort : T.short;
    else if (longs >= 1) ty = sign === 'unsigned' ? T.ulong : T.long;
    else ty = sign === 'unsigned' ? T.uint : T.int;
    if (spec.cnst || spec.vol) ty = Object.assign({}, ty, { cnst: spec.cnst || ty.cnst, vol: spec.vol || ty.vol });
    spec.t = ty;
    return spec;
  }
  structSpec(union) {
    const line = this.line();
    let tag = null;
    if (this.peek() && this.peek().t === 'id') tag = this.ident();
    const key = (union ? 'union ' : 'struct ') + (tag || '#' + this.i);
    let st = tag && this.structs[key];
    if (!st) { st = { k: 'struct', union, tag, fields: [], size: 0, complete: false }; if (tag) this.structs[key] = st; }
    if (this.eat('{')) {
      if (st.complete) throw new CError((union ? 'union ' : 'struct ') + tag + ' is defined twice.', line);
      let off = 0, size = 0;
      while (!this.eat('}')) {
        const sp = this.specifiers();
        do {
          const d = this.declarator(sp.t);
          if (!d.name) throw new CError('A field needs a name.', this.line());
          if (this.eat(':')) throw new CError('Bit-fields in your own structs are not supported by the simulator.', this.line());
          const sz = sizeOf(d.t, this.line());
          if (st.fields.some(f => f.name === d.name)) throw new CError("The field '" + d.name + "' is declared twice.", this.line());
          st.fields.push({ name: d.name, t: d.t, off: union ? 0 : off });
          if (union) size = Math.max(size, sz); else off += sz;
        } while (this.eat(','));
        this.expect(';', 'after the field declaration');
      }
      st.size = union ? size : off; st.complete = true;
    } else if (!tag) throw new CError('Expected { after struct.', line);
    return st;
  }
  enumSpec() {
    if (this.peek() && this.peek().t === 'id') this.ident();
    if (this.eat('{')) {
      let v = 0;
      while (!this.eat('}')) {
        const name = this.ident('in the enum');
        if (this.eat('=')) v = constEval(this.assign());
        this.enums[name] = v++;
        if (!this.eat(',')) { this.expect('}', 'at the end of the enum'); break; }
      }
    }
    return T.int;
  }
  /* declarator: pointers, name, arrays, function parameters */
  declarator(base, abstract) {
    let t = base;
    while (this.eat('*')) { t = ptr(t); while (this.is('const') || this.is('volatile')) this.i++; }
    let name = null, line = this.line();
    if (this.peek() && this.peek().t === 'id' && !abstract) name = this.ident();
    else if (this.peek() && this.peek().t === 'id' && abstract) name = this.ident();
    const dims = [];
    let fn = null;
    for (;;) {
      if (this.eat('[')) {
        if (this.eat(']')) dims.push(null);
        else { const e = this.assign(); dims.push(constEval(e, 'array size')); this.expect(']'); }
        continue;
      }
      if (this.is('(') && !fn && name) {
        this.i++;
        const params = []; let variadic = false;
        if (!this.eat(')')) {
          if (this.is('void') && this.is(')', 1)) { this.i += 2; }
          else {
            do {
              if (this.eat('...')) { variadic = true; break; }
              const sp = this.specifiers();
              const d = this.declarator(sp.t, true);
              let pt = d.t;
              if (pt.k === 'arr') pt = ptr(pt.of);
              if (pt.k === 'void') throw new CError('A parameter cannot have the type void.', this.line());
              params.push({ name: d.name, t: pt, line: this.line() });
            } while (this.eat(','));
            this.expect(')', 'to close the parameter list');
          }
        }
        fn = { params, variadic };
        continue;
      }
      break;
    }
    for (let k = dims.length - 1; k >= 0; k--) {
      if (dims[k] !== null && dims[k] <= 0) throw new CError('An array must have a size of at least 1.', line);
      t = arr(t, dims[k]);
    }
    if (fn) t = { k: 'fn', ret: t, params: fn.params.map(p => p.t), pnames: fn.params.map(p => p.name), variadic: fn.variadic };
    return { name, t, line };
  }
  typeName() { const sp = this.specifiers(); const d = this.declarator(sp.t, true); return d.t; }
  /* ---------- top level ---------- */
  program() {
    const items = [];
    while (this.i < this.toks.length) {
      if (this.eat(';')) continue;
      const line = this.line();
      const sp = this.specifiers();
      if (this.eat(';')) continue;     /* struct/enum declaration alone */
      const d = this.declarator(sp.t);
      if (d.t.k === 'fn' && this.is('{')) {
        const body = this.block();
        items.push({ k: 'fndef', name: d.name, t: d.t, isr: sp.isr, storage: sp.storage, body, line: d.line });
        continue;
      }
      items.push(this.declRest(sp, d, line, true));
    }
    return items;
  }
  declRest(sp, first, line, global) {
    const decls = [];
    let d = first;
    for (;;) {
      if (!d.name) throw new CError('A declaration needs a name.', d.line);
      if (sp.typedef) { this.ctx.typedefs[d.name] = d.t; }
      else {
        let init = null;
        if (this.eat('=')) init = this.is('{') ? this.initList() : this.assign();
        if (d.t.k === 'fn') { if (init) throw new CError('A function cannot be initialised.', d.line); decls.push({ name: d.name, t: d.t, proto: true, isr: sp.isr, line: d.line }); }
        else {
          if (d.t.k === 'void') throw new CError("A variable cannot have the type void ('" + d.name + "').", d.line);
          decls.push({ name: d.name, t: d.t, init, storage: sp.storage, line: d.line });
        }
      }
      if (!this.eat(',')) break;
      d = this.declarator(sp.t);
    }
    this.expect(';', 'at the end of the declaration');
    return { k: 'decl', decls, line, global };
  }
  initList() {
    const line = this.line();
    this.expect('{');
    const items = [];
    while (!this.eat('}')) {
      items.push(this.is('{') ? this.initList() : this.assign());
      if (!this.eat(',')) { this.expect('}', 'at the end of the initialiser list'); break; }
    }
    return { k: 'initlist', items, line };
  }
  /* ---------- statements ---------- */
  block() {
    const line = this.line();
    this.expect('{');
    const items = [];
    while (!this.eat('}')) {
      if (this.i >= this.toks.length) throw new CError("Missing '}': a block that starts on line " + line + ' is never closed.', line);
      items.push(this.statement());
    }
    return { k: 'block', items, line };
  }
  statement() {
    const t = this.peek();
    const line = this.line();
    if (!t) throw new CError('The code ended in the middle of a statement.', line);
    if (t.t === 'op' && t.v === '{') return this.block();
    if (t.t === 'op' && t.v === ';') { this.i++; return { k: 'empty', line }; }
    if (this.isTypeStart() && !(t.t === 'id' && this.is(':', 1))) {
      const sp = this.specifiers();
      if (this.eat(';')) return { k: 'empty', line };
      const d = this.declarator(sp.t);
      return this.declRest(sp, d, line, false);
    }
    if (t.t === 'kw') {
      switch (t.v) {
        case 'if': {
          this.i++; this.expect('(', 'after if'); const c = this.expr(); this.expect(')', 'after the condition of if');
          if (this.is(';')) this.warnEmpty = this.warnEmpty || line;
          const a = this.statement(); let b = null;
          if (this.eat('else')) b = this.statement();
          return { k: 'if', c, a, b, line };
        }
        case 'while': { this.i++; this.expect('(', 'after while'); const c = this.expr(); this.expect(')', 'after the condition of while'); const body = this.statement(); return { k: 'while', c, body, line }; }
        case 'do': { this.i++; const body = this.statement(); this.expect('while', 'after the body of do'); this.expect('('); const c = this.expr(); this.expect(')'); this.expect(';', 'after do ... while (...)'); return { k: 'dowhile', c, body, line }; }
        case 'for': {
          this.i++; this.expect('(', 'after for');
          let init = null;
          if (!this.eat(';')) {
            if (this.isTypeStart()) { const sp = this.specifiers(); const d = this.declarator(sp.t); init = this.declRest(sp, d, line, false); }
            else { init = { k: 'expr', e: this.expr(), line }; this.expect(';', 'after the first part of for'); }
          }
          const c = this.is(';') ? null : this.expr(); this.expect(';', 'after the condition of for');
          const step = this.is(')') ? null : this.expr(); this.expect(')', 'to close for (...)');
          const body = this.statement();
          return { k: 'for', init, c, step, body, line };
        }
        case 'switch': { this.i++; this.expect('('); const e = this.expr(); this.expect(')'); const body = this.statement(); return { k: 'switch', e, body, line }; }
        case 'case': { this.i++; const v = constEval(this.cond(), 'case label'); this.expect(':', 'after the case value'); return { k: 'case', v, line }; }
        case 'default': { this.i++; this.expect(':', 'after default'); return { k: 'default', line }; }
        case 'break': this.i++; this.expect(';', 'after break'); return { k: 'break', line };
        case 'continue': this.i++; this.expect(';', 'after continue'); return { k: 'continue', line };
        case 'return': { this.i++; const e = this.is(';') ? null : this.expr(); this.expect(';', 'after return'); return { k: 'return', e, line }; }
        case 'goto': throw new CError('goto is not used in this course (and not supported by the simulator).', line);
        case 'else': throw new CError("This 'else' has no matching 'if'. Check the braces { } and the semicolons before it.", line);
      }
    }
    const e = this.expr();
    this.expect(';', 'at the end of the statement');
    return { k: 'expr', e, line };
  }
  /* ---------- expressions ---------- */
  expr() { let e = this.assign(); while (this.is(',')) { const line = this.line(); this.i++; e = { k: 'comma', a: e, b: this.assign(), line }; } return e; }
  assign() {
    const left = this.cond();
    const t = this.peek();
    if (t && t.t === 'op' && ['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>='].includes(t.v)) { this.i++; return { k: 'assign', op: t.v, a: left, b: this.assign(), line: t.line }; }
    return left;
  }
  cond() {
    const c = this.binary(0);
    if (this.is('?')) { const line = this.line(); this.i++; const a = this.expr(); this.expect(':', 'in the ?: operator'); const b = this.cond(); return { k: 'cond', c, a, b, line }; }
    return c;
  }
  binary(minPrec) {
    const PREC = { '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10 };
    let left = this.unary();
    for (;;) {
      const t = this.peek();
      if (!t || t.t !== 'op' || !PREC[t.v] || PREC[t.v] <= minPrec) break;
      this.i++;
      const right = this.binary(PREC[t.v]);
      left = { k: 'bin', op: t.v, a: left, b: right, line: t.line };
    }
    return left;
  }
  unary() {
    const t = this.peek();
    const line = this.line();
    if (!t) throw new CError('An expression is missing at the end of the code.', line);
    if (t.t === 'op') {
      if (t.v === '++' || t.v === '--') { this.i++; return { k: 'preinc', op: t.v, e: this.unary(), line }; }
      if (t.v === '+' || t.v === '-' || t.v === '!' || t.v === '~') { this.i++; return { k: 'unary', op: t.v, e: this.unary(), line }; }
      if (t.v === '*') { this.i++; return { k: 'deref', e: this.unary(), line }; }
      if (t.v === '&') { this.i++; return { k: 'addr', e: this.unary(), line }; }
      if (t.v === '(' && this.isTypeStart(1)) {
        this.i++; const ty = this.typeName(); this.expect(')', 'after the type in the cast');
        if (this.is('{')) throw new CError('Compound literals are not supported.', line);
        return { k: 'cast', t: ty, e: this.unary(), line };
      }
    }
    if (t.t === 'kw' && t.v === 'sizeof') {
      this.i++;
      if (this.is('(') && this.isTypeStart(1)) { this.i++; const ty = this.typeName(); this.expect(')'); return { k: 'sizeoft', t: ty, line }; }
      return { k: 'sizeofe', e: this.unary(), line };
    }
    return this.postfix();
  }
  postfix() {
    let e = this.primary();
    for (;;) {
      const t = this.peek();
      if (!t || t.t !== 'op') break;
      if (t.v === '[') { this.i++; const i = this.expr(); this.expect(']'); e = { k: 'index', a: e, i, line: t.line }; continue; }
      if (t.v === '(') {
        this.i++; const args = [];
        if (!this.eat(')')) { do { args.push(this.assign()); } while (this.eat(',')); this.expect(')', 'to close the function call'); }
        e = { k: 'call', f: e, args, line: t.line }; continue;
      }
      if (t.v === '.' || t.v === '->') { this.i++; const name = this.ident('after ' + t.v); e = { k: 'member', e, name, arrow: t.v === '->', line: t.line }; continue; }
      if (t.v === '++' || t.v === '--') { this.i++; e = { k: 'postinc', op: t.v, e, line: t.line }; continue; }
      break;
    }
    return e;
  }
  primary() {
    const t = this.peek();
    const line = this.line();
    if (!t) throw new CError('An expression is missing.', line);
    this.i++;
    if (t.t === 'num') return { k: 'num', v: t.v, t: t.ty, line, chr: t.chr };
    if (t.t === 'str') { let bytes = t.v.slice(); while (this.peek() && this.peek().t === 'str') bytes = bytes.concat(this.peek().v), this.i++; return { k: 'str', bytes, line }; }
    if (t.t === 'id') { if (Object.prototype.hasOwnProperty.call(this.enums, t.v)) return { k: 'num', v: this.enums[t.v], t: T.int, line }; return { k: 'id', name: t.v, line }; }
    if (t.t === 'op' && t.v === '(') { const e = this.expr(); this.expect(')', 'to close the bracket'); return e; }
    if (t.t === 'op' && t.v === '{') throw new CError("Unexpected '{' inside an expression.", line);
    throw new CError("Unexpected '" + (t.raw || t.v) + "'" + (t.t === 'kw' ? ' (a C keyword)' : '') + ' in an expression.', line);
  }
}
/* compile-time constant expressions (array sizes, case labels, #if) */
function constEval(e, what) {
  const ce = (x) => {
    switch (x.k) {
      case 'num': return x.v;
      case 'unary': { const v = ce(x.e); return x.op === '-' ? -v : x.op === '+' ? v : x.op === '!' ? (v ? 0 : 1) : ~v; }
      case 'bin': {
        const a = ce(x.a), b = ce(x.b);
        switch (x.op) {
          case '+': return a + b; case '-': return a - b; case '*': return a * b;
          case '/': if (!b) throw new CError('Division by zero in a constant.', x.line); return Math.trunc(a / b);
          case '%': if (!b) throw new CError('Division by zero in a constant.', x.line); return a % b;
          case '<<': return a * 2 ** b; case '>>': return Math.floor(a / 2 ** b);
          case '&': return a & b; case '|': return a | b; case '^': return a ^ b;
          case '&&': return a && b ? 1 : 0; case '||': return a || b ? 1 : 0;
          case '==': return a === b ? 1 : 0; case '!=': return a !== b ? 1 : 0; case '<': return a < b ? 1 : 0; case '>': return a > b ? 1 : 0; case '<=': return a <= b ? 1 : 0; case '>=': return a >= b ? 1 : 0;
        }
        break;
      }
      case 'cond': return ce(x.c) ? ce(x.a) : ce(x.b);
      case 'cast': return Math.trunc(ce(x.e));
      case 'sizeoft': return sizeOf(x.t, x.line);
    }
    throw new CError('The ' + (what || 'value') + ' must be a constant number known when the program is compiled.', x.line);
  };
  return ce(e);
}

/* ======================= runtime ======================= */
const MEM_SIZE = 0x10000, GLOBAL_BASE = 0x0400, STACK_BASE = 0x8000, STACK_END = 0xF000;
const BUILTIN_HDR = {
  printf: 'stdio', sprintf: 'stdio', putchar: 'stdio', puts: 'stdio', scanf: 'stdio', getchar: 'stdio',
  itoa: 'stdlib', utoa: 'stdlib', ltoa: 'stdlib', ultoa: 'stdlib', atoi: 'stdlib', atol: 'stdlib', abs: 'stdlib', labs: 'stdlib', rand: 'stdlib', srand: 'stdlib',
  strlen: 'string', strcpy: 'string', strncpy: 'string', strcmp: 'string', strncmp: 'string', strcat: 'string', strncat: 'string', strchr: 'string', memset: 'string', memcpy: 'string', memcmp: 'string',
  isdigit: 'ctype', isalpha: 'ctype', isalnum: 'ctype', isupper: 'ctype', islower: 'ctype', isspace: 'ctype', toupper: 'ctype', tolower: 'ctype',
  sqrt: 'math', pow: 'math', fabs: 'math', floor: 'math', ceil: 'math', round: 'math', sin: 'math', cos: 'math', tan: 'math', log: 'math', log10: 'math', exp: 'math', fmod: 'math',
  _delay: 'xc', _nop: 'xc', _clrwdt: 'xc', _sleep: 'xc',
  lcd_begin: 'lcd', lcd_clear: 'lcd', lcd_print: 'lcd', lcd_cmd: 'lcd', lcd_write: 'lcd', lcd_home: 'lcd',
  USART_SEND: 'usart', USART_SEND_NEW_LINE: 'usart', USART_SEND_CHAR: 'usart', __delay_ms: 'xc', __delay_us: 'xc'
};
const HDR_NAME = { stdio: '<stdio.h>', stdlib: '<stdlib.h>', string: '<string.h>', ctype: '<ctype.h>', math: '<math.h>', xc: '<xc.h>', lcd: '"LiquidCrystal.h"', usart: '"usart.h"' };
const MULTI_FIELDS = { PS: ['OPTION_REG', 0, 3], T1CKPS: ['T1CON', 4, 2], T2CKPS: ['T2CON', 0, 2], TOUTPS: ['T2CON', 3, 4], CHS: ['ADCON0', 2, 4], ADCS: ['ADCON0', 6, 2], IRCF: ['OSCCON', 4, 3], CCP1M: ['CCP1CON', 0, 4], DC1B: ['CCP1CON', 4, 2], CCP2M: ['CCP2CON', 0, 4], DC2B: ['CCP2CON', 4, 2], VCFG: ['ADCON1', 4, 2], RP: ['STATUS', 5, 2], P1M: ['CCP1CON', 6, 2] };

function compile(src, opts) {
  opts = opts || {};
  const pp = preprocess(src, opts);
  const ctx = { typedefs: {} };
  if (pp.includes.has('stdint')) Object.assign(ctx.typedefs, { uint8_t: T.uchar, int8_t: T.schar, uint16_t: T.uint, int16_t: T.int, uint24_t: T.uslong, int24_t: T.slong, uint32_t: T.ulong, int32_t: T.long });
  if (pp.includes.has('stddef') || pp.includes.has('stdio') || pp.includes.has('stdlib') || pp.includes.has('string')) ctx.typedefs.size_t = T.uint;
  const parser = new Parser(pp.toks, ctx);
  const items = parser.program();
  const prog = { items, includes: pp.includes, macros: pp.macros, warnings: pp.warnings.slice(), fns: {}, globals: [], isr: null, protos: {} };
  items.forEach(it => {
    if (it.k === 'fndef') {
      if (prog.fns[it.name]) throw new CError("The function '" + it.name + "' is defined twice.", it.line);
      if (BUILTIN_HDR[it.name] && it.name !== 'putch' && it.name !== 'getch') { /* user version replaces the library one */ }
      prog.fns[it.name] = it;
      if (it.isr) { if (prog.isr) throw new CError('Only one interrupt function is allowed on the PIC16F887 (all interrupts use the vector at address 0x04).', it.line); prog.isr = it; }
    } else if (it.k === 'decl') it.decls.forEach(d => { if (d.proto) prog.protos[d.name] = d; else prog.globals.push(d); });
  });
  resolve(prog);
  return prog;
}

/* static checks: undeclared names, functions, headers, break/continue placement */
function resolve(prog) {
  const xc = prog.includes.has('xc');
  const globalNames = new Set(prog.globals.map(g => g.name));
  const fnNames = new Set(Object.keys(prog.fns).concat(Object.keys(prog.protos)));
  function sfrKnown(name) { return xc && (P.SFR[name] !== undefined || P.BITS[name] !== undefined || ['TMR1', 'CCPR1', 'CCPR2', 'ADRES'].includes(name)); }
  function walkE(e, sc) {
    if (!e || typeof e !== 'object') return;
    switch (e.k) {
      case 'id':
        if (sc.has(e.name) || globalNames.has(e.name)) return;
        if (fnNames.has(e.name)) return;
        if (sfrKnown(e.name)) return;
        if (P.SFR[e.name] !== undefined || P.BITS[e.name] !== undefined) throw new CError("'" + e.name + "' is not declared. The names of the PIC registers and bits come from <xc.h>: add #include <xc.h> at the top.", e.line);
        if (e.name === '_XTAL_FREQ') throw new CError('_XTAL_FREQ is not defined. __delay_ms() and __delay_us() need it: add #define _XTAL_FREQ 4000000 (for a 4 MHz clock) before using them.', e.line);
        if (BUILTIN_HDR[e.name]) return;
        throw new CError("'" + e.name + "' is not declared. Declare a variable before using it (for example int " + e.name + ' = 0;). Remember that C is case sensitive.', e.line);
      case 'call': {
        if (e.f.k === 'id') {
          const n = e.f.name;
          if (fnNames.has(n)) { e.args.forEach(a => walkE(a, sc)); return; }
          if (sc.has(n) || globalNames.has(n)) throw new CError("'" + n + "' is a variable, not a function.", e.line);
          const h = BUILTIN_HDR[n];
          if (h) {
            if (!prog.includes.has(h)) throw new CError("The function '" + n + "' is declared in " + HDR_NAME[h] + '. Add #include ' + HDR_NAME[h] + ' at the top of the program.', e.line);
            e.args.forEach(a => walkE(a, sc)); return;
          }
          throw new CError("The function '" + n + "' is not declared. Check the spelling, or define the function before you call it.", e.line);
        }
        walkE(e.f, sc); e.args.forEach(a => walkE(a, sc)); return;
      }
      case 'member': walkE(e.e, sc); return;
      default:
        ['a', 'b', 'c', 'e', 'i', 'f'].forEach(k => { if (e[k] && typeof e[k] === 'object' && e[k].k) walkE(e[k], sc); });
        if (e.items) e.items.forEach(x => walkE(x, sc));
        if (e.args) e.args.forEach(x => walkE(x, sc));
    }
  }
  function walkS(s, sc, loop, sw) {
    if (!s) return;
    switch (s.k) {
      case 'block': { const inner = new Set(sc); s.items.forEach(x => walkS(x, inner, loop, sw)); return; }
      case 'decl': s.decls.forEach(d => { if (d.init) walkE(d.init, sc); if (sc.has(d.name) && sc.local && sc.local.has(d.name)) {} sc.add(d.name); }); return;
      case 'expr': walkE(s.e, sc); return;
      case 'if': walkE(s.c, sc); walkS(s.a, sc, loop, sw); walkS(s.b, sc, loop, sw); return;
      case 'while': case 'dowhile': walkE(s.c, sc); walkS(s.body, sc, true, sw); return;
      case 'for': { const inner = new Set(sc); walkS(s.init, inner, loop, sw); walkE(s.c, inner); walkE(s.step, inner); walkS(s.body, inner, true, sw); return; }
      case 'switch': walkE(s.e, sc); walkS(s.body, sc, loop, true); return;
      case 'break': if (!loop && !sw) throw new CError('break can only be used inside a loop or a switch.', s.line); return;
      case 'continue': if (!loop) throw new CError('continue can only be used inside a loop.', s.line); return;
      case 'case': case 'default': if (!sw) throw new CError(s.k + ' can only be used inside a switch.', s.line); return;
      case 'return': walkE(s.e, sc); return;
    }
  }
  prog.globals.forEach(g => { if (g.init) walkE(g.init, new Set()); });
  Object.values(prog.fns).forEach(f => {
    const sc = new Set(f.t.pnames.filter(Boolean));
    if (f.t.ret.k !== 'void' && f.name !== 'main' && !hasReturn(f.body)) prog.warnings.push({ line: f.line, msg: "The function '" + f.name + "' should return a value of type " + typeName(f.t.ret) + ' but has no return statement.' });
    walkS(f.body, sc, false, false);
  });
}
function hasReturn(s) { if (!s) return false; if (s.k === 'return') return true; return ['items', 'a', 'b', 'body'].some(k => Array.isArray(s[k]) ? s[k].some(hasReturn) : (s[k] && s[k].k && hasReturn(s[k]))); }

class Runtime {
  constructor(prog, opts) {
    this.prog = prog; this.opts = opts || {};
    this.m = P.newMachine({ lcdPins: this.opts.lcdPins });
    this.bytes = new Uint8Array(MEM_SIZE);
    this.dv = new DataView(this.bytes.buffer);
    this.gptr = GLOBAL_BASE; this.sp = STACK_BASE; this.maxSp = STACK_BASE;
    this.globals = Object.create(null);
    this.stdin = String(this.opts.stdin || ''); this.inPos = 0;
    this.segments = [];      /* console segments {text, input} for display */
    this.steps = 0; this.maxSteps = this.opts.maxSteps || 3000000; this.maxCycles = this.opts.maxCycles || 50000000;
    this.calls = []; this.inIsr = false; this.isrCount = 0; this.warn = [];
    this.events = (this.opts.events || []).slice().sort((x, y) => (x.at || 0) - (y.at || 0));
    this.strings = new Map(); this.statics = new Map();
    this.rng = 1;
    this.xc = prog.includes.has('xc');
    this.userPutch = prog.fns.putch || null;
    for (let a = STACK_BASE; a < STACK_BASE + 8192; a++) this.bytes[a] = (Math.imul(a, 2654435761) >>> 24) & 255;   /* uninitialised locals contain garbage */
  }
  /* ---------- memory ---------- */
  rd8(a) { a &= 0xFFFF; if (a < 0x200) return P.readAbs(this.m, a); if (a < GLOBAL_BASE) throw this.rtErr('Invalid memory read at address 0x' + a.toString(16).toUpperCase() + ' (a pointer that does not point to a variable?).'); return this.bytes[a]; }
  wr8(a, v) { a &= 0xFFFF; if (a < 0x200) { P.writeAbs(this.m, a, v & 255); return; } if (a < GLOBAL_BASE) throw this.rtErr('Invalid memory write at address 0x' + a.toString(16).toUpperCase() + ' (an uninitialised or NULL pointer?).'); this.bytes[a] = v & 255; }
  load(t, a) {
    if (t.k === 'int') {
      if (t.bit) return this.rd8(a) & 1;
      let v = 0; const n = t.bits / 8;
      for (let i = n - 1; i >= 0; i--) v = v * 256 + this.rd8(a + i);
      return wrapInt(v, t);
    }
    if (t.k === 'float') { if (a < 0x200) throw this.rtErr('A float cannot be stored in a special function register.'); return this.dv.getFloat32(a, true); }
    if (t.k === 'ptr') return this.rd8(a) | (this.rd8(a + 1) << 8);
    throw this.rtErr('Cannot read a value of type ' + typeName(t) + ' here.');
  }
  store(t, a, v) {
    if (t.k === 'int') {
      if (t.bit) { this.wr8(a, v & 1); return; }
      const n = t.bits / 8; let x = v < 0 ? v + 2 ** t.bits : v;
      for (let i = 0; i < n; i++) { this.wr8(a + i, x % 256); x = Math.floor(x / 256); }
      return;
    }
    if (t.k === 'float') { this.dv.setFloat32(a, v, true); return; }
    if (t.k === 'ptr') { this.wr8(a, v & 255); this.wr8(a + 1, (v >> 8) & 255); return; }
    throw this.rtErr('Cannot store a value of type ' + typeName(t) + '.');
  }
  galloc(size) { const a = this.gptr; this.gptr += Math.max(1, size); if (this.gptr >= STACK_BASE) throw this.rtErr('Out of memory: too many or too large global variables.'); return a; }
  strAddr(node) {
    let a = this.strings.get(node);
    if (a === undefined) { a = this.galloc(node.bytes.length + 1); node.bytes.forEach((b, i) => { this.bytes[a + i] = b; }); this.bytes[a + node.bytes.length] = 0; this.strings.set(node, a); }
    return a;
  }
  readStr(a, max) { let s = ''; for (let i = 0; i < (max || 4096); i++) { const c = this.rd8(a + i); if (!c) break; s += String.fromCharCode(c); } return s; }
  rtErr(msg, line) { return new CError(msg, line || this.curLine || 0, 'runtime'); }
  /* ---------- time, events and interrupts ---------- */
  advance(cyc) {
    P.tick(this.m, cyc);
    while (this.events.length && (this.events[0].at || 0) <= this.m.cycles) P.applyEvent(this.m, this.events.shift());
    if (this.m.cycles > this.maxCycles) throw STOP;
  }
  step(line) {
    this.curLine = line;
    if (++this.steps > this.maxSteps) throw STOP;
    this.advance(1);
    if (!this.inIsr && (this.m.ram[0x0B] & 0x80)) this.checkInt();
  }
  checkInt() {
    if (this.inIsr || !P.interruptPending(this.m)) return;
    const isr = this.prog.isr;
    if (!isr) { this.warn.push('An interrupt was requested (GIE = 1 and an enabled flag is set) but the program has no interrupt function. Interrupts were disabled.'); this.m.ram[0x0B] &= ~0x80; return; }
    this.m.ram[0x0B] &= ~0x80;
    this.inIsr = true; this.isrCount++;
    const saveLine = this.curLine;
    this.advance(6);
    try { this.callFn(isr, [], isr.line); } finally { this.inIsr = false; this.curLine = saveLine; }
    this.advance(4);
    this.m.ram[0x0B] |= 0x80;
  }
  delay(cycles) {
    let n = Math.max(0, Math.round(cycles));
    if (!Number.isFinite(n)) throw this.rtErr('Invalid delay.');
    while (n > 0) {
      const k = Math.min(n, 256);
      this.advance(k); n -= k;
      if (!this.inIsr && (this.m.ram[0x0B] & 0x80)) this.checkInt();
      if (++this.steps > this.maxSteps * 4) throw STOP;
    }
  }
  /* ---------- console ---------- */
  emit(text, input) {
    if (!text) return;
    if (!input) {
      if (this.userPutch && !this.inPutch) { this.inPutch = true; try { for (const ch of text) this.callFn(this.userPutch, [{ t: T.char, v: ch.charCodeAt(0) & 255 }], this.curLine); } finally { this.inPutch = false; } return; }
      this.m.console += text;
      this.advance(text.length * 3);
    }
    const last = this.segments[this.segments.length - 1];
    if (last && last.input === !!input) last.text += text; else this.segments.push({ text, input: !!input });
    if (!input && this.m.console.length > 200000) throw this.rtErr('Too much output: the program printed more than 200 000 characters (is a loop never ending?).');
  }
  /* ---------- lvalues ---------- */
  lval(e) {
    switch (e.k) {
      case 'id': {
        const v = this.lookup(e.name, e.line);
        if (v.fn) throw this.rtErr("'" + e.name + "' is a function, not a variable.", e.line);
        return v;
      }
      case 'index': {
        const base = this.eval(e.a);
        const iv = this.eval(e.i);
        let p = base, idx = iv;
        if (base.t.k !== 'ptr' && iv.t.k === 'ptr') { p = iv; idx = base; }
        if (p.t.k !== 'ptr') throw this.rtErr('Only arrays and pointers can be indexed with [ ].', e.line);
        if (p.v === 0) throw this.rtErr('NULL pointer: the pointer does not point to an array.', e.line);
        if (!isInt(idx.t)) throw this.rtErr('An array index must be an integer.', e.line);
        const el = p.t.to;
        if (p.arrN != null && (idx.v < 0 || idx.v >= p.arrN)) throw this.rtErr('Index ' + idx.v + ' is outside the array' + (p.name ? " '" + p.name + "'" : '') + ' (valid indexes are 0 to ' + (p.arrN - 1) + ').', e.line);
        return { t: el, addr: (p.v + idx.v * sizeOf(el, e.line)) & 0xFFFF };
      }
      case 'deref': {
        const p = this.eval(e.e);
        if (p.t.k !== 'ptr') throw this.rtErr('Only a pointer can be dereferenced with *.', e.line);
        if (p.t.to.k === 'void') throw this.rtErr('A void * pointer must be cast before it is dereferenced.', e.line);
        if (p.v === 0) throw this.rtErr('NULL pointer dereference: the pointer does not point to anything.', e.line);
        return { t: p.t.to, addr: p.v };
      }
      case 'member': {
        if (!e.arrow && e.e.k === 'id' && /bits$/.test(e.e.name) && this.xc) {
          const reg = e.e.name.slice(0, -4);
          if (P.SFR[reg] !== undefined) {
            const b = P.BITS[e.name], mf = MULTI_FIELDS[e.name];
            if (b && b[0] === reg) return { t: T.bit, addr: P.SFR[reg], bit: b[1] };
            if (mf && mf[0] === reg) return { t: I(mf[2], true, 'bitfield'), addr: P.SFR[reg], bit: mf[1], width: mf[2] };
            throw this.rtErr("The register " + reg + " has no bit called '" + e.name + "'.", e.line);
          }
        }
        let st, addr;
        if (e.arrow) { const p = this.eval(e.e); if (p.t.k !== 'ptr' || p.t.to.k !== 'struct') throw this.rtErr('-> needs a pointer to a struct.', e.line); if (!p.v) throw this.rtErr('NULL pointer dereference.', e.line); st = p.t.to; addr = p.v; }
        else { const lv = this.lval(e.e); if (lv.t.k !== 'struct') throw this.rtErr("'." + e.name + "' can only be used on a struct or union.", e.line); st = lv.t; addr = lv.addr; }
        const f = st.fields.find(x => x.name === e.name);
        if (!f) throw this.rtErr("'" + typeName(st) + "' has no field called '" + e.name + "'.", e.line);
        return { t: f.t, addr: addr + f.off };
      }
      case 'cast': throw this.rtErr('The result of a cast cannot be assigned to.', e.line);
    }
    throw this.rtErr('This expression cannot be assigned to (it is not a variable).', e.line);
  }
  getL(lv) {
    if (lv.bit !== undefined) { const v = this.rd8(lv.addr); return lv.width ? (v >> lv.bit) & ((1 << lv.width) - 1) : (v >> lv.bit) & 1; }
    if (lv.t.k === 'arr') return null;
    return this.load(lv.t, lv.addr);
  }
  setL(lv, v, line) {
    if (lv.t.cnst && !this.initing) throw this.rtErr('A const variable cannot be changed.', line);
    if (lv.bit !== undefined) {
      const old = this.rd8(lv.addr);
      if (lv.width) { const mask = ((1 << lv.width) - 1) << lv.bit; this.wr8(lv.addr, (old & ~mask) | ((v << lv.bit) & mask)); }
      else this.wr8(lv.addr, v & 1 ? old | (1 << lv.bit) : old & ~(1 << lv.bit));
      return;
    }
    if (lv.t.k === 'struct') { for (let i = 0; i < lv.t.size; i++) this.wr8(lv.addr + i, this.rd8(v + i)); return; }
    if (lv.t.k === 'arr') throw this.rtErr('An array cannot be assigned as a whole. Copy it element by element (or use strcpy for strings).', line);
    this.store(lv.t, lv.addr, v);
  }
  lookup(name, line) {
    for (let s = this.scope; s; s = s.parent) if (s.vars[name]) return s.vars[name];
    if (this.globals[name]) return this.globals[name];
    if (this.prog.fns[name] || this.prog.protos[name]) return { fn: true };
    if (this.xc) {
      if (P.SFR[name] !== undefined) return { t: Object.assign({}, T.uchar, { vol: true }), addr: P.SFR[name] };
      if (P.BITS[name]) { const b = P.BITS[name]; return { t: T.bit, addr: P.SFR[b[0]], bit: b[1] }; }
      if (name === 'TMR1') return { t: T.uint, addr: 0x0E };
      if (name === 'CCPR1') return { t: T.uint, addr: 0x15 };
      if (name === 'CCPR2') return { t: T.uint, addr: 0x1B };
    }
    throw this.rtErr("'" + name + "' is not declared.", line);
  }
  /* ---------- expressions ---------- */
  val(t, v) { return { t, v }; }
  rv(lv, name) {
    if (lv.t.k === 'arr') return { t: ptr(lv.t.of), v: lv.addr, arrN: lv.t.n, name };
    if (lv.t.k === 'fn') return { t: lv.t, v: 0 };
    if (lv.t.k === 'struct') return { t: lv.t, v: lv.addr, struct: true };
    return { t: lv.bit !== undefined ? (lv.width ? lv.t : T.bit) : lv.t, v: this.getL(lv) };
  }
  truth(x) { return x.t.k === 'float' ? x.v !== 0 : x.v !== 0; }
  arith(op, a, b, line) {
    if (a.t.k === 'ptr' || b.t.k === 'ptr') return this.ptrArith(op, a, b, line);
    if (!isArith(a.t) || !isArith(b.t)) throw this.rtErr("The operator '" + op + "' cannot be used with " + typeName(a.t) + ' and ' + typeName(b.t) + '.', line);
    const ct = common(a.t, b.t);
    const x = conv(a.v, a.t, ct), y = conv(b.v, b.t, ct);
    if (ct.k === 'float') {
      switch (op) {
        case '+': return this.val(ct, Math.fround(x + y)); case '-': return this.val(ct, Math.fround(x - y)); case '*': return this.val(ct, Math.fround(x * y));
        case '/': if (y === 0) throw this.rtErr('Division by zero.', line); return this.val(ct, Math.fround(x / y));
        case '%': throw this.rtErr("The % operator works only with integers (use fmod() from <math.h> for floats).", line);
        case '<': return this.val(T.int, x < y ? 1 : 0); case '>': return this.val(T.int, x > y ? 1 : 0); case '<=': return this.val(T.int, x <= y ? 1 : 0); case '>=': return this.val(T.int, x >= y ? 1 : 0);
        case '==': return this.val(T.int, x === y ? 1 : 0); case '!=': return this.val(T.int, x !== y ? 1 : 0);
        default: throw this.rtErr("The operator '" + op + "' works only with integers, not with float values.", line);
      }
    }
    let r;
    switch (op) {
      case '+': r = x + y; break; case '-': r = x - y; break;
      case '*': r = ct.bits === 32 ? Math.imul(x, y) : x * y; break;
      case '/': if (y === 0) throw this.rtErr('Division by zero.', line); r = Math.trunc(x / y); break;
      case '%': if (y === 0) throw this.rtErr('Division by zero (remainder % 0).', line); r = x % y; break;
      case '&': r = this.bitop(x, y, ct, (p, q) => p & q); break;
      case '|': r = this.bitop(x, y, ct, (p, q) => p | q); break;
      case '^': r = this.bitop(x, y, ct, (p, q) => p ^ q); break;
      case '<<': { const lt = promote(a.t); const s = conv(b.v, b.t, T.long); if (s < 0 || s >= lt.bits) { return this.val(lt, 0); } const lv = conv(a.v, a.t, lt); return this.val(lt, wrapInt(lt.bits === 32 ? (lv << s) : lv * 2 ** s, lt)); }
      case '>>': { const lt = promote(a.t); const s = conv(b.v, b.t, T.long); const v = conv(a.v, a.t, lt); if (s < 0 || s >= lt.bits) return this.val(lt, v < 0 ? -1 : 0); return this.val(lt, Math.floor(v / 2 ** s)); }
      case '<': return this.val(T.int, x < y ? 1 : 0); case '>': return this.val(T.int, x > y ? 1 : 0);
      case '<=': return this.val(T.int, x <= y ? 1 : 0); case '>=': return this.val(T.int, x >= y ? 1 : 0);
      case '==': return this.val(T.int, x === y ? 1 : 0); case '!=': return this.val(T.int, x !== y ? 1 : 0);
      default: throw this.rtErr("Unknown operator '" + op + "'.", line);
    }
    return this.val(ct, wrapInt(r, ct));
  }
  bitop(x, y, t, f) { const m = 2 ** t.bits; const ux = x < 0 ? x + m : x, uy = y < 0 ? y + m : y; return wrapInt(f(ux >>> 0, uy >>> 0) >>> 0, t); }
  ptrArith(op, a, b, line) {
    if (op === '-' && a.t.k === 'ptr' && b.t.k === 'ptr') return this.val(T.int, (a.v - b.v) / sizeOf(a.t.to, line));
    if (['==', '!=', '<', '>', '<=', '>='].includes(op)) {
      const x = a.v, y = b.v;
      const r = op === '==' ? x === y : op === '!=' ? x !== y : op === '<' ? x < y : op === '>' ? x > y : op === '<=' ? x <= y : x >= y;
      return this.val(T.int, r ? 1 : 0);
    }
    if ((op === '+' || op === '-') && a.t.k === 'ptr' && isInt(b.t)) return { t: a.t, v: (a.v + (op === '+' ? 1 : -1) * b.v * sizeOf(a.t.to.k === 'void' ? T.char : a.t.to, line)) & 0xFFFF };
    if (op === '+' && b.t.k === 'ptr' && isInt(a.t)) return { t: b.t, v: (b.v + a.v * sizeOf(b.t.to, line)) & 0xFFFF };
    throw this.rtErr("The operator '" + op + "' cannot be used with pointers like this.", line);
  }
  cast(x, to, line) {
    if (to.k === 'void') return { t: T.void, v: 0 };
    if (to.k === 'ptr') { if (x.t.k === 'float') throw this.rtErr('A float cannot be converted to a pointer.', line); return { t: to, v: x.v & 0xFFFF }; }
    if (x.t.k === 'ptr' && to.k === 'int') return { t: to, v: wrapInt(x.v, to) };
    if (!isScalar(x.t) && x.t.k !== 'void') throw this.rtErr('Cannot convert ' + typeName(x.t) + ' to ' + typeName(to) + '.', line);
    if (x.t.k === 'void') throw this.rtErr('A void value cannot be used.', line);
    return { t: to, v: conv(x.v, x.t, to) };
  }
  assignConv(x, to, line, what) {
    if (to.k === 'struct') { if (x.t !== to && !(x.t.k === 'struct' && x.t.tag === to.tag)) throw this.rtErr('Cannot assign ' + typeName(x.t) + ' to ' + typeName(to) + '.', line); return x.v; }
    if (x.t.k === 'void') throw this.rtErr('A void value (for example the result of a void function) cannot be ' + (what || 'assigned') + '.', line);
    if (to.k === 'ptr') {
      if (x.t.k === 'ptr' || isInt(x.t)) return x.v & 0xFFFF;
      throw this.rtErr('Cannot assign ' + typeName(x.t) + ' to a pointer.', line);
    }
    if (x.t.k === 'ptr' && isInt(to)) return wrapInt(x.v, to);
    if (x.t.k === 'struct') throw this.rtErr('Cannot assign a struct to ' + typeName(to) + '.', line);
    return conv(x.v, x.t, to);
  }
  eval(e) {
    switch (e.k) {
      case 'num': return { t: e.t, v: e.v };
      case 'str': return { t: ptr(T.char), v: this.strAddr(e), arrN: e.bytes.length + 1 };
      case 'id': {
        const v = this.lookup(e.name, e.line);
        if (v.fn) return { t: { k: 'fnref' }, v: 0, fname: e.name };
        return this.rv(v, e.name);
      }
      case 'index': case 'deref': case 'member': return this.rv(this.lval(e));
      case 'addr': {
        if (e.e.k === 'id') { const v = this.lookup(e.e.name, e.line); if (v.fn) throw this.rtErr('Pointers to functions are not supported.', e.line); if (v.bit !== undefined) throw this.rtErr('The address of a single bit cannot be taken.', e.line); return { t: ptr(v.t.k === 'arr' ? v.t : v.t), v: v.addr }; }
        const lv = this.lval(e.e);
        if (lv.bit !== undefined) throw this.rtErr('The address of a single bit cannot be taken.', e.line);
        return { t: ptr(lv.t), v: lv.addr };
      }
      case 'unary': {
        const x = this.eval(e.e);
        if (e.op === '!') return this.val(T.int, this.truth(x) ? 0 : 1);
        if (!isArith(x.t)) throw this.rtErr("The operator '" + e.op + "' needs a number.", e.line);
        if (x.t.k === 'float') { if (e.op === '~') throw this.rtErr('~ works only with integers.', e.line); return this.val(T.float, e.op === '-' ? Math.fround(-x.v) : x.v); }
        const pt = promote(x.t), v = conv(x.v, x.t, pt);
        if (e.op === '-') return this.val(pt, wrapInt(-v, pt));
        if (e.op === '+') return this.val(pt, v);
        return this.val(pt, this.bitop(v, 0, pt, (p) => ~p));
      }
      case 'bin': {
        if (e.op === '&&') { const a = this.eval(e.a); if (!this.truth(a)) return this.val(T.int, 0); return this.val(T.int, this.truth(this.eval(e.b)) ? 1 : 0); }
        if (e.op === '||') { const a = this.eval(e.a); if (this.truth(a)) return this.val(T.int, 1); return this.val(T.int, this.truth(this.eval(e.b)) ? 1 : 0); }
        const a = this.eval(e.a), b = this.eval(e.b);
        if (a.struct || b.struct) throw this.rtErr('Structs cannot be used with the operator ' + e.op + '.', e.line);
        return this.arith(e.op, a, b, e.line);
      }
      case 'assign': {
        const lv = this.lval(e.a);
        if (lv.t.k === 'arr') throw this.rtErr('An array cannot be assigned as a whole. Copy it element by element (or use strcpy for strings).', e.line);
        let r;
        if (e.op === '=') r = this.eval(e.b);
        else {
          const cur = this.rv(lv);
          r = this.arith(e.op.slice(0, -1), cur, this.eval(e.b), e.line);
        }
        const v = this.assignConv(r, lv.t, e.line);
        this.setL(lv, v, e.line);
        return this.rv(lv);
      }
      case 'preinc': case 'postinc': {
        const lv = this.lval(e.e);
        const cur = this.rv(lv);
        if (!isScalar(cur.t)) throw this.rtErr(e.op + ' needs a number or a pointer.', e.line);
        const one = { t: T.int, v: 1 };
        const nv = this.arith(e.op === '++' ? '+' : '-', cur, one, e.line);
        this.setL(lv, this.assignConv(nv, lv.t, e.line), e.line);
        return e.k === 'preinc' ? this.rv(lv) : cur;
      }
      case 'cond': return this.truth(this.eval(e.c)) ? this.eval(e.a) : this.eval(e.b);
      case 'comma': this.eval(e.a); return this.eval(e.b);
      case 'cast': {
        const x = this.eval(e.e);
        if (x.t.k === 'fnref') throw this.rtErr('Function pointers are not supported.', e.line);
        return this.cast(x, e.t, e.line);
      }
      case 'sizeoft': return this.val(T.uint, sizeOf(e.t, e.line));
      case 'sizeofe': {
        const t = this.typeOf(e.e);
        return this.val(T.uint, sizeOf(t, e.line));
      }
      case 'call': return this.call(e);
      case 'initlist': throw this.rtErr('A { } list can only be used to initialise an array or a struct.', e.line);
    }
    throw this.rtErr('Unknown expression.', e.line);
  }
  typeOf(e) {
    if (e.k === 'id') { const v = this.lookup(e.name, e.line); return v.t; }
    if (e.k === 'str') return arr(T.char, e.bytes.length + 1);
    if (e.k === 'index' || e.k === 'member' || e.k === 'deref') { try { return this.lval(e).t; } catch (x) { if (x instanceof CError) throw x; } }
    const save = this.steps; const v = this.eval(e); this.steps = save;
    return v.t;
  }
  /* ---------- calls ---------- */
  call(e) {
    if (e.f.k !== 'id') throw this.rtErr('Only named functions can be called.', e.line);
    const name = e.f.name;
    const fn = this.prog.fns[name];
    const args = e.args.map(a => this.eval(a));
    if (fn) return this.callFn(fn, args, e.line);
    if (this.prog.protos[name] && !BUILTIN_HDR[name]) throw this.rtErr("The function '" + name + "' is declared but never defined (its body { } is missing).", e.line);
    const b = BUILTINS[name];
    if (!b) throw this.rtErr("Unknown function '" + name + "'.", e.line);
    return b.call(this, args, e);
  }
  callFn(fn, args, line) {
    const ctx = this.inIsr ? 'isr' : 'main';
    if (this.calls.some(c => c.fn === fn && c.ctx === ctx)) throw this.rtErr("Recursion: '" + fn.name + "' calls itself (directly or through other functions). XC8 cannot compile recursive functions for the PIC16F887, because the PIC16 has no software stack.", line);
    if (this.calls.length > 8 && !this.opts.noStackLimit) throw this.rtErr('Stack overflow: more than 8 nested function calls. The PIC16F887 hardware stack has only 8 levels (the interrupt also uses one).', line);
    const ps = fn.t.params;
    if (!fn.t.variadic && args.length !== ps.length) throw this.rtErr("The function '" + fn.name + "' expects " + ps.length + ' argument' + (ps.length === 1 ? '' : 's') + ' but ' + args.length + (args.length === 1 ? ' was' : ' were') + ' given.', line);
    const saveScope = this.scope, saveSp = this.sp, saveLine = this.curLine;
    this.calls.push({ fn, ctx });
    this.scope = { vars: Object.create(null), parent: null };
    this.advance(2);
    ps.forEach((pt, i) => {
      const a = this.salloc(sizeOf(pt, line));
      const v = this.assignConv(args[i], pt, line, 'passed');
      if (pt.k === 'struct') { for (let k = 0; k < pt.size; k++) this.bytes[a + k] = this.rd8(v + k); } else this.store(pt, a, v);
      if (fn.t.pnames[i]) this.scope.vars[fn.t.pnames[i]] = { t: pt, addr: a };
    });
    this.retVal = undefined;
    let r;
    try { r = this.exec(fn.body); }
    finally { this.calls.pop(); this.scope = saveScope; this.sp = saveSp; this.curLine = saveLine; }
    this.advance(2);
    const rt = fn.t.ret;
    if (rt.k === 'void') return { t: T.void, v: 0 };
    if (r !== RET || this.retVal === undefined) {
      if (fn.name === 'main') return { t: T.int, v: 0 };
      this.warn.push("The function '" + fn.name + "' ended without returning a value.");
      return { t: rt, v: 0 };
    }
    const rv = this.retVal; this.retVal = undefined;
    return { t: rt, v: this.assignConv(rv, rt, line, 'returned') };
  }
  salloc(size) { const a = this.sp; this.sp += Math.max(1, size); if (this.sp > STACK_END) throw this.rtErr('Out of memory for local variables.'); if (this.sp > this.maxSp) this.maxSp = this.sp; return a; }
  /* ---------- declarations ---------- */
  declare(d, global) {
    let t = d.t;
    if (t.k === 'arr' && t.n == null) {
      if (d.init && d.init.k === 'initlist') t = arr(t.of, d.init.items.length);
      else if (d.init && d.init.k === 'str') t = arr(t.of, d.init.bytes.length + 1);
      else throw this.rtErr("The size of the array '" + d.name + "' is missing.", d.line);
    }
    const size = sizeOf(t, d.line);
    let addr;
    if (global || d.storage === 'static') {
      if (d.storage === 'static' && !global) {
        const s = this.statics.get(d);
        if (s) { this.scope.vars[d.name] = s; return; }
      }
      addr = this.galloc(size);
    } else addr = this.salloc(size);
    const v = { t, addr };
    if (global) { if (this.globals[d.name] && !d.extern) throw this.rtErr("The global variable '" + d.name + "' is declared twice.", d.line); this.globals[d.name] = v; }
    else { if (Object.prototype.hasOwnProperty.call(this.scope.vars, d.name) && this.scope.vars[d.name].blk === this.scope) throw this.rtErr("The variable '" + d.name + "' is declared twice in the same block.", d.line); v.blk = this.scope; this.scope.vars[d.name] = v; }
    if (d.storage === 'static' && !global) this.statics.set(d, v);
    if (global || d.storage === 'static') { for (let i = 0; i < size; i++) this.bytes[addr + i] = 0; }
    if (d.init) { this.initing = true; try { this.initVar(t, addr, d.init, d.line); } finally { this.initing = false; } }
  }
  initVar(t, addr, init, line) {
    if (t.k === 'arr') {
      if (init.k === 'str') {
        if (!(isInt(t.of) && t.of.bits === 8)) throw this.rtErr('Only a char array can be initialised with a string.', line);
        if (init.bytes.length > t.n) throw this.rtErr('The string "' + init.bytes.map(c => String.fromCharCode(c)).join('') + '" (' + init.bytes.length + ' characters) does not fit in an array of ' + t.n + ' chars.', line);
        for (let i = 0; i < t.n; i++) this.bytes[addr + i] = i < init.bytes.length ? init.bytes[i] : 0;
        return;
      }
      if (init.k !== 'initlist') throw this.rtErr('An array must be initialised with a { } list.', line);
      if (init.items.length > t.n) throw this.rtErr('Too many values in the { } list: the array has room for ' + t.n + '.', line);
      const es = sizeOf(t.of, line);
      for (let i = 0; i < t.n; i++) { if (i < init.items.length) this.initVar(t.of, addr + i * es, init.items[i], line); else for (let k = 0; k < es; k++) this.bytes[addr + i * es + k] = 0; }
      return;
    }
    if (t.k === 'struct') {
      if (init.k !== 'initlist') { const x = this.eval(init); const src = this.assignConv(x, t, line); for (let i = 0; i < t.size; i++) this.wr8(addr + i, this.rd8(src + i)); return; }
      const fs = t.union ? t.fields.slice(0, 1) : t.fields;
      if (init.items.length > fs.length) throw this.rtErr('Too many values in the { } list for ' + typeName(t) + '.', line);
      fs.forEach((f, i) => { if (i < init.items.length) this.initVar(f.t, addr + f.off, init.items[i], line); });
      return;
    }
    if (init.k === 'initlist') { if (init.items.length !== 1) throw this.rtErr('A single variable is initialised with one value, not a { } list.', line); init = init.items[0]; }
    const x = this.eval(init);
    this.store(t, addr, this.assignConv(x, t, line));
  }
  /* ---------- statements ---------- */
  exec(s) {
    switch (s.k) {
      case 'block': {
        const saveScope = this.scope, saveSp = this.sp;
        this.scope = { vars: Object.create(this.scope.vars), parent: null };
        try {
          const items = s.items;
          for (let i = 0; i < items.length; i++) {
            const r = this.exec(items[i]);
            if (r) {
              if (r === CASEJUMP) continue;
              return r;
            }
          }
        } finally { this.scope = saveScope; this.sp = saveSp; }
        return undefined;
      }
      case 'decl': this.step(s.line); s.decls.forEach(d => this.declare(d, false)); return undefined;
      case 'expr': this.step(s.line); this.eval(s.e); return undefined;
      case 'empty': this.step(s.line); return undefined;
      case 'if': this.step(s.line); if (this.truth(this.eval(s.c))) return this.exec(s.a); if (s.b) return this.exec(s.b); return undefined;
      case 'while':
        for (;;) {
          this.step(s.line);
          if (!this.truth(this.eval(s.c))) return undefined;
          const r = this.exec(s.body);
          if (r === BRK) return undefined;
          if (r === RET) return r;
        }
      case 'dowhile':
        for (;;) {
          const r = this.exec(s.body);
          if (r === BRK) return undefined;
          if (r === RET) return r;
          this.step(s.line);
          if (!this.truth(this.eval(s.c))) return undefined;
        }
      case 'for': {
        const saveScope = this.scope, saveSp = this.sp;
        this.scope = { vars: Object.create(this.scope.vars), parent: null };
        try {
          if (s.init) this.exec(s.init);
          for (;;) {
            this.step(s.line);
            if (s.c && !this.truth(this.eval(s.c))) return undefined;
            const r = this.exec(s.body);
            if (r === BRK) return undefined;
            if (r === RET) return r;
            if (s.step) this.eval(s.step);
          }
        } finally { this.scope = saveScope; this.sp = saveSp; }
      }
      case 'switch': {
        this.step(s.line);
        const x = this.eval(s.e);
        if (!isInt(x.t)) throw this.rtErr('switch needs an integer value (for example an int or a char).', s.line);
        const v = conv(x.v, x.t, promote(x.t));
        const body = s.body.k === 'block' ? s.body.items : [s.body];
        let start = body.findIndex(it => it.k === 'case' && it.v === v);
        if (start < 0) start = body.findIndex(it => it.k === 'default');
        if (start < 0) return undefined;
        const saveScope = this.scope, saveSp = this.sp;
        this.scope = { vars: Object.create(this.scope.vars), parent: null };
        try {
          for (let i = start; i < body.length; i++) {
            const it = body[i];
            if (it.k === 'case' || it.k === 'default') continue;
            const r = this.exec(it);
            if (r === BRK) return undefined;
            if (r) return r;
          }
        } finally { this.scope = saveScope; this.sp = saveSp; }
        return undefined;
      }
      case 'case': case 'default': return undefined;
      case 'break': this.step(s.line); return BRK;
      case 'continue': this.step(s.line); return CONT;
      case 'return': this.step(s.line); this.retVal = s.e ? this.eval(s.e) : undefined; return RET;
    }
    throw this.rtErr('Unknown statement.', s.line);
  }
  /* ---------- start ---------- */
  initGlobals() {
    this.scope = { vars: Object.create(null), parent: null };
    this.prog.globals.forEach(g => this.declare(g, true));
    this.globalsEnd = this.gptr;
  }
}
const BRK = 'break', CONT = 'continue', RET = 'return', CASEJUMP = 'case';

/* ======================= library ======================= */
function fmtNum(v, conv, flags, width, prec) {
  let s;
  const neg = v < 0;
  switch (conv) {
    case 'd': case 'i': case 'u': s = String(Math.abs(v)); if (prec !== null) s = s.padStart(prec, '0'); break;
    case 'x': s = v.toString(16); if (prec !== null) s = s.padStart(prec, '0'); break;
    case 'X': s = v.toString(16).toUpperCase(); if (prec !== null) s = s.padStart(prec, '0'); break;
    case 'o': s = v.toString(8); break;
    case 'f': case 'F': s = Math.abs(v).toFixed(prec === null ? 6 : prec); break;
    case 'e': case 'E': s = Math.abs(v).toExponential(prec === null ? 6 : prec).replace(/e([+-])(\d)$/, 'e$10$2'); if (conv === 'E') s = s.toUpperCase(); break;
    case 'g': case 'G': { const p = prec === null ? 6 : (prec || 1); s = String(Number(Math.abs(v).toPrecision(p))); break; }
  }
  let sign = neg && conv !== 'u' && conv !== 'x' && conv !== 'X' && conv !== 'o' ? '-' : (flags.includes('+') ? '+' : flags.includes(' ') ? ' ' : '');
  if (flags.includes('#') && (conv === 'x' || conv === 'X') && v !== 0) sign += conv === 'x' ? '0x' : '0X';
  let body = sign + s;
  if (width && body.length < width) {
    if (flags.includes('-')) body = body.padEnd(width, ' ');
    else if (flags.includes('0') && prec === null) body = sign + s.padStart(width - sign.length, '0');
    else body = body.padStart(width, ' ');
  }
  return body;
}
function format(rt, fmt, args, line) {
  let out = '', ai = 0;
  const next = (what) => { if (ai >= args.length) throw rt.rtErr('printf: the format "' + fmt + '" needs more values than were given (missing value for ' + what + ').', line); return args[ai++]; };
  for (let i = 0; i < fmt.length; i++) {
    const c = fmt[i];
    if (c !== '%') { out += c; continue; }
    const m = /^%([-+ 0#]*)(\*|\d+)?(?:\.(\*|\d+))?(hh|h|ll|l|L|z)?([diuxXofFeEgGcsp%])/.exec(fmt.slice(i));
    if (!m) throw rt.rtErr('printf: unknown format "' + fmt.slice(i, i + 3) + '". Use %d for int, %ld for long, %u for unsigned, %x for hexadecimal, %c for a character, %s for a string and %f for float.', line);
    i += m[0].length - 1;
    const flags = m[1] || '';
    let width = m[2] === '*' ? next('*').v : (m[2] ? +m[2] : 0);
    let prec = m[3] === undefined ? null : (m[3] === '*' ? next('.*').v : +m[3]);
    const len = m[4] || '', cv = m[5];
    if (cv === '%') { out += '%'; continue; }
    const a = next('%' + cv);
    if (cv === 's') {
      if (a.t.k !== 'ptr') throw rt.rtErr('printf: %s needs a string (a char array or a char pointer), but the value is ' + typeName(a.t) + '. To print a number use %d.', line);
      let s = rt.readStr(a.v); if (prec !== null) s = s.slice(0, prec);
      out += width ? (flags.includes('-') ? s.padEnd(width) : s.padStart(width)) : s; continue;
    }
    if (cv === 'c') { const s = String.fromCharCode(conv(a.v, a.t, T.uchar)); out += width ? (flags.includes('-') ? s.padEnd(width) : s.padStart(width)) : s; continue; }
    if (cv === 'p') { out += '0x' + (a.v & 0xFFFF).toString(16).toUpperCase().padStart(4, '0'); continue; }
    if ('fFeEgG'.includes(cv)) {
      if (a.t.k !== 'float') throw rt.rtErr('printf: %' + cv + ' needs a float value, but the value is ' + typeName(a.t) + '. Use %d for integers, or convert with (float).', line);
      out += fmtNum(a.v, cv, flags, width, prec); continue;
    }
    if (a.t.k === 'float') throw rt.rtErr('printf: %' + len + cv + ' needs an integer, but the value is a float. Use %f to print a float.', line);
    if (a.t.k === 'ptr' && a.arrN != null) rt.warn.push('printf: a string was printed with %' + cv + ' (use %s).');
    const isLong = len === 'l' || len === 'll';
    if (!isLong && isInt(a.t) && a.t.bits === 32 && !rt.warnedLong) { rt.warnedLong = true; rt.warn.push('printf: a long value was printed with %' + cv + '. On XC8 an int is only 16 bits, so use %l' + cv + ' for long values.'); }
    const t = (cv === 'd' || cv === 'i') ? (isLong ? T.long : T.int) : (isLong ? T.ulong : T.uint);
    let v = conv(a.v, a.t.k === 'ptr' ? T.uint : a.t, t);
    if (len === 'hh') v = (cv === 'd' || cv === 'i') ? wrapInt(v, T.schar) : wrapInt(v, T.uchar);
    out += fmtNum(v, cv, flags, width, prec);
  }
  if (ai < args.length) rt.warn.push('printf: more values were given than the format "' + fmt + '" uses.');
  return out;
}
function fits(rt, a, s, fn, line) { if (a.arrN != null && s.length + 1 > a.arrN) throw rt.rtErr(fn + ': the text "' + s + '" needs ' + (s.length + 1) + ' bytes (with the final \\0) but the array has only ' + a.arrN + '.', line); }
function writeStr(rt, addr, s) { for (let i = 0; i < s.length; i++) rt.wr8(addr + i, s.charCodeAt(i)); rt.wr8(addr + s.length, 0); }
function needPtr(rt, a, fn, line) { if (!a || a.t.k !== 'ptr') throw rt.rtErr(fn + ' needs a string (a char array or pointer) here.', line); if (!a.v) throw rt.rtErr(fn + ': NULL pointer.', line); return a.v; }
function argc(rt, args, n, fn, line) { if (args.length !== n) throw rt.rtErr(fn + ' expects ' + n + ' argument' + (n === 1 ? '' : 's') + ' but ' + args.length + ' were given.', line); }
const num = (rt, a, line) => { if (!a || !isArith(a.t)) throw rt.rtErr('A number was expected.', line); return a.v; };
const fval = (v) => ({ t: T.float, v: Math.fround(v) });
const ival = (v) => ({ t: T.int, v: wrapInt(v, T.int) });
const BUILTINS = {
  printf(args, e) {
    if (!args.length || args[0].t.k !== 'ptr') throw this.rtErr('printf needs a format string in double quotes, for example printf("%d\\n", x);', e.line);
    const s = format(this, this.readStr(args[0].v), args.slice(1), e.line);
    this.emit(s); return ival(s.length);
  },
  sprintf(args, e) { const dst = needPtr(this, args[0], 'sprintf', e.line); const s = format(this, this.readStr(needPtr(this, args[1], 'sprintf', e.line)), args.slice(2), e.line); fits(this, args[0], s, 'sprintf', e.line); writeStr(this, dst, s); return ival(s.length); },
  putchar(args, e) { argc(this, args, 1, 'putchar', e.line); this.emit(String.fromCharCode(conv(args[0].v, args[0].t, T.uchar))); return ival(args[0].v); },
  puts(args, e) { argc(this, args, 1, 'puts', e.line); this.emit(this.readStr(needPtr(this, args[0], 'puts', e.line)) + '\n'); return ival(0); },
  getchar(args) { if (this.inPos >= this.stdin.length) return ival(-1); const c = this.stdin.charCodeAt(this.inPos++); this.emit(String.fromCharCode(c), true); return ival(c); },
  scanf(args, e) {
    const fmt = this.readStr(needPtr(this, args[0], 'scanf', e.line));
    let ai = 1, count = 0;
    const startPos = this.inPos;
    const skipWs = () => { while (this.inPos < this.stdin.length && /\s/.test(this.stdin[this.inPos])) this.inPos++; };
    for (let i = 0; i < fmt.length; i++) {
      const c = fmt[i];
      if (/\s/.test(c)) { skipWs(); continue; }
      if (c !== '%') { if (this.stdin[this.inPos] === c) { this.inPos++; continue; } break; }
      const m = /^%(\d+)?(hh|h|l|L)?([diuxXcsf%])/.exec(fmt.slice(i));
      if (!m) throw this.rtErr('scanf: unknown format "' + fmt.slice(i, i + 3) + '".', e.line);
      i += m[0].length - 1;
      const cv = m[3];
      if (cv === '%') { skipWs(); if (this.stdin[this.inPos] === '%') this.inPos++; continue; }
      const dst = args[ai++];
      if (!dst || dst.t.k !== 'ptr') throw this.rtErr('scanf: every value needs the address of a variable, for example scanf("%d", &x);  (did you forget the & ?)', e.line);
      if (cv === 'c') { if (this.inPos >= this.stdin.length) break; this.store(T.char, dst.v, this.stdin.charCodeAt(this.inPos++)); count++; continue; }
      skipWs();
      if (this.inPos >= this.stdin.length) break;
      if (cv === 's') { let s = ''; while (this.inPos < this.stdin.length && !/\s/.test(this.stdin[this.inPos])) s += this.stdin[this.inPos++]; writeStr(this, dst.v, s); count++; continue; }
      const rest = this.stdin.slice(this.inPos);
      const re = cv === 'f' ? /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?/ : (cv === 'x' || cv === 'X') ? /^[-+]?(0[xX])?[0-9a-fA-F]+/ : /^[-+]?\d+/;
      const mm = re.exec(rest);
      if (!mm) break;
      this.inPos += mm[0].length;
      const tt = dst.t.to;
      if (cv === 'f') { if (tt.k !== 'float') throw this.rtErr('scanf: %f needs the address of a float variable.', e.line); this.store(tt, dst.v, Math.fround(parseFloat(mm[0]))); }
      else {
        if (!isInt(tt)) throw this.rtErr('scanf: %' + cv + ' needs the address of an integer variable' + (tt.k === 'float' ? ' (use %f for float)' : '') + '.', e.line);
        let v = (cv === 'x' || cv === 'X') ? parseInt(mm[0], 16) : parseInt(mm[0], 10);
        this.store(tt, dst.v, wrapInt(v, tt));
      }
      count++;
    }
    let consumed = this.stdin.slice(startPos, this.inPos);
    if (this.stdin[this.inPos] === '\n') { this.inPos++; consumed += '\n'; }
    this.emit(consumed, true);
    if (count === 0 && this.inPos >= this.stdin.length && startPos >= this.stdin.length) return ival(-1);
    return ival(count);
  },
  itoa(args, e) { const d = needPtr(this, args[0], 'itoa', e.line); const v = conv(args[1].v, args[1].t, T.int); const base = args[2] ? args[2].v : 10; const s = base === 10 ? String(v) : (v < 0 ? v + 65536 : v).toString(base).toUpperCase(); fits(this, args[0], s, 'itoa', e.line); writeStr(this, d, s); return { t: ptr(T.char), v: d }; },
  utoa(args, e) { const d = needPtr(this, args[0], 'utoa', e.line); writeStr(this, d, conv(args[1].v, args[1].t, T.uint).toString(args[2] ? args[2].v : 10).toUpperCase()); return { t: ptr(T.char), v: d }; },
  ltoa(args, e) { const d = needPtr(this, args[0], 'ltoa', e.line); writeStr(this, d, String(conv(args[1].v, args[1].t, T.long))); return { t: ptr(T.char), v: d }; },
  ultoa(args, e) { const d = needPtr(this, args[0], 'ultoa', e.line); writeStr(this, d, conv(args[1].v, args[1].t, T.ulong).toString(args[2] ? args[2].v : 10).toUpperCase()); return { t: ptr(T.char), v: d }; },
  atoi(args, e) { const s = this.readStr(needPtr(this, args[0], 'atoi', e.line)); const m = /^\s*([-+]?\d+)/.exec(s); return ival(m ? parseInt(m[1], 10) : 0); },
  atol(args, e) { const s = this.readStr(needPtr(this, args[0], 'atol', e.line)); const m = /^\s*([-+]?\d+)/.exec(s); return { t: T.long, v: wrapInt(m ? parseInt(m[1], 10) : 0, T.long) }; },
  abs(args, e) { argc(this, args, 1, 'abs', e.line); return ival(Math.abs(conv(args[0].v, args[0].t, T.int))); },
  labs(args, e) { argc(this, args, 1, 'labs', e.line); return { t: T.long, v: wrapInt(Math.abs(conv(args[0].v, args[0].t, T.long)), T.long) }; },
  rand() { this.rng = (Math.imul(this.rng, 1103515245) + 12345) >>> 0; return ival((this.rng >>> 16) & 0x7FFF); },
  srand(args) { this.rng = args[0] ? args[0].v >>> 0 : 1; return { t: T.void, v: 0 }; },
  strlen(args, e) { argc(this, args, 1, 'strlen', e.line); return { t: T.uint, v: this.readStr(needPtr(this, args[0], 'strlen', e.line)).length }; },
  strcpy(args, e) { const d = needPtr(this, args[0], 'strcpy', e.line); const s = this.readStr(needPtr(this, args[1], 'strcpy', e.line)); if (args[0].arrN != null && s.length + 1 > args[0].arrN) throw this.rtErr('strcpy: the string "' + s + '" (' + (s.length + 1) + ' bytes with the final \\0) does not fit in an array of ' + args[0].arrN + ' chars.', e.line); writeStr(this, d, s); return args[0]; },
  strncpy(args, e) { const d = needPtr(this, args[0], 'strncpy', e.line); const s = this.readStr(needPtr(this, args[1], 'strncpy', e.line)); const n = args[2].v; for (let i = 0; i < n; i++) this.wr8(d + i, i < s.length ? s.charCodeAt(i) : 0); return args[0]; },
  strcmp(args, e) { const a = this.readStr(needPtr(this, args[0], 'strcmp', e.line)), b = this.readStr(needPtr(this, args[1], 'strcmp', e.line)); return ival(a === b ? 0 : (a < b ? -1 : 1)); },
  strncmp(args, e) { const n = args[2].v; const a = this.readStr(needPtr(this, args[0], 'strncmp', e.line)).slice(0, n), b = this.readStr(needPtr(this, args[1], 'strncmp', e.line)).slice(0, n); return ival(a === b ? 0 : (a < b ? -1 : 1)); },
  strcat(args, e) { const d = needPtr(this, args[0], 'strcat', e.line); const a = this.readStr(d), b = this.readStr(needPtr(this, args[1], 'strcat', e.line)); if (args[0].arrN != null && a.length + b.length + 1 > args[0].arrN) throw this.rtErr('strcat: the result does not fit in the array (' + args[0].arrN + ' chars).', e.line); writeStr(this, d + a.length, b); return args[0]; },
  strncat(args, e) { const d = needPtr(this, args[0], 'strncat', e.line); const a = this.readStr(d), b = this.readStr(needPtr(this, args[1], 'strncat', e.line)).slice(0, args[2].v); writeStr(this, d + a.length, b); return args[0]; },
  strchr(args, e) { const p = needPtr(this, args[0], 'strchr', e.line); const s = this.readStr(p); const i = s.indexOf(String.fromCharCode(args[1].v & 255)); return { t: ptr(T.char), v: i < 0 ? 0 : p + i }; },
  memset(args, e) { const d = needPtr(this, args[0], 'memset', e.line); for (let i = 0; i < args[2].v; i++) this.wr8(d + i, args[1].v); return args[0]; },
  memcpy(args, e) { const d = needPtr(this, args[0], 'memcpy', e.line), s = needPtr(this, args[1], 'memcpy', e.line); for (let i = 0; i < args[2].v; i++) this.wr8(d + i, this.rd8(s + i)); return args[0]; },
  memcmp(args, e) { const a = needPtr(this, args[0], 'memcmp', e.line), b = needPtr(this, args[1], 'memcmp', e.line); for (let i = 0; i < args[2].v; i++) { const x = this.rd8(a + i), y = this.rd8(b + i); if (x !== y) return ival(x < y ? -1 : 1); } return ival(0); },
  isdigit(args) { const c = args[0].v; return ival(c >= 48 && c <= 57 ? 1 : 0); },
  isalpha(args) { const c = args[0].v; return ival((c >= 65 && c <= 90) || (c >= 97 && c <= 122) ? 1 : 0); },
  isalnum(args) { const c = args[0].v; return ival((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) ? 1 : 0); },
  isupper(args) { const c = args[0].v; return ival(c >= 65 && c <= 90 ? 1 : 0); },
  islower(args) { const c = args[0].v; return ival(c >= 97 && c <= 122 ? 1 : 0); },
  isspace(args) { const c = args[0].v; return ival([32, 9, 10, 11, 12, 13].includes(c) ? 1 : 0); },
  toupper(args) { const c = args[0].v; return ival(c >= 97 && c <= 122 ? c - 32 : c); },
  tolower(args) { const c = args[0].v; return ival(c >= 65 && c <= 90 ? c + 32 : c); },
  sqrt(args, e) { const v = num(this, args[0], e.line); if (v < 0) throw this.rtErr('sqrt of a negative number.', e.line); return fval(Math.sqrt(v)); },
  pow(args, e) { return fval(Math.pow(num(this, args[0], e.line), num(this, args[1], e.line))); },
  fabs(args, e) { return fval(Math.abs(num(this, args[0], e.line))); },
  floor(args, e) { return fval(Math.floor(num(this, args[0], e.line))); },
  ceil(args, e) { return fval(Math.ceil(num(this, args[0], e.line))); },
  round(args, e) { const v = num(this, args[0], e.line); return fval(v < 0 ? -Math.round(-v) : Math.round(v)); },
  sin(args, e) { return fval(Math.sin(num(this, args[0], e.line))); }, cos(args, e) { return fval(Math.cos(num(this, args[0], e.line))); }, tan(args, e) { return fval(Math.tan(num(this, args[0], e.line))); },
  log(args, e) { return fval(Math.log(num(this, args[0], e.line))); }, log10(args, e) { return fval(Math.log10(num(this, args[0], e.line))); }, exp(args, e) { return fval(Math.exp(num(this, args[0], e.line))); },
  fmod(args, e) { return fval(num(this, args[0], e.line) % num(this, args[1], e.line)); },
  _delay(args, e) { argc(this, args, 1, '_delay', e.line); this.delay(num(this, args[0], e.line)); return { t: T.void, v: 0 }; },
  _nop() { this.advance(1); return { t: T.void, v: 0 }; },
  _clrwdt() { this.advance(1); return { t: T.void, v: 0 }; },
  _sleep() { throw STOP; },
  lcd_begin() { const L = this.m.lcd; L.used = true; L.mode8 = false; L.on = true; L.ddram.fill(32); L.addr = 0; this.delay(25000); return { t: T.void, v: 0 }; },
  lcd_clear() { const L = this.m.lcd; L.used = true; L.ddram.fill(32); L.addr = 0; this.delay(2000); return { t: T.void, v: 0 }; },
  lcd_home() { this.m.lcd.addr = 0; this.delay(2000); return { t: T.void, v: 0 }; },
  lcd_cmd(args) { const c = args[0].v & 255; const L = this.m.lcd; L.used = true; if (c & 0x80) L.addr = c & 0x7F; else if (c === 1) { L.ddram.fill(32); L.addr = 0; } this.delay(2000); return { t: T.void, v: 0 }; },
  lcd_write(args) { const L = this.m.lcd; L.used = true; L.ddram[L.addr & 0x7F] = args[0].v & 255; L.addr = (L.addr + 1) & 0x7F; this.delay(50); return { t: T.void, v: 0 }; },
  lcd_print(args, e) { const L = this.m.lcd; L.used = true; L.addr = (args[0].v & 0x7F); const s = this.readStr(needPtr(this, args[1], 'lcd_print', e.line)); for (const ch of s) { L.ddram[L.addr & 0x7F] = ch.charCodeAt(0); L.addr = (L.addr + 1) & 0x7F; } this.delay(2000 + 50 * s.length); return { t: T.void, v: 0 }; },
  USART_SEND_CHAR(args) { uartSend(this, args[0].v & 255); return { t: T.void, v: 0 }; },
  USART_SEND(args, e) { const p = needPtr(this, args[0], 'USART_SEND', e.line); for (let i = 0; i < 200; i++) { const c = this.rd8(p + i); if (!c) break; uartSend(this, c); if (c === 13) break; } return { t: T.void, v: 0 }; },
  USART_SEND_NEW_LINE() { uartSend(this, 10); uartSend(this, 13); return { t: T.void, v: 0 }; }
};
function uartSend(rt, c) {
  const m = rt.m;
  if (!((m.ram[0x98] & 0x20) && (m.ram[0x18] & 0x80))) { if (!rt.warnedUart) { rt.warn.push('USART_SEND: the serial port is not enabled (TXEN and SPEN must be 1), so nothing was sent.'); rt.warnedUart = true; } return; }
  let guard = 0;
  while (!(m.ram[0x0C] & 0x10) && guard++ < 100000) rt.advance(4);
  P.writeAbs(m, 0x19, c);
  rt.advance(4);
}

/* ======================= public API ======================= */
function run(src, opts) {
  opts = opts || {};
  const res = { ok: false, errors: [], warnings: [], out: '', segments: [], halted: null, m: null, rt: null, ret: undefined };
  let prog;
  try { prog = compile(src, opts); }
  catch (e) { if (e instanceof CError) { res.errors.push({ line: e.line, msg: e.message, kind: 'compile' }); return res; } throw e; }
  res.warnings = prog.warnings.slice();
  if (!opts.call && !prog.fns.main) { res.errors.push({ line: 0, msg: 'The program has no main function. Every C program starts in main: void main(void) { ... } (XC8) or int main(void) { ... }.', kind: 'compile' }); return res; }
  const rt = new Runtime(prog, opts);
  res.rt = rt; res.m = rt.m; res.prog = prog;
  Object.keys(opts.init || {}).forEach(k => { const v = opts.init[k]; if (k === 'pins') Object.keys(v).forEach(p => P.setPins(rt.m, p, v[p])); else if (k === 'analog') Object.keys(v).forEach(ch => { rt.m.analog[+ch] = v[ch]; }); else if (k === 'vrefP') rt.m.vrefP = v; else if (k === 'vrefM') rt.m.vrefM = v; });
  try {
    rt.initGlobals();
    if (opts.setGlobals) Object.keys(opts.setGlobals).forEach(n => { const g = rt.globals[n]; if (g) rt.store(g.t, g.addr, opts.setGlobals[n]); });
    if (opts.call) {
      const fn = prog.fns[opts.call];
      if (!fn) throw new CError("The function '" + opts.call + "' is missing. The tests call a function with this exact name.", 0, 'compile');
      const args = (opts.args || []).map((a, i) => {
        const pt = fn.t.params[i];
        if (typeof a === 'string' && pt && pt.k === 'ptr') { const node = { bytes: Array.from(a).map(c => c.charCodeAt(0) & 255) }; const ad = rt.galloc(node.bytes.length + 1); node.bytes.forEach((b, k) => { rt.bytes[ad + k] = b; }); rt.bytes[ad + node.bytes.length] = 0; return { t: ptr(T.char), v: ad }; }
        if (Array.isArray(a) && pt && pt.k === 'ptr') { const es = sizeOf(pt.to); const ad = rt.galloc(a.length * es); a.forEach((x, k) => rt.store(pt.to, ad + k * es, wrapInt(x, pt.to))); res.argArrays = res.argArrays || []; res.argArrays[i] = { addr: ad, n: a.length, t: pt.to }; return { t: pt, v: ad, arrN: a.length }; }
        return { t: typeof a === 'number' && !Number.isInteger(a) ? T.float : T.long, v: a };
      });
      const r = rt.callFn(fn, args, fn.line);
      res.ret = r.t.k === 'ptr' && opts.retString ? rt.readStr(r.v) : r.v;
      res.retType = r.t;
      if (res.argArrays) res.arrays = res.argArrays.map(x => x ? Array.from({ length: x.n }, (_, k) => rt.load(x.t, x.addr + k * sizeOf(x.t))) : null);
      res.halted = 'return';
    } else {
      const r = rt.callFn(prog.fns.main, [], prog.fns.main.line);
      res.exitCode = r.v; res.halted = 'end';
    }
  } catch (e) {
    if (e === STOP) res.halted = rt.steps > rt.maxSteps ? 'limit' : (rt.m.cycles > rt.maxCycles ? 'cycles' : 'sleep');
    else if (e instanceof CError) { res.errors.push({ line: e.line, msg: e.message, kind: e.kind }); res.halted = 'error'; }
    else if (e instanceof RangeError) { res.errors.push({ line: rt.curLine, msg: 'The program ran out of stack (too deep nesting).', kind: 'runtime' }); res.halted = 'error'; }
    else throw e;
  }
  for (let g = 0; g < 60 && (rt.m.txLeft > 0 || rt.m.txBuf !== null); g++) P.uartTick(rt.m, 1000000);
  res.out = rt.segments.filter(s => !s.input).map(s => s.text).join('');
  res.segments = rt.segments;
  res.term = rt.m.console;
  res.warnings = res.warnings.concat(rt.warn.map(w => ({ line: 0, msg: w })));
  res.ok = !res.errors.length;
  res.ramUsed = ((rt.globalsEnd || GLOBAL_BASE) - GLOBAL_BASE) + (rt.maxSp - STACK_BASE);
  res.get = P.getter(rt.m, {});
  res.global = (name) => { const g = rt.globals[name]; if (!g) return undefined; if (g.t.k === 'arr') { const es = sizeOf(g.t.of); if (isInt(g.t.of) && g.t.of.bits === 8) return rt.readStr(g.addr, g.t.n); return Array.from({ length: g.t.n }, (_, k) => rt.load(g.t.of, g.addr + k * es)); } return rt.load(g.t, g.addr); };
  res.globalNames = () => Object.keys(rt.globals);
  res.globalType = (name) => rt.globals[name] && typeName(rt.globals[name].t);
  return res;
}
function check(src, opts) { try { compile(src, opts); return null; } catch (e) { if (e instanceof CError) return { line: e.line, msg: e.message }; throw e; } }

root.CInterp = { run, compile, check, preprocess, lex, CError, T, typeName, sizeOf };
})(typeof window !== 'undefined' ? window : globalThis);
