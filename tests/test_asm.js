/* Unit tests for the PIC16F887 assembler/simulator (run: node tests/test_asm.js) */
const path = require('path');
require(path.join(__dirname, '../src/js/pic.js'));
require(path.join(__dirname, '../src/js/asm.js'));
const fs = require('fs');
let pass = 0, fail = 0;
function t(name, src, check, opts) {
  const r = Asm.run(src, opts);
  let ok = false; try { ok = check(r); } catch (e) { ok = false; }
  if (ok) pass++; else { fail++; console.log('FAIL ' + name + ' errors=' + JSON.stringify(r.errors) + ' halted=' + r.halted); }
}
t('movlw/addwf', 'A EQU 0x20\nMOVLW 25\nMOVWF A\nMOVLW 30\nADDWF A, F\nGOTO $', r => r.get('A') === 55 && r.get('C') === 0);
t('carry', 'MOVLW 200\nADDLW 100\nGOTO $', r => r.get('W') === 44 && r.get('C') === 1);
t('sub borrow', 'A EQU 0x20\nMOVLW 60\nMOVWF A\nMOVLW 50\nSUBWF A, W\nGOTO $', r => r.get('W') === 10 && r.get('C') === 1);
t('sub negative', 'A EQU 0x20\nMOVLW 50\nMOVWF A\nMOVLW 60\nSUBWF A, W\nGOTO $', r => r.get('W') === 246 && r.get('C') === 0);
t('rlf/rrf', 'A EQU 0x20\nMOVLW 10000001B\nMOVWF A\nBCF STATUS, 0\nRLF A, F\nGOTO $', r => r.get('A') === 2 && r.get('C') === 1);
t('rrf', 'A EQU 0x20\nMOVLW 3\nMOVWF A\nBSF STATUS, 0\nRRF A, F\nGOTO $', r => r.get('A') === 129 && r.get('C') === 1);
t('indirect', 'MOVLW 0x30\nMOVWF FSR\nMOVLW 7\nMOVWF INDF\nINCF FSR, F\nMOVLW 9\nMOVWF INDF\nGOTO $', r => r.get('RAM[0x30]') === 7 && r.get('RAM[0x31]') === 9);
t('table', 'ORG 0\nMOVLW 2\nCALL TABLE\nGOTO $\nTABLE:\nADDWF PCL, F\nRETLW 10\nRETLW 20\nRETLW 30', r => r.get('W') === 30);
t('banksel', 'BANKSEL TRISD\nCLRF TRISD\nBANKSEL PORTD\nMOVLW 0x0F\nMOVWF PORTD\nGOTO $', r => r.get('TRISD') === 0 && r.get('PORTD') === 15 && r.get('BANK') === 0);
t('high/low', 'MOVLW HIGH(3036)\nMOVWF TMR1H\nMOVLW LOW(3036)\nMOVWF TMR1L\nGOTO $', r => r.get('TMR1H') === 0x0B && r.get('TMR1L') === 0xDC);
t('bank trap', 'MOVLW 0\nMOVWF TRISD\nGOTO $', r => r.get('TRISD') === 255 && r.get('PORTD') === 0);
t('analog reads 0', 'BSF STATUS, 5\nBSF TRISB, 0\nBCF STATUS, 5\nMOVF PORTB, W\nGOTO $', r => r.get('W') === 0, { init: { pins: { B: 1 } } });
t('digital reads 1', 'BSF STATUS, 5\nBSF STATUS, 6\nCLRF ANSELH\nBCF STATUS, 5\nBCF STATUS, 6\nMOVF PORTB, W\nGOTO $', r => r.get('W') === 1, { init: { pins: { B: 1 } } });
t('movlf error', 'MOVLF 25, 0x20', r => !r.ok && /MOVLF/.test(r.errors[0].msg));
t('missing label colon', 'START\nGOTO START', r => !r.ok);
t('stack', 'CALL A1\nGOTO $\nA1: RETURN', r => r.halted === 'goto$' && r.get('SP') === 0);
t('return empty', 'RETURN', r => r.halted === 'error');
t('dc flag', 'MOVLW 0x0F\nADDLW 1\nGOTO $', r => r.get('DC') === 1);
t('decfsz loop cycles', 'C1 EQU 0x70\nMOVLW 0x21\nMOVWF C1\nDECFSZ C1, F\nGOTO $-1\nGOTO $', r => r.get('CYCLES') === 100);
t('tmr0 overflow', 'BSF STATUS,5\nMOVLW 11011000B\nMOVWF OPTION_REG\nBCF STATUS,5\nBCF INTCON,2\nMOVLW -50\nMOVWF TMR0\nBTFSS INTCON,2\nGOTO $-1\nGOTO $', r => r.get('T0IF') === 1 && r.get('CYCLES') >= 57 && r.get('CYCLES') <= 62);
t('uart send', 'BSF STATUS,5\nMOVLW 25\nMOVWF SPBRG\nMOVLW 00100100B\nMOVWF TXSTA\nBCF STATUS,5\nBSF RCSTA,7\nMOVLW \'H\'\nMOVWF TXREG\nGOTO $', r => r.get('TX') === 'H' && r.get('BAUD') === 9615);
const dir = '/tmp/untrusted/activities/activitys/';
if (fs.existsSync(dir)) {
  const A = (f) => fs.readFileSync(dir + f, 'utf8');
  t('Activity 1', A('Activity 1.txt'), r => r.get('REGC') === 55);
  t('Activity 2', A('Activity 2.txt'), r => r.get('PORTD') === 255 && r.get('PORTE') === 7);
  t('Activity 4', A('Activity 4.txt'), r => r.get('RD0') === 0, { maxSteps: 4000, events: [{ step: 1000, pins: { D: 2 } }, { step: 2000, pins: { D: 0 } }] });
  t('Activity 6', A('Activity 6.txt'), r => Math.abs(r.get('PERIOD.D0') - 1000000) < 100, { maxSteps: 3000000 });
  t('Activity 7', A('Activity 7.txt'), r => r.get('PORTC') === 4, { maxSteps: 2000, init: { pins: { D: 7 } } });
  t('Activity 8', A('Activity 8.txt'), r => r.get('RD0') === 1, { maxSteps: 1500000, events: [{ step: 300000, pins: { B: 1 } }] });
  t('Activity 10', A('Activity 10.txt'), r => r.get('FREQ.D0') > 9500 && r.get('FREQ.D0') < 10500, { maxSteps: 200000 });
  t('Activity 11', A('Activity 11.txt'), r => Math.abs(r.get('PERIOD.D0') - 100000) < 1000 && Math.abs(r.get('PERIOD.D1') - 1000000) < 3000, { maxSteps: 3000000 });
  t('Activity 14', A('Activity 14.txt'), r => r.get('PORTD') === 128, { maxSteps: 3000, init: { analog: { 0: 2.5 } } });
  t('Activity 15', A('Activity 15.txt'), r => r.get('LCD1') === 'I LOVE MICRO :)' && r.get('LCD2') === '@ HCT', { maxSteps: 120000 });
}
console.log('Assembly simulator tests: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
