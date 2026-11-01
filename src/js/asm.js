/* PIC16F887 assembler and CPU for the course (pic-as syntax as used in the lecture activities).
   All 35 mid-range instructions are implemented with their flags and cycle counts.
   Directives understood: #include (ignored), CONFIG / PSECT / PROCESSOR / END (ignored), EQU, #define, ORG, BANKSEL.
   Expressions: numbers in every lecture format, labels, $, + - * / % << >> & | ^ ~, HIGH(), LOW(), BANKMASK(). */
(function (root) {
'use strict';
const P = root.PIC;
const { SFR, BITS } = P;

/* ---------- numbers and expressions ---------- */
function parseNumber(t) {
  t = String(t).trim();
  let m;
  if ((m = /^0[xX]([0-9a-fA-F]+)$/.exec(t))) return parseInt(m[1], 16);
  if ((m = /^[hH]'([0-9a-fA-F]+)'$/.exec(t))) return parseInt(m[1], 16);
  if ((m = /^[bB]'([01]+)'$/.exec(t))) return parseInt(m[1], 2);
  if ((m = /^[dD]'([0-9]+)'$/.exec(t))) return parseInt(m[1], 10);
  if ((m = /^[oO]'([0-7]+)'$/.exec(t))) return parseInt(m[1], 8);
  if ((m = /^0[bB]([01]+)$/.exec(t))) return parseInt(m[1], 2);
  if ((m = /^([0-9][0-9a-fA-F]*)[hH]$/.exec(t))) return parseInt(m[1], 16);
  if ((m = /^([01]+)[bB]$/.exec(t))) return parseInt(m[1], 2);
  if ((m = /^([0-9]+)[dD]?$/.exec(t))) return parseInt(m[1], 10);
  if ((m = /^'(.)'$/.exec(t))) return m[1].charCodeAt(0);
  return null;
}
const TOK = /\s*(0[xX][0-9a-fA-F]+|[hHbBdDoO]'[0-9a-fA-F]+'|0[bB][01]+|[0-9][0-9a-fA-F]*[hH]\b|[01]+[bB]\b|[0-9]+[dD]?\b|'[^']'|[A-Za-z_][A-Za-z0-9_]*|<<|>>|[-+*\/%&|^~()$,])/y;
function tokenize(s) {
  const out = []; let pos = 0;
  s = s.trim();
  while (pos < s.length) {
    TOK.lastIndex = pos;
    const m = TOK.exec(s);
    if (!m) throw new Error("I can't read '" + s.slice(pos).trim() + "'");
    out.push(m[1]); pos = TOK.lastIndex;
    while (pos < s.length && /\s/.test(s[pos])) pos++;
  }
  return out;
}
function evalExpr(str, env) {
  const toks = tokenize(str); let i = 0;
  const peek = () => toks[i];
  const FUNCS = { HIGH: v => (v >> 8) & 255, LOW: v => v & 255, BANKMASK: v => v & 0x7F, PAGEMASK: v => v & 0x7FF };
  function prim() {
    const t = toks[i++];
    if (t === undefined) throw new Error('a value is missing');
    if (t === '(') { const v = or(); if (toks[i++] !== ')') throw new Error("a ')' is missing"); return v; }
    if (t === '$') return env.dollar;
    const n = parseNumber(t);
    if (n !== null) return n;
    if (/^[A-Za-z_]/.test(t)) {
      const fu = t.toUpperCase();
      if (FUNCS[fu] && toks[i] === '(') { i++; const v = or(); if (toks[i++] !== ')') throw new Error("a ')' is missing after " + t + '('); return FUNCS[fu](v); }
      return env.sym(t);
    }
    throw new Error("unexpected '" + t + "'");
  }
  function unary() {
    const t = peek();
    if (t === '-') { i++; return -unary(); }
    if (t === '+') { i++; return unary(); }
    if (t === '~') { i++; return ~unary(); }
    return prim();
  }
  function mul() { let v = unary(); while (['*', '/', '%'].includes(peek())) { const o = toks[i++]; const r = unary(); if ((o === '/' || o === '%') && r === 0) throw new Error('division by zero'); v = o === '*' ? v * r : o === '/' ? Math.trunc(v / r) : v % r; } return v; }
  function add() { let v = mul(); while (['+', '-'].includes(peek())) { const o = toks[i++]; const r = mul(); v = o === '+' ? v + r : v - r; } return v; }
  function shift() { let v = add(); while (['<<', '>>'].includes(peek())) { const o = toks[i++]; const r = add(); v = o === '<<' ? v << r : v >> r; } return v; }
  function and() { let v = shift(); while (peek() === '&') { i++; v &= shift(); } return v; }
  function xor() { let v = and(); while (peek() === '^') { i++; v ^= and(); } return v; }
  function or() { let v = xor(); while (peek() === '|') { i++; v |= xor(); } return v; }
  const v = or();
  if (i < toks.length) throw new Error("unexpected '" + toks[i] + "'");
  return v;
}

/* ---------- instruction table (the 35 instructions of the PIC16 mid-range) ---------- */
const INS = {
  MOVLW: 'k', ADDLW: 'k', SUBLW: 'k', ANDLW: 'k', IORLW: 'k', XORLW: 'k', RETLW: 'k',
  MOVWF: 'f', CLRF: 'f', CLRW: '-',
  ADDWF: 'fd', SUBWF: 'fd', ANDWF: 'fd', IORWF: 'fd', XORWF: 'fd',
  INCF: 'fd', DECF: 'fd', COMF: 'fd', SWAPF: 'fd', INCFSZ: 'fd', DECFSZ: 'fd', MOVF: 'fd', RLF: 'fd', RRF: 'fd',
  BSF: 'fb', BCF: 'fb', BTFSS: 'fb', BTFSC: 'fb',
  GOTO: 'a', CALL: 'a', RETURN: '-', RETFIE: '-', NOP: '-', CLRWDT: '-', SLEEP: '-'
};
const ALIAS = { SWAP: 'SWAPF' };
const IGNORED_DIRECTIVES = /^(PSECT|CONFIG\d*|__CONFIG|GLOBAL|PROCESSOR|RADIX|LIST|NOLIST|INCLUDE|END|DELTA|SIGNAT|EXTRN|PAGESEL|ERRORLEVEL|TITLE|SUBTITLE)\b/i;

function stripComment(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === q) q = null; }
    else if (c === "'" || c === '"') { if (c === "'" && /[hHbBdDoO]$/.test(line.slice(0, i)) && /^[hHbBdDoO]'[0-9a-fA-F]*'/.test(line.slice(i - 1))) { const e = line.indexOf("'", i + 1); if (e > 0) { i = e; continue; } } q = c; }
    else if (c === ';') return line.slice(0, i);
  }
  return line;
}
function splitTop(s) {
  const out = []; let depth = 0, cur = '', q = null;
  for (const c of s) {
    if (q) { cur += c; if (c === q) q = null; continue; }
    if (c === "'") { q = c; cur += c; continue; }
    if (c === '(') depth++; if (c === ')') depth--;
    if (c === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += c;
  }
  if (cur.trim() !== '' || out.length) out.push(cur.trim());
  return out;
}
function bankOf(addr) { return (P.canon(addr) >> 7) & 3; }

/* ---------- assembler ---------- */
function assemble(src) {
  const errors = [], prog = [], labels = {}, equs = {}, macros = {};
  const lines = String(src).split(/\r?\n/);
  let lc = 0;
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const symLookup = (name) => {
    const u = name.toUpperCase();
    if (has(equs, u)) return equs[u];
    if (has(labels, u)) return labels[u];
    if (has(SFR, u)) return SFR[u];
    if (has(BITS, u)) throw new Error("'" + name + "' is a bit name (" + BITS[u][0] + ', bit ' + BITS[u][1] + '); use it with BSF, BCF, BTFSS or BTFSC');
    throw new Error("unknown symbol '" + name + "'");
  };
  const expand = (s) => {
    for (let d = 0; d < 8; d++) {
      let changed = false;
      s = s.replace(/'[^']*'|\b[A-Za-z_][A-Za-z0-9_]*\b/g, (w) => {
        if (w[0] === "'") return w;
        const u = w.toUpperCase();
        if (has(macros, u)) { changed = true; return macros[u]; }
        return w;
      });
      if (!changed) break;
    }
    return s;
  };
  const parsed = [];
  /* pass 1: labels, EQU, #define, ORG and one slot per instruction */
  lines.forEach((raw, idx) => {
    const ln = idx + 1;
    let line = stripComment(raw).trim();
    if (!line) return;
    if (/^#\s*include\b/i.test(line)) return;
    let m;
    if ((m = /^#\s*define\s+([A-Za-z_]\w*)(?:\s+(.*))?$/i.exec(line))) { macros[m[1].toUpperCase()] = (m[2] || '').trim(); return; }
    if (/^#/.test(line)) { if (!/^#\s*(if|ifdef|ifndef|else|endif|pragma|undef)\b/i.test(line)) errors.push({ line: ln, msg: "I don't know the directive '" + line.split(/\s/)[0] + "'." }); return; }
    let label = null;
    if ((m = /^([A-Za-z_]\w*):\s*(.*)$/.exec(line))) { label = m[1]; line = m[2].trim(); }
    else if ((m = /^([A-Za-z_]\w*)\s+(EQU|SET)\s+(.+)$/i.exec(line))) {
      try { equs[m[1].toUpperCase()] = evalExpr(expand(m[3]), { dollar: lc, sym: symLookup }); }
      catch (e) { errors.push({ line: ln, msg: 'I cannot work out the value of ' + m[1] + ': ' + e.message + '.' }); }
      return;
    }
    if (label) {
      const u = label.toUpperCase();
      if (has(labels, u)) errors.push({ line: ln, msg: "The label '" + label + "' is defined twice." });
      if (has(SFR, u) || has(BITS, u) || has(INS, u)) errors.push({ line: ln, msg: "'" + label + "' cannot be a label: it is already the name of a register, a bit or an instruction." });
      labels[u] = lc;
    }
    if (!line) return;
    if ((m = /^EQU\s+(.+)$/i.exec(line)) && label) {
      delete labels[label.toUpperCase()];
      try { equs[label.toUpperCase()] = evalExpr(expand(m[1]), { dollar: lc, sym: symLookup }); }
      catch (e) { errors.push({ line: ln, msg: 'I cannot work out the value of ' + label + ': ' + e.message + '.' }); }
      return;
    }
    if ((m = /^ORG\s+(.+)$/i.exec(line))) {
      try { lc = evalExpr(expand(m[1]), { dollar: lc, sym: symLookup }); }
      catch (e) { errors.push({ line: ln, msg: 'ORG: ' + e.message + '.' }); }
      return;
    }
    if (IGNORED_DIRECTIVES.test(line)) return;
    if ((m = /^BANKSEL\s*\(?\s*([A-Za-z_]\w*)\s*\)?$/i.exec(line))) {
      parsed.push({ ln, addr: lc, mn: 'BANKSEL_RP0', rest: m[1], text: 'BANKSEL ' + m[1] }); lc++;
      parsed.push({ ln, addr: lc, mn: 'BANKSEL_RP1', rest: m[1], text: 'BANKSEL ' + m[1] }); lc++;
      return;
    }
    m = /^([A-Za-z_]\w*)\s*(.*)$/.exec(line);
    if (!m) { errors.push({ line: ln, msg: "I can't understand this line." }); return; }
    parsed.push({ ln, addr: lc, mn: m[1].toUpperCase(), rest: m[2].trim(), text: line });
    lc++;
  });
  /* pass 2: operands */
  parsed.forEach((p) => {
    if (p.mn === 'BANKSEL_RP0' || p.mn === 'BANKSEL_RP1') {
      try {
        const a = symLookup(p.rest), b = bankOf(a), bit = p.mn === 'BANKSEL_RP0' ? 5 : 6, val = p.mn === 'BANKSEL_RP0' ? (b & 1) : (b >> 1);
        prog[p.addr] = { op: val ? 'BSF' : 'BCF', f: 3, b: bit, addr: p.addr, line: p.ln, text: p.text };
      } catch (e) { errors.push({ line: p.ln, msg: 'BANKSEL: ' + e.message + '.' }); }
      return;
    }
    const mn = ALIAS[p.mn] || p.mn;
    if (!has(INS, mn)) {
      let msg = "'" + p.mn + "' is not a PIC16F887 instruction.";
      if (mn === 'MOVLF') msg = 'There is no MOVLF instruction on the PIC16: a literal cannot go straight to RAM. Load it into W with MOVLW, then copy W with MOVWF.';
      else if (mn === 'MOV' || mn === 'ADD' || mn === 'SUB' || mn === 'JMP' || mn === 'JUMP') msg = "'" + p.mn + "' is not a PIC16 instruction. The PIC16 has 35 instructions such as MOVLW, MOVWF, ADDWF, SUBWF and GOTO.";
      else if (has(SFR, mn) || has(equs, mn)) msg = "A line cannot start with the register name '" + p.mn + "'. Did you forget the instruction (for example MOVWF " + p.mn + ')? Labels need a colon after the name.';
      else if (!p.rest) msg = "'" + p.mn + "' is not an instruction. If it is a label, write it with a colon: " + p.mn + ':';
      errors.push({ line: p.ln, msg });
      return;
    }
    const type = INS[mn];
    const env = { dollar: p.addr, sym: symLookup };
    const ops = p.rest ? splitTop(expand(p.rest)) : [];
    const rec = { op: mn, addr: p.addr, line: p.ln, text: p.text };
    const bad = (msg) => errors.push({ line: p.ln, msg: mn + ': ' + msg });
    try {
      if (type === '-') { if (ops.length) return bad('this instruction takes no operand.'); }
      else if (type === 'k') {
        if (ops.length !== 1) return bad('needs one operand: the literal k.');
        const k = evalExpr(ops[0], env);
        if (k < -255 || k > 255) return bad('the literal must fit in 8 bits (0 to 255), but this one is ' + k + '.');
        rec.k = k & 255;
      } else if (type === 'f') {
        if (ops.length !== 1) return bad('needs one operand: the file register f.');
        if (has(BITS, ops[0].toUpperCase())) return bad("'" + ops[0] + "' is a bit, not a register. " + mn + ' works on a whole register.');
        const f = evalExpr(ops[0], env);
        if (f < 0 || f > 0x1FF) return bad('the register address is out of range.');
        rec.f = f;
      } else if (type === 'fd') {
        if (ops.length < 1 || ops.length > 2) return bad('needs a register f and an optional destination d (W or F).');
        if (has(BITS, ops[0].toUpperCase())) return bad("'" + ops[0] + "' is a bit, not a register.");
        rec.f = evalExpr(ops[0], env);
        if (rec.f < 0 || rec.f > 0x1FF) return bad('the register address is out of range.');
        rec.d = 1;
        if (ops.length === 2) {
          const d = ops[1].toUpperCase();
          if (d === 'W' || d === '0') rec.d = 0; else if (d === 'F' || d === '1') rec.d = 1;
          else return bad("the destination must be W (or 0) or F (or 1), not '" + ops[1] + "'.");
        }
      } else if (type === 'fb') {
        if (ops.length === 1 && has(BITS, ops[0].toUpperCase())) {
          const b = BITS[ops[0].toUpperCase()]; rec.f = SFR[b[0]]; rec.b = b[1];
        } else if (ops.length === 2) {
          rec.f = evalExpr(ops[0], env);
          const bs = ops[1].toUpperCase();
          rec.b = has(BITS, bs) ? BITS[bs][1] : evalExpr(ops[1], env);
          if (rec.b < 0 || rec.b > 7) return bad('the bit number must be 0 to 7.');
        } else return bad('needs a register and a bit number (for example ' + mn + ' REG1, 3) or a bit name such as RD0.');
      } else if (type === 'a') {
        if (ops.length !== 1) return bad('needs one operand: a label or an address.');
        rec.k = evalExpr(ops[0], env);
        if (rec.k < 0 || rec.k > 0x1FFF) return bad('the address is out of range.');
      }
      if (prog[p.addr]) errors.push({ line: p.ln, msg: 'Two instructions are placed at the same address ' + p.addr + ' (check your ORG directives).' });
      prog[p.addr] = rec;
    } catch (e) { errors.push({ line: p.ln, msg: mn + ': ' + e.message + '.' }); }
  });
  return { prog, errors, labels, equs, macros };
}

/* ---------- run a program ---------- */
function run(src, opts) {
  opts = opts || {};
  const full = (opts.pre ? opts.pre + '\n' : '') + src + (opts.post ? '\n' + opts.post : '');
  const preLines = opts.pre ? opts.pre.split('\n').length : 0;
  const asm = assemble(full);
  const errors = asm.errors.map(e => ({ line: e.line - preLines, msg: e.msg }));
  const res = { errors, asm, ok: errors.length === 0, trace: [], halted: null, m: null, snaps: {} };
  if (errors.length) return res;
  const m = P.newMachine({ lcdPins: opts.lcdPins }); res.m = m;
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const nameAddr = (n) => {
    const u = n.toUpperCase();
    if (has(asm.equs, u)) return asm.equs[u];
    if (has(SFR, u)) return SFR[u];
    return null;
  };
  const init = opts.init || {};
  Object.keys(init).forEach(k => {
    const v = init[k];
    if (k === 'W') m.W = v & 255;
    else if (k === 'pins') Object.keys(v).forEach(p => P.setPins(m, p, v[p]));
    else if (k === 'analog') Object.keys(v).forEach(ch => { m.analog[+ch] = v[ch]; });
    else if (k === 'vrefP') m.vrefP = v; else if (k === 'vrefM') m.vrefM = v;
    else if (k === 'Z') P.setFlag(m, 2, v); else if (k === 'C') P.setFlag(m, 0, v); else if (k === 'DC') P.setFlag(m, 1, v);
    else if (has(BITS, k.toUpperCase())) { const b = BITS[k.toUpperCase()]; const a = P.canon(SFR[b[0]]); m.ram[a] = v ? m.ram[a] | (1 << b[1]) : m.ram[a] & ~(1 << b[1]); }
    else { const a = nameAddr(k); if (a !== null) m.ram[P.canon(a)] = v & 255; }
  });
  const maxSteps = opts.maxSteps === undefined ? 20000 : opts.maxSteps;
  const watch = opts.watch || [];
  const symbols = {};
  Object.keys(asm.equs).forEach(k => { symbols[k] = (mm) => mm.ram[P.canon(asm.equs[k])]; });
  const getWatch = P.getter(m, symbols);
  res.get = getWatch;
  const snapSteps = (opts.snaps || []).slice();
  const clone = () => {
    const c = Object.assign({}, m, { ram: new Uint8Array(m.ram), stack: m.stack.slice(), pins: Object.assign({}, m.pins), log: m.log.slice(), txLog: m.txLog.slice() });
    if (m.lcd) c.lcd = Object.assign({}, m.lcd, { ddram: m.lcd.ddram.slice() });
    return c;
  };
  const events = (opts.events || []).slice().sort((x, y) => (x.step || 0) - (y.step || 0) || (x.at || 0) - (y.at || 0));
  let ins = null;
  const flags = (z, dc, c) => {
    let s = m.ram[3];
    if (z !== undefined) s = z ? (s | 4) : (s & ~4);
    if (dc !== undefined) s = dc ? (s | 2) : (s & ~2);
    if (c !== undefined) s = c ? (s | 1) : (s & ~1);
    m.ram[3] = s & 255;
  };
  const rd = (f) => P.readAbs(m, P.effAddr(m, f));
  const wr = (f, v) => P.writeAbs(m, P.effAddr(m, f), v);
  const dest = (v) => { v &= 255; if (ins.d === 0) m.W = v; else wr(ins.f, v); };
  const add = (a, b) => { const r = a + b; flags((r & 255) === 0, ((a & 15) + (b & 15)) > 15, r > 255); return r & 255; };
  const sub = (b, a) => { const r = b - a; flags((r & 255) === 0, (b & 15) >= (a & 15), b >= a); return r & 255; };
  while (m.steps < maxSteps) {
    while (events.length && ((events[0].step !== undefined && events[0].step <= m.steps) || (events[0].at !== undefined && events[0].at <= m.cycles))) P.applyEvent(m, events.shift());
    if (P.interruptPending(m)) {
      m.sleep = false;
      if (m.stack.length >= 8) { m.warn.push('Stack overflow: the 8-level stack was full when the interrupt happened.'); m.stack.shift(); }
      m.stack.push(m.pc); m.ram[0x0B] &= ~0x80; m.pc = 4; P.tick(m, 2);
    }
    if (m.sleep) { P.tick(m, 1); m.steps++; continue; }
    ins = asm.prog[m.pc];
    if (!ins) { m.halted = 'end'; break; }
    const startPc = m.pc;
    m.steps++;
    m.ram[2] = (startPc + 1) & 255; m.ram[0x0A] = m.ram[0x0A] & 0x1F; m.pclWritten = false;
    let next = m.pc + 1, cyc = 1, halt = null;
    switch (ins.op) {
      case 'MOVLW': m.W = ins.k; break;
      case 'ADDLW': m.W = add(m.W, ins.k); break;
      case 'SUBLW': m.W = sub(ins.k, m.W); break;
      case 'ANDLW': m.W = m.W & ins.k; flags(m.W === 0); break;
      case 'IORLW': m.W = m.W | ins.k; flags(m.W === 0); break;
      case 'XORLW': m.W = m.W ^ ins.k; flags(m.W === 0); break;
      case 'MOVWF': wr(ins.f, m.W); break;
      case 'CLRW': m.W = 0; flags(true); break;
      case 'CLRF': wr(ins.f, 0); flags(true); break;
      case 'ADDWF': dest(add(rd(ins.f), m.W)); break;
      case 'SUBWF': dest(sub(rd(ins.f), m.W)); break;
      case 'ANDWF': { const r = rd(ins.f) & m.W; flags(r === 0); dest(r); break; }
      case 'IORWF': { const r = rd(ins.f) | m.W; flags(r === 0); dest(r); break; }
      case 'XORWF': { const r = rd(ins.f) ^ m.W; flags(r === 0); dest(r); break; }
      case 'INCF': { const r = (rd(ins.f) + 1) & 255; flags(r === 0); dest(r); break; }
      case 'DECF': { const r = (rd(ins.f) - 1) & 255; flags(r === 0); dest(r); break; }
      case 'COMF': { const r = (~rd(ins.f)) & 255; flags(r === 0); dest(r); break; }
      case 'MOVF': { const r = rd(ins.f); flags(r === 0); dest(r); break; }
      case 'SWAPF': { const v = rd(ins.f); dest(((v << 4) | (v >> 4)) & 255); break; }
      case 'RLF': { const v = rd(ins.f), c = m.ram[3] & 1; flags(undefined, undefined, (v >> 7) & 1); dest(((v << 1) | c) & 255); break; }
      case 'RRF': { const v = rd(ins.f), c = m.ram[3] & 1; flags(undefined, undefined, v & 1); dest(((v >> 1) | (c << 7)) & 255); break; }
      case 'BSF': wr(ins.f, rd(ins.f) | (1 << ins.b)); break;
      case 'BCF': wr(ins.f, rd(ins.f) & ~(1 << ins.b)); break;
      case 'BTFSS': if ((rd(ins.f) >> ins.b) & 1) { next++; cyc = 2; } break;
      case 'BTFSC': if (!((rd(ins.f) >> ins.b) & 1)) { next++; cyc = 2; } break;
      case 'INCFSZ': { const r = (rd(ins.f) + 1) & 255; dest(r); if (r === 0) { next++; cyc = 2; } break; }
      case 'DECFSZ': { const r = (rd(ins.f) - 1) & 255; dest(r); if (r === 0) { next++; cyc = 2; } break; }
      case 'GOTO': if (ins.k === startPc && !(m.ram[0x0B] & 0x80) && !opts.noParkStop) halt = 'goto$'; next = ins.k; cyc = 2; break;
      case 'CALL':
        if (m.stack.length >= 8) { m.warn.push('Stack overflow: more than 8 nested CALLs. The oldest return address was lost.'); m.stack.shift(); }
        m.stack.push(m.pc + 1); next = ins.k; cyc = 2; break;
      case 'RETURN': if (!m.stack.length) { m.halted = 'error'; res.errors.push({ line: ins.line - preLines, msg: 'RETURN was executed with an empty stack: there was no matching CALL. (Did the program fall into a subroutine without calling it?)' }); } else next = m.stack.pop(); cyc = 2; break;
      case 'RETFIE': if (!m.stack.length) { m.halted = 'error'; res.errors.push({ line: ins.line - preLines, msg: 'RETFIE was executed with an empty stack: the program was not inside an interrupt.' }); } else { next = m.stack.pop(); m.ram[0x0B] |= 0x80; } cyc = 2; break;
      case 'RETLW': if (!m.stack.length) { m.halted = 'error'; res.errors.push({ line: ins.line - preLines, msg: 'RETLW was executed with an empty stack: there was no matching CALL.' }); } else { next = m.stack.pop(); m.W = ins.k; } cyc = 2; break;
      case 'NOP': case 'CLRWDT': break;
      case 'SLEEP': m.sleep = true; if (!(m.ram[0x0B] & 0x80) && !m.ram[0x8C] && !(m.ram[0x0B] & 0x38)) halt = 'sleep'; break;
    }
    if (m.halted === 'error') break;
    if (m.pclWritten && ins.op !== 'CALL' && ins.op !== 'GOTO') { next = ((m.ram[0x0A] & 0x1F) << 8) | m.ram[2]; cyc = 2; }
    if (!halt) P.tick(m, cyc);   /* the final GOTO $ (the program parked forever) is not counted */
    m.pc = next & 0x1FFF;
    if (snapSteps.length && snapSteps.includes(m.steps)) res.snaps[m.steps] = P.getter(clone(), symbols);
    if (opts.trace) {
      const row = { addr: startPc, line: ins.line - preLines, text: ins.text, W: m.W, cycles: m.cycles, vals: {} };
      watch.forEach(n => { row.vals[n] = getWatch(n); });
      res.trace.push(row);
      if (opts.maxTrace && res.trace.length >= opts.maxTrace) { m.halted = 'tracelimit'; break; }
    }
    if (halt) { m.halted = halt; break; }
  }
  if (!m.halted) m.halted = 'limit';
  if (m.halted === 'goto$' || m.halted === 'end' || m.halted === 'sleep') { for (let g = 0; g < 60 && (m.txLeft > 0 || m.txBuf !== null); g++) P.uartTick(m, 1000000); }
  snapSteps.forEach(st => { if (!res.snaps[st]) res.snaps[st] = P.getter(clone(), symbols); });
  res.halted = m.halted;
  return res;
}

root.Asm = { run, assemble, parseNumber, evalExpr, INS };
})(typeof window !== 'undefined' ? window : globalThis);
