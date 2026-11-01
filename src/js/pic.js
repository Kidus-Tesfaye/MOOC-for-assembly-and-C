/* PIC16F887 machine model shared by the assembly simulator (asm.js) and the C interpreter (cinterp.js).
   It models: 512 bytes of banked RAM with the special function registers (SFRs), mirrored registers,
   indirect addressing (INDF/FSR), PORT/TRIS/ANSEL pin behaviour, Timer0/1/2, PWM (CCP1/CCP2),
   the A/D converter, the USART (transmit and receive), the RB0/INT external interrupt and an
   HD44780 LCD connected in 4-bit mode. Time is counted in instruction cycles (Fosc/4).
   It is a teaching model - close to the datasheet for everything the course uses, but not a full emulator. */
(function (root) {
'use strict';

/* ---------- special function registers (absolute 9-bit addresses) ---------- */
const SFR = {
  INDF: 0x00, TMR0: 0x01, PCL: 0x02, STATUS: 0x03, FSR: 0x04, PORTA: 0x05, PORTB: 0x06, PORTC: 0x07, PORTD: 0x08, PORTE: 0x09,
  PCLATH: 0x0A, INTCON: 0x0B, PIR1: 0x0C, PIR2: 0x0D, TMR1L: 0x0E, TMR1H: 0x0F, T1CON: 0x10, TMR2: 0x11, T2CON: 0x12,
  SSPBUF: 0x13, SSPCON: 0x14, CCPR1L: 0x15, CCPR1H: 0x16, CCP1CON: 0x17, RCSTA: 0x18, TXREG: 0x19, RCREG: 0x1A,
  CCPR2L: 0x1B, CCPR2H: 0x1C, CCP2CON: 0x1D, ADRESH: 0x1E, ADCON0: 0x1F,
  OPTION_REG: 0x81, TRISA: 0x85, TRISB: 0x86, TRISC: 0x87, TRISD: 0x88, TRISE: 0x89, PIE1: 0x8C, PIE2: 0x8D, PCON: 0x8E,
  OSCCON: 0x8F, OSCTUNE: 0x90, SSPCON2: 0x91, PR2: 0x92, SSPADD: 0x93, SSPSTAT: 0x94, WPUB: 0x95, IOCB: 0x96, VRCON: 0x97,
  TXSTA: 0x98, SPBRG: 0x99, SPBRGH: 0x9A, PWM1CON: 0x9B, ECCPAS: 0x9C, PSTRCON: 0x9D, ADRESL: 0x9E, ADCON1: 0x9F,
  WDTCON: 0x105, CM1CON0: 0x107, CM2CON0: 0x108, CM2CON1: 0x109, EEDAT: 0x10C, EEADR: 0x10D, EEDATH: 0x10E, EEADRH: 0x10F,
  SRCON: 0x185, BAUDCTL: 0x187, ANSEL: 0x188, ANSELH: 0x189, EECON1: 0x18C, EECON2: 0x18D
};
const BITS = {};
function defBits(reg, names) { names.forEach((n, i) => { if (n) BITS[n] = [reg, i]; }); }
defBits('STATUS', ['C', 'DC', 'Z', 'PD', 'TO', 'RP0', 'RP1', 'IRP']);
BITS.ZERO = ['STATUS', 2]; BITS.CARRY = ['STATUS', 0]; BITS.nPD = ['STATUS', 3]; BITS.nTO = ['STATUS', 4];
defBits('INTCON', ['RBIF', 'INTF', 'T0IF', 'RBIE', 'INTE', 'T0IE', 'PEIE', 'GIE']);
BITS.TMR0IF = ['INTCON', 2]; BITS.TMR0IE = ['INTCON', 5];
defBits('PIR1', ['TMR1IF', 'TMR2IF', 'CCP1IF', 'SSPIF', 'TXIF', 'RCIF', 'ADIF']);
defBits('PIE1', ['TMR1IE', 'TMR2IE', 'CCP1IE', 'SSPIE', 'TXIE', 'RCIE', 'ADIE']);
defBits('PIR2', ['CCP2IF', null, 'ULPWUIF', 'BCLIF', 'EEIF', 'C1IF', 'C2IF', 'OSFIF']);
defBits('PIE2', ['CCP2IE', null, 'ULPWUIE', 'BCLIE', 'EEIE', 'C1IE', 'C2IE', 'OSFIE']);
defBits('OPTION_REG', ['PS0', 'PS1', 'PS2', 'PSA', 'T0SE', 'T0CS', 'INTEDG', 'RBPU']); BITS.nRBPU = ['OPTION_REG', 7];
defBits('T1CON', ['TMR1ON', 'TMR1CS', 'T1SYNC', 'T1OSCEN', 'T1CKPS0', 'T1CKPS1', 'TMR1GE', 'T1GINV']); BITS.nT1SYNC = ['T1CON', 2];
defBits('T2CON', ['T2CKPS0', 'T2CKPS1', 'TMR2ON', 'TOUTPS0', 'TOUTPS1', 'TOUTPS2', 'TOUTPS3']);
defBits('ADCON0', ['ADON', 'GO', 'CHS0', 'CHS1', 'CHS2', 'CHS3', 'ADCS0', 'ADCS1']); BITS.GO_DONE = ['ADCON0', 1]; BITS.GO_nDONE = ['ADCON0', 1]; BITS.nDONE = ['ADCON0', 1];
defBits('ADCON1', [null, null, null, null, 'VCFG0', 'VCFG1', null, 'ADFM']);
defBits('TXSTA', ['TX9D', 'TRMT', 'BRGH', 'SENDB', 'SYNC', 'TXEN', 'TX9', 'CSRC']);
defBits('RCSTA', ['RX9D', 'OERR', 'FERR', 'ADDEN', 'CREN', 'SREN', 'RX9', 'SPEN']);
defBits('BAUDCTL', [null, 'WUE', null, 'BRG16', 'SCKP', null, 'RCIDL', 'ABDOVF']); BITS.ABDEN = ['BAUDCTL', 0];
defBits('CCP1CON', ['CCP1M0', 'CCP1M1', 'CCP1M2', 'CCP1M3', 'DC1B0', 'DC1B1', 'P1M0', 'P1M1']);
defBits('CCP2CON', ['CCP2M0', 'CCP2M1', 'CCP2M2', 'CCP2M3', 'DC2B0', 'DC2B1', null, null]);
defBits('OSCCON', ['SCS', 'LTS', 'HTS', 'OSTS', 'IRCF0', 'IRCF1', 'IRCF2', null]);
for (let i = 0; i < 8; i++) { BITS['ANS' + i] = ['ANSEL', i]; BITS['IOCB' + i] = ['IOCB', i]; BITS['WPUB' + i] = ['WPUB', i]; }
for (let i = 0; i < 6; i++) BITS['ANS' + (8 + i)] = ['ANSELH', i];
['A', 'B', 'C', 'D', 'E'].forEach(p => {
  const n = p === 'E' ? 4 : 8;
  for (let i = 0; i < n; i++) { BITS['R' + p + i] = ['PORT' + p, i]; BITS['TRIS' + p + i] = ['TRIS' + p, i]; }
});
/* XC8 also accepts e.g. PORTDbits.RD0 and TRISDbits.TRISD0: the C interpreter maps "<REG>bits.<BIT>" to these names. */
const ADDR2NAME = {};
Object.keys(SFR).forEach(k => { ADDR2NAME[SFR[k]] = k; });
const PORT_ADDR = { A: 0x05, B: 0x06, C: 0x07, D: 0x08, E: 0x09 };
const TRIS_OF = { 5: 0x85, 6: 0x86, 7: 0x87, 8: 0x88, 9: 0x89 };
/* analog channel of each port pin (datasheet table "ANSEL/ANSELH"): [port address, bit] -> ANx */
const ANALOG_PIN = { '5,0': 0, '5,1': 1, '5,2': 2, '5,3': 3, '5,5': 4, '9,0': 5, '9,1': 6, '9,2': 7, '6,2': 8, '6,3': 9, '6,1': 10, '6,4': 11, '6,0': 12, '6,5': 13 };

/* registers that appear in every bank (or in two banks): map any mirror to one canonical address */
function canon(a) {
  a &= 0x1FF;
  const lo = a & 0x7F;
  if (lo === 0x00 || lo === 0x02 || lo === 0x03 || lo === 0x04 || lo === 0x0A || lo === 0x0B || lo >= 0x70) return lo;
  if (a === 0x101) return 0x01;     /* TMR0 mirror in bank 2 */
  if (a === 0x181) return 0x81;     /* OPTION_REG mirror in bank 3 */
  if (a === 0x106) return 0x06;     /* PORTB mirror in bank 2 */
  if (a === 0x186) return 0x86;     /* TRISB mirror in bank 3 */
  return a;
}
/* direct addressing as the CPU does it: 7 bits from the opcode + RP1:RP0 from STATUS */
function effAddr(m, f) {
  const st = m.ram[3];
  return canon((((st >> 6) & 1) * 2 + ((st >> 5) & 1)) * 128 + (f & 0x7F));
}
function isGPR(a) {
  a = canon(a);
  const lo = a & 0x7F, bank = a >> 7;
  if (lo >= 0x70) return true;
  if (bank === 0) return lo >= 0x20;
  if (bank === 1) return lo >= 0x20 && lo < 0x70;
  return lo >= 0x10 && lo < 0x70 && (bank === 2 ? true : lo >= 0x20);
}

/* ---------- machine ---------- */
function newMachine(opts) {
  opts = opts || {};
  const m = {
    ram: new Uint8Array(512), W: 0, pc: 0, stack: [], cycles: 0, steps: 0,
    pins: { 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },     /* external level applied to each port (for inputs) */
    analog: {}, vrefP: 5, vrefM: 0,             /* analog voltages on AN0..AN13 and the external references */
    halted: null, warn: [], log: [], pwmLog: [],
    t0: 0, t0inhibit: 0, t1: 0, t2pre: 0, t2post: 0, adcLeft: 0,
    txLeft: 0, txBuf: null, txLog: [], rxQueue: [], console: '',
    lcd: opts.lcd === false ? null : newLcd(opts.lcdPins), sleep: false, fosc: 4000000
  };
  [0x85, 0x86, 0x87, 0x88, 0x89].forEach(a => { m.ram[a] = 0xFF; });
  m.ram[0x89] = 0x0F;
  m.ram[0x81] = 0xFF; m.ram[0x188] = 0xFF; m.ram[0x189] = 0x3F; m.ram[0x03] = 0x18; m.ram[0x98] = 0x02;
  m.ram[0x8F] = 0x68;   /* OSCCON: IRCF = 110 (4 MHz) after reset */
  m.ram[0x92] = 0xFF;   /* PR2 */
  return m;
}
function oscFreq(m) {
  const ircf = (m.ram[0x8F] >> 4) & 7;
  return [31000, 125000, 250000, 500000, 1000000, 2000000, 4000000, 8000000][ircf];
}

/* value seen when the CPU reads a port: inputs read the external pin, outputs read the latch,
   and pins configured as analog (ANSEL/ANSELH = 1) read as 0 */
function readPort(m, a) {
  const tris = m.ram[TRIS_OF[a]];
  let v = (m.ram[a] & ~tris) | (m.pins[a] & tris);
  for (let b = 0; b < 8; b++) {
    const ch = ANALOG_PIN[a + ',' + b];
    if (ch === undefined || !((tris >> b) & 1)) continue;
    const ans = ch < 8 ? (m.ram[0x188] >> ch) & 1 : (m.ram[0x189] >> (ch - 8)) & 1;
    if (ans) v &= ~(1 << b);
  }
  if (a === 9) v &= 0x0F;
  return v & 255;
}
function readAbs(m, a) {
  a = canon(a);
  if (a === 0x00) { const ia = indAddr(m); return (ia & 0x7F) === 0 ? 0 : readAbs(m, ia); }
  if (a === 0x1A) { const v = m.ram[a]; m.ram[0x0C] &= ~0x20; if (m.rxFifo && m.rxFifo.length) { m.ram[0x1A] = m.rxFifo.shift(); m.ram[0x0C] |= 0x20; } return v; }
  if (a >= 5 && a <= 9) return readPort(m, a);
  return m.ram[a];
}
function indAddr(m) { return canon((((m.ram[3] >> 7) & 1) << 8) | m.ram[4]); }
function writeAbs(m, a, v) {
  a = canon(a);
  v &= 255;
  if (a === 0x00) { const ia = indAddr(m); if ((ia & 0x7F) !== 0) writeAbs(m, ia, v); return; }
  if (a === 9) v &= 0x0F;
  if (a === 0x89) v = (v & 0x0F) | 0x08;                     /* RE3 (MCLR) is an input-only pin */
  if (a === 0x0C) v = (v & ~0x30) | (m.ram[0x0C] & 0x30);   /* RCIF and TXIF are read-only */
  if (a === 0x98) v = (v & ~0x02) | (m.ram[0x98] & 0x02);   /* TRMT is read-only */
  if (a === 0x1F && (v & 2) && !(v & 1)) v &= ~2;            /* GO cannot start while ADON = 0 */
  const old = m.ram[a];
  m.ram[a] = v;
  if (a === 0x02) m.pclWritten = true;
  if (a === 0x19) { m.ram[0x0C] &= ~0x10; if ((m.ram[0x98] & 0x20) && (m.ram[0x18] & 0x80)) { if (m.txLeft <= 0) uartStart(m, v); else m.txBuf = v; } }
  if (a === 0x01) { m.t0 = 0; m.t0inhibit = 2; }             /* writing TMR0 clears the prescaler and stops counting for 2 cycles */
  if (a === 0x0E || a === 0x0F) m.t1 = 0;
  if (a === 0x15 || a === 0x1B || a === 0x92 || a === 0x17 || a === 0x1D || a === 0x12) { if (m.pwmLog.length < 20000) m.pwmLog.push([m.cycles, a, v]); }
  if (a >= 5 && a <= 9 || (a >= 0x85 && a <= 0x89)) portChanged(m, a >= 0x85 ? a - 0x80 : a, old);
}
function portChanged(m, p, old) {
  const out = (m.ram[p] & ~m.ram[TRIS_OF[p]]) & 255;
  if (m.log.length < 60000) m.log.push([m.cycles, p, out]);
  if (m.lcd && p === m.lcd.port) lcdPortWrite(m, out);
}
function setFlag(m, bit, v) { m.ram[3] = v ? (m.ram[3] | (1 << bit)) : (m.ram[3] & ~(1 << bit)); }

/* ---------- peripherals: everything advances by "cyc" instruction cycles ---------- */
function brgCyclesPerBit(m) {
  const n = ((m.ram[0x187] >> 3) & 1) ? ((m.ram[0x9A] << 8) | m.ram[0x99]) : m.ram[0x99];
  const brgh = (m.ram[0x98] >> 2) & 1, brg16 = (m.ram[0x187] >> 3) & 1;
  const div = brg16 ? (brgh ? 4 : 16) : (brgh ? 16 : 64);
  return div * (n + 1) / 4;    /* Fosc/div per bit -> div/4 instruction cycles per bit */
}
function byteCycles(m) { return Math.max(1, Math.round(10 * brgCyclesPerBit(m))); }   /* start + 8 data + stop */
function baudRate(m) { return Math.round(oscFreq(m) / (4 * brgCyclesPerBit(m))); }
function uartStart(m, v) { m.txLog.push(v & 255); m.console += String.fromCharCode(v & 255); m.txLeft = byteCycles(m); }
function uartTick(m, cyc) {
  if (m.txLeft > 0) { m.txLeft -= cyc; if (m.txLeft <= 0) { m.txLeft = 0; if (m.txBuf !== null) { uartStart(m, m.txBuf); m.txBuf = null; } } }
  m.ram[0x98] = (m.ram[0x98] & ~2) | (m.txLeft > 0 ? 0 : 2);                                     /* TRMT: shift register empty */
  m.ram[0x0C] = (m.ram[0x0C] & ~0x10) | (((m.ram[0x98] & 0x20) && m.txBuf === null) ? 0x10 : 0); /* TXIF: TXREG empty */
  while (m.rxQueue.length && m.rxQueue[0].at <= m.cycles) {
    const e = m.rxQueue.shift();
    if ((m.ram[0x18] & 0x90) !== 0x90) continue;                                                 /* SPEN and CREN needed */
    if (m.ram[0x0C] & 0x20) { m.rxFifo = m.rxFifo || []; if (m.rxFifo.length < 1) m.rxFifo.push(e.byte); else m.ram[0x18] |= 0x02; }
    else { m.ram[0x1A] = e.byte; m.ram[0x0C] |= 0x20; }
  }
}
function adcStep(m, cyc) {
  const c0 = m.ram[0x1F];
  if ((c0 & 3) !== 3) { m.adcLeft = 0; return; }
  if (!m.adcLeft) { const div = [2, 8, 32, 8][(c0 >> 6) & 3]; m.adcLeft = Math.max(1, Math.round(12 * div / 4)); }
  m.adcLeft -= cyc;
  if (m.adcLeft > 0) return;
  m.adcLeft = 0;
  const ch = (c0 >> 2) & 15, c1 = m.ram[0x9F];
  const vin = ch === 15 ? 0.6 : (m.analog[ch] || 0);
  const vp = (c1 & 0x10) ? m.vrefP : 5, vm = (c1 & 0x20) ? m.vrefM : 0;
  let res = Math.round(1023 * (vin - vm) / (vp - vm));
  res = Math.max(0, Math.min(1023, res));
  if (c1 & 0x80) { m.ram[0x1E] = res >> 8; m.ram[0x9E] = res & 255; } else { m.ram[0x1E] = res >> 2; m.ram[0x9E] = (res & 3) << 6; }
  m.ram[0x1F] &= ~2;
  m.ram[0x0C] |= 0x40;
}
function timer2Step(m, cyc) {
  const t2 = m.ram[0x12];
  if (!(t2 & 4)) return;
  const pre = [1, 4, 16, 16][t2 & 3], post = ((t2 >> 3) & 15) + 1;
  m.t2pre += cyc;
  while (m.t2pre >= pre) {
    m.t2pre -= pre;
    if (m.ram[0x11] === m.ram[0x92]) {
      m.ram[0x11] = 0;
      m.t2post++;
      if (m.t2post >= post) { m.t2post = 0; m.ram[0x0C] |= 0x02; }
    } else m.ram[0x11] = (m.ram[0x11] + 1) & 255;
  }
}
function tick(m, cyc) {
  m.cycles += cyc;
  adcStep(m, cyc);
  uartTick(m, cyc);
  const opt = m.ram[0x81];
  if (!((opt >> 5) & 1)) {              /* T0CS = 0: Timer0 counts instruction cycles */
    let c = cyc;
    if (m.t0inhibit) { const k = Math.min(m.t0inhibit, c); m.t0inhibit -= k; c -= k; }
    const presc = ((opt >> 3) & 1) ? 1 : (2 << (opt & 7));
    m.t0 += c;
    if (m.t0 >= presc) {
      const n = Math.floor(m.t0 / presc); m.t0 -= n * presc;
      const v = m.ram[1] + n;
      if (v > 255) m.ram[0x0B] |= 0x04;
      m.ram[1] = v & 255;
    }
  }
  const t1c = m.ram[0x10];
  if ((t1c & 1) && !(t1c & 2)) {
    const presc = 1 << ((t1c >> 4) & 3);
    m.t1 += cyc;
    if (m.t1 >= presc) {
      const n = Math.floor(m.t1 / presc); m.t1 -= n * presc;
      let v = ((m.ram[0x0F] << 8) | m.ram[0x0E]) + n;
      if (v > 0xFFFF) { v &= 0xFFFF; m.ram[0x0C] |= 0x01; }
      m.ram[0x0F] = v >> 8; m.ram[0x0E] = v & 255;
    }
  }
  timer2Step(m, cyc);
}
function interruptPending(m) {
  const ic = m.ram[0x0B];
  if (!(ic & 0x80)) return false;
  if ((ic & 0x20) && (ic & 0x04)) return true;           /* Timer0 overflow */
  if ((ic & 0x10) && (ic & 0x02)) return true;           /* RB0/INT external interrupt */
  if ((ic & 0x08) && (ic & 0x01)) return true;           /* PORTB change */
  return !!((ic & 0x40) && ((m.ram[0x8C] & m.ram[0x0C] & 0x7F) || (m.ram[0x8D] & m.ram[0x0D])));   /* peripherals (PIE1/PIR1, PIE2/PIR2) */
}
/* apply a change of the external pins (inputs); detects the RB0/INT edge */
function setPins(m, port, v) {
  const a = typeof port === 'number' ? port : PORT_ADDR[String(port).toUpperCase()];
  const before = readPort(m, a);
  m.pins[a] = v & 255;
  if (a === 6) {
    const after = readPort(m, a);
    const b0 = before & 1, a0 = after & 1, rising = (m.ram[0x81] >> 6) & 1;
    if (b0 !== a0 && ((rising && a0) || (!rising && !a0))) m.ram[0x0B] |= 0x02;   /* INTF */
    if ((before ^ after) & 0xF0 & m.ram[0x96]) m.ram[0x0B] |= 0x01;               /* RBIF (interrupt on change) */
  }
}
/* scheduled test events: {at: cycles} or {step: n}, with pins, analog, rx text/bytes or set: {BITNAME: 0/1} */
function applyEvent(m, ev) {
  Object.keys(ev.pins || {}).forEach(p => setPins(m, p, ev.pins[p]));
  Object.keys(ev.analog || {}).forEach(ch => { m.analog[+ch] = ev.analog[ch]; });
  if (ev.rx !== undefined) {
    const bytes = typeof ev.rx === 'string' ? Array.from(ev.rx).map(c => c.charCodeAt(0)) : [].concat(ev.rx);
    const bc = byteCycles(m);
    const last = m.rxQueue.length ? m.rxQueue[m.rxQueue.length - 1].at : m.cycles;
    bytes.forEach((b, i) => m.rxQueue.push({ at: Math.max(m.cycles, last) + (i + 1) * bc, byte: b & 255 }));
  }
  Object.keys(ev.set || {}).forEach(nm => { const b = BITS[nm.toUpperCase()]; if (b) { const a = canon(SFR[b[0]]); m.ram[a] = ev.set[nm] ? (m.ram[a] | (1 << b[1])) : (m.ram[a] & ~(1 << b[1])); } });
}

/* ---------- HD44780 LCD in 4-bit mode (default wiring of the lecture: RS=RD0, E=RD1, D4..D7=RD2..RD5) ---------- */
function newLcd(pins) {
  pins = Object.assign({ port: 'D', rs: 0, e: 1, d4: 2 }, pins || {});
  return { port: PORT_ADDR[pins.port], rs: pins.rs, e: pins.e, d4: pins.d4, prevE: 0, mode8: true, half: null, ddram: new Array(128).fill(32), addr: 0, inc: 1, on: false, cursor: false, used: false, cmds: [] };
}
function lcdPortWrite(m, out) {
  const L = m.lcd;
  const e = (out >> L.e) & 1;
  if (L.prevE && !e) {                       /* data is latched on the falling edge of E */
    const rs = (out >> L.rs) & 1, nib = (out >> L.d4) & 15;
    L.used = true;
    if (L.mode8) {                           /* still in 8-bit mode: only the high nibble is connected */
      const byte = nib << 4;
      if (!rs) { if ((byte & 0xF0) === 0x20) L.mode8 = false; lcdCommand(L, byte, true); }
    } else if (L.half === null) L.half = { rs, nib };
    else { const byte = (L.half.nib << 4) | nib; const r = L.half.rs; L.half = null; if (r) lcdData(L, byte); else lcdCommand(L, byte, false); }
  }
  L.prevE = e;
}
function lcdCommand(L, c, init) {
  if (L.cmds.length < 500) L.cmds.push(c);
  if (c & 0x80) { L.addr = c & 0x7F; return; }
  if (c & 0x40) return;                                  /* CGRAM address: custom characters are not modelled */
  if (c & 0x20) { if (!init) L.mode8 = !!(c & 0x10); return; }
  if (c & 0x10) return;                                  /* cursor/display shift: not modelled */
  if (c & 0x08) { L.on = !!(c & 4); L.cursor = !!(c & 2); return; }
  if (c & 0x04) { L.inc = (c & 2) ? 1 : -1; return; }
  if (c & 0x02) { L.addr = 0; return; }
  if (c & 0x01) { L.ddram.fill(32); L.addr = 0; L.inc = 1; }
}
function lcdData(L, b) { L.ddram[L.addr & 0x7F] = b; L.addr = (L.addr + L.inc) & 0x7F; }
function lcdLine(L, n) { if (!L) return ''; let s = ''; const base = n === 2 ? 0x40 : 0; for (let i = 0; i < 16; i++) s += String.fromCharCode(L.ddram[base + i]); return s; }

/* ---------- waveform analysis of the logged output pins ---------- */
function waveform(m, port, bit) {
  let prev = 0; const rises = [], falls = [];
  for (const e of m.log) { if (e[1] !== port) continue; const b = (e[2] >> bit) & 1; if (b !== prev) { (b ? rises : falls).push(e[0]); prev = b; } }
  return { rises, falls };
}
function pwmInfo(m, n) {
  const con = m.ram[n === 2 ? 0x1D : 0x17];
  const on = (con & 0x0C) === 0x0C && (m.ram[0x12] & 4);
  const pre = [1, 4, 16, 16][m.ram[0x12] & 3];
  const period = (m.ram[0x92] + 1) * pre;                               /* in instruction cycles */
  const dc = ((m.ram[n === 2 ? 0x1B : 0x15] << 2) | ((con >> 4) & 3));  /* 10-bit duty value */
  const high = Math.min(period, dc * pre / 4);
  return { on: !!on, period, high, duty: period ? high / period : 0, freq: period ? oscFreq(m) / 4 / period : 0 };
}

/* ---------- named values used by tests and by the result panels ---------- */
function getter(m, symbols) {
  symbols = symbols || {};
  return function get(n) {
    const u = String(n).toUpperCase();
    if (u === 'W') return m.W;
    if (u === 'Z') return (m.ram[3] >> 2) & 1;
    if (u === 'C') return m.ram[3] & 1;
    if (u === 'DC') return (m.ram[3] >> 1) & 1;
    if (u === 'BANK') return ((m.ram[3] >> 6) & 1) * 2 + ((m.ram[3] >> 5) & 1);
    if (u === 'CYCLES') return m.cycles; if (u === 'STEPS') return m.steps; if (u === 'PC') return m.pc; if (u === 'SP') return m.stack.length;
    if (u === 'TX') return m.txLog.map(c => String.fromCharCode(c)).join('');
    if (u === 'OUT' || u === 'CONSOLE') return m.console;
    if (u === 'TXCOUNT') return m.txLog.length;
    if (u === 'BAUD') return baudRate(m);
    if (u === 'FOSC') return oscFreq(m);
    if (u === 'LCD1') return lcdLine(m.lcd, 1).replace(/\s+$/, '');
    if (u === 'LCD2') return lcdLine(m.lcd, 2).replace(/\s+$/, '');
    if (u === 'LCDON') return m.lcd && m.lcd.on ? 1 : 0;
    let k = /^(OUT|PIN|LAT)\.([A-E])$/.exec(u);
    if (k) { const a = PORT_ADDR[k[2]]; return k[1] === 'PIN' ? readPort(m, a) : k[1] === 'LAT' ? m.ram[a] : (m.ram[a] & ~m.ram[TRIS_OF[a]] & 255); }
    k = /^PWM([12])\.(DUTY|PERIOD|HIGH|FREQ|ON)$/.exec(u);
    if (k) { const p = pwmInfo(m, +k[1]); return k[2] === 'DUTY' ? Math.round(p.duty * 1000) / 1000 : k[2] === 'PERIOD' ? p.period : k[2] === 'HIGH' ? p.high : k[2] === 'FREQ' ? Math.round(p.freq * 100) / 100 : (p.on ? 1 : 0); }
    k = /^(PERIOD|HIGH|EDGES|RISES|FREQ)\.([A-E])([0-7])$/.exec(u);
    if (k) {
      const w = waveform(m, PORT_ADDR[k[2]], +k[3]);
      if (k[1] === 'EDGES') return w.rises.length + w.falls.length;
      if (k[1] === 'RISES') return w.rises.length;
      const per = w.rises.length >= 2 ? (w.rises[w.rises.length - 1] - w.rises[0]) / (w.rises.length - 1) : 0;
      if (k[1] === 'PERIOD') return Math.round(per);
      if (k[1] === 'FREQ') return per ? Math.round(oscFreq(m) / 4 / per * 10) / 10 : 0;
      let tot = 0, cnt = 0; w.rises.forEach(r => { const f = w.falls.find(x => x > r); if (f !== undefined) { tot += f - r; cnt++; } });
      return cnt ? Math.round(tot / cnt) : 0;
    }
    if (Object.prototype.hasOwnProperty.call(symbols, u)) return symbols[u](m);
    if (Object.prototype.hasOwnProperty.call(SFR, u)) { const a = canon(SFR[u]); return (a >= 5 && a <= 9) ? readPort(m, a) : m.ram[a]; }
    if (Object.prototype.hasOwnProperty.call(BITS, u)) { const b = BITS[u]; const a = canon(SFR[b[0]]); const v = (a >= 5 && a <= 9) ? readPort(m, a) : m.ram[a]; return (v >> b[1]) & 1; }
    k = /^RAM\[(0X[0-9A-F]+|\d+)\]$/.exec(u);
    if (k) return m.ram[canon(parseInt(k[1]))];
    return undefined;
  };
}
/* a short human summary of the machine state for the "Run" panel */
function describe(m, extraRows) {
  const toBin = (v) => v.toString(2).padStart(8, '0');
  const rows = [];
  (extraRows || []).forEach(r => rows.push(r));
  'ABCDE'.split('').forEach((p) => {
    const a = PORT_ADDR[p], t = m.ram[TRIS_OF[a]], l = m.ram[a];
    if (l || t !== (p === 'E' ? 0x0F : 0xFF)) rows.push(['PORT' + p + ' / TRIS' + p, (p === 'E' ? toBin(readPort(m, a)).slice(4) : toBin(readPort(m, a))) + ' / ' + (p === 'E' ? toBin(t).slice(4) : toBin(t))]);
  });
  return rows;
}

root.PIC = { SFR, BITS, ADDR2NAME, PORT_ADDR, TRIS_OF, canon, effAddr, isGPR, newMachine, oscFreq, readAbs, writeAbs, readPort, setFlag, tick, interruptPending, setPins, applyEvent, uartTick, byteCycles, baudRate, getter, waveform, pwmInfo, lcdLine, describe };
})(typeof window !== 'undefined' ? window : globalThis);
