/* Unit tests for the C interpreter (run: node tests/test_c.js) */
const path = require('path');
require(path.join(__dirname, '../src/js/pic.js'));
require(path.join(__dirname, '../src/js/asm.js'));
require(path.join(__dirname, '../src/js/cinterp.js'));
const fs = require('fs');
let pass = 0, fail = 0;
function t(name, src, check, opts) {
  let r;
  try { r = CInterp.run(src, opts); } catch (e) { console.log('CRASH ' + name + ': ' + e.stack); fail++; return; }
  let ok, msg = '';
  try { ok = check(r); } catch (e) { ok = false; msg = e.message; }
  if (ok) pass++; else { fail++; console.log('FAIL ' + name + ' ' + msg + '\n  errors=' + JSON.stringify(r.errors) + '\n  out=' + JSON.stringify(r.out) + ' halted=' + r.halted + ' warn=' + JSON.stringify(r.warnings)); }
}
const H = '#include <stdio.h>\n';
t('hello', H + 'int main(void){ printf("Hi there!\\n"); return 0; }', r => r.out === 'Hi there!\n');
t('arith', H + 'int main(){ printf("%d %d %d %d\\n", 2+5, 3*3, 2+2*10, 7/2); printf("%d %d\\n", -7/2, -7%2); }', r => r.out === '7 9 22 3\n-3 -1\n');
t('int16 overflow', H + 'void main(void){ int a = 30000; int b = a + 30000; printf("%d\\n", b); }', r => r.out === '-5536\n');
t('char unsigned', H + 'void main(void){ char c = -1; signed char s = -1; printf("%d %d\\n", c, s); }', r => r.out === '255 -1\n');
t('uchar wrap', H + 'void main(void){ unsigned char a = 200, b = 100; unsigned char c = a + b; int d = a + b; printf("%d %d\\n", c, d); }', r => r.out === '44 300\n');
t('sizeof', H + 'void main(void){ printf("%u %u %u %u %u %u\\n", sizeof(char), sizeof(int), sizeof(short long), sizeof(long), sizeof(float), sizeof(char*)); }', r => r.out === '1 2 3 4 4 2\n');
t('long print', H + 'void main(void){ long x = 100000; printf("%ld\\n", x * 3); }', r => r.out === '300000\n');
t('long via %d warns', H + 'void main(void){ long x = 100000; printf("%d\\n", x); }', r => r.out === '-31072\n' && r.warnings.length > 0);
t('unsigned compare', H + 'void main(void){ int a = -1; unsigned int b = 1; if (a < b) printf("less\\n"); else printf("not less\\n"); }', r => r.out === 'not less\n');
t('hex fmt', H + 'void main(void){ printf("%x %X %04X %o %c %5d|%-3d|\\n", 255, 255, 26, 8, 65, 42, 7); }', r => r.out === 'ff FF 001A 10 A    42|7  |\n');
t('float', H + 'void main(void){ float t = 512 * 100.0 / 1023; printf("%.2f\\n", t); int i = (int) t; printf("%d\\n", i); }', r => r.out === '50.05\n50\n');
t('loops', H + 'void main(void){ int s = 0; for (int i = 1; i <= 10; i++) s += i; int j = 0; while (j < 3) j++; do { j--; } while (j > 0); printf("%d %d\\n", s, j); }', r => r.out === '55 0\n');
t('break continue', H + 'void main(void){ int i; for (i = 0; i < 10; i++) { if (i % 2) continue; if (i == 6) break; printf("%d", i); } printf("\\n"); }', r => r.out === '024\n');
t('switch', H + 'void main(void){ for (int i = 0; i < 4; i++) { switch (i) { case 0: printf("a"); case 1: printf("b"); break; case 2: printf("c"); break; default: printf("d"); } } printf("\\n"); }', r => r.out === 'abbcd\n');
t('functions', H + 'int square(int x){ return x * x; }\nint max3(int a, int b, int c){ int m = a; if (b > m) m = b; if (c > m) m = c; return m; }\nvoid main(void){ printf("%d %d\\n", square(7), max3(4, 9, 2)); }', r => r.out === '49 9\n');
t('call mode', 'int max3(int a, int b, int c){ int m = a; if (b > m) m = b; if (c > m) m = c; return m; }', r => r.ret === 9, { call: 'max3', args: [4, 9, 2] });
t('arrays', H + 'void main(void){ int a[5] = {5, 3, 8, 1, 4}; int m = a[0]; for (int i = 1; i < 5; i++) if (a[i] > m) m = a[i]; printf("%d %u\\n", m, sizeof(a)); }', r => r.out === '8 10\n');
t('array bounds', H + 'void main(void){ int a[3]; a[3] = 1; }', r => !r.ok && /outside the array/.test(r.errors[0].msg));
t('strings', H + '#include <string.h>\nvoid main(void){ char s[20] = "Hello"; strcat(s, " PIC"); printf("%s %u %c\\n", s, strlen(s), s[1]); }', r => r.out === 'Hello PIC 9 e\n');
t('pointers', H + 'void swap(int *a, int *b){ int t = *a; *a = *b; *b = t; }\nvoid main(void){ int x = 1, y = 2; swap(&x, &y); int arr[3] = {7,8,9}; int *p = arr; p++; printf("%d %d %d %d\\n", x, y, *p, *(p+1)); }', r => r.out === '2 1 8 9\n');
t('char arithmetic', H + 'void main(void){ char d = \'7\'; int v = d - 48; char u = \'a\' - 32; printf("%d %c\\n", v, u); }', r => r.out === '7 A\n');
t('scanf', H + 'void main(void){ int a, b; scanf("%d", &a); scanf("%d", &b); printf("Sum: %d\\n", a + b); }', r => r.out === 'Sum: 12\n', { stdin: '5\n7\n' });
t('scanf forgot &', H + 'void main(void){ int a; scanf("%d", a); }', r => !r.ok && /&/.test(r.errors[0].msg), { stdin: '5\n' });
t('struct', H + 'struct Motor { char dir; unsigned char speed; };\nvoid main(void){ struct Motor m = {\'L\', 200}; struct Motor *p = &m; p->speed = 100; printf("%c %d %u\\n", m.dir, m.speed, sizeof(struct Motor)); }', r => r.out === 'L 100 2\n');
t('union endian', H + 'union W { unsigned int w; unsigned char b[2]; };\nvoid main(void){ union W x; x.w = 0x1234; printf("%X %X\\n", x.b[0], x.b[1]); }', r => r.out === '34 12\n');
t('enum typedef', H + 'typedef unsigned char byte;\nenum State { IDLE, RUN = 5, STOP };\nvoid main(void){ byte b = 300; enum State s = STOP; printf("%d %d\\n", b, s); }', r => r.out === '44 6\n');
t('stdint', H + '#include <stdint.h>\nvoid main(void){ uint8_t a = 255; a++; int16_t b = -2; uint32_t c = 70000; printf("%d %d %lu\\n", a, b, c); }', r => r.out === '0 -2 70000\n');
t('bitwise', H + 'void main(void){ unsigned char p = 0b10100001, q = 0b11011100; printf("%u %u %u %u %u\\n", p & q, p | q, p ^ q, (unsigned char)~p, p >> 4); }', r => r.out === '128 253 125 94 10\n');
t('shift long', H + 'void main(void){ unsigned long x = 1; x = x << 31; printf("%lu\\n", x); unsigned int h = 0x03, l = 0xFF; unsigned int v = (h << 8) | l; printf("%u %u\\n", v, v >> 6); }', r => r.out === '2147483648\n1023 15\n');
t('static', H + 'int counter(void){ static int n = 0; n++; return n; }\nvoid main(void){ counter(); counter(); printf("%d\\n", counter()); }', r => r.out === '3\n');
t('const', 'void main(void){ const int N = 5; N = 6; }', r => !r.ok && /const/.test(r.errors[0].msg));
t('recursion rejected', H + 'int f(int n){ if (n <= 1) return 1; return n * f(n - 1); }\nvoid main(void){ printf("%d", f(5)); }', r => !r.ok && /Recursion/.test(r.errors[0].msg));
t('missing semicolon', H + 'void main(void){ int x = 5\n printf("%d", x); }', r => !r.ok && r.errors[0].line === 2 && /;/.test(r.errors[0].msg));
t('undeclared', H + 'void main(void){ x = 5; }', r => !r.ok && /not declared/.test(r.errors[0].msg));
t('missing include', 'void main(void){ printf("hi"); }', r => !r.ok && /stdio/.test(r.errors[0].msg));
t('missing xc', 'void main(void){ PORTD = 1; }', r => !r.ok && /xc\.h/.test(r.errors[0].msg));
t('missing xtal', '#include <xc.h>\nvoid main(void){ __delay_ms(10); }', r => !r.ok && /_XTAL_FREQ/.test(r.errors[0].msg));
t('div zero', H + 'void main(void){ int a = 0; printf("%d", 5 / a); }', r => !r.ok && /zero/.test(r.errors[0].msg));
t('infinite loop', H + 'void main(void){ while(1) { } }', r => r.halted === 'limit', { maxSteps: 10000 });
t('putch override', H + '#include <xc.h>\nvoid putch(char c){ while(!TXIF); TXREG = c; }\nvoid main(void){ TXSTA = 0b00100100; RCSTA = 0b10010000; SPBRG = 25; printf("OK"); while(1); }', r => r.term === 'OK', { maxCycles: 100000 });
t('macro fn', H + '#define SQUARE(x) ((x) * (x))\n#define LIMIT 40\nvoid main(void){ printf("%d %d\\n", SQUARE(3 + 1), LIMIT); }', r => r.out === '16 40\n');
t('ifdef', H + '#define DEBUG\n#ifdef DEBUG\n#define MSG "dbg"\n#else\n#define MSG "rel"\n#endif\nvoid main(void){ printf(MSG); }', r => r.out === 'dbg');
t('garbage local', H + 'void main(void){ int x; printf("%d\\n", x); }', r => r.ok && r.out !== '0\n');
t('ternary comma', H + 'void main(void){ int a = 5, b; b = a > 3 ? 10 : 20; printf("%d\\n", b); }', r => r.out === '10\n');
t('2d array', H + 'void main(void){ int m[2][3] = {{1,2,3},{4,5,6}}; printf("%d %d\\n", m[1][2], m[0][1]); }', r => r.out === '6 2\n');
t('itoa', H + '#include <stdlib.h>\nvoid main(void){ char buf[7]; itoa(buf, -1234, 10); printf("[%s]\\n", buf); }', r => r.out === '[-1234]\n');
t('itoa overflow', H + '#include <stdlib.h>\nvoid main(void){ char buf[3]; itoa(buf, 1234, 10); }', r => !r.ok);
t('stack depth', H + 'void f9(void){} void f8(void){f9();} void f7(void){f8();} void f6(void){f7();} void f5(void){f6();} void f4(void){f5();} void f3(void){f4();} void f2(void){f3();} void f1(void){f2();}\nvoid main(void){ f1(); }', r => !r.ok && /Stack overflow/.test(r.errors[0].msg));
t('8 levels ok', H + 'void f8(void){} void f7(void){f8();} void f6(void){f7();} void f5(void){f6();} void f4(void){f5();} void f3(void){f4();} void f2(void){f3();} void f1(void){f2();}\nvoid main(void){ f1(); printf("ok"); }', r => r.ok && r.out === 'ok');
t('array arg', 'int sum(int *a, int n){ int s = 0; for (int i = 0; i < n; i++) s += a[i]; return s; }', r => r.ret === 10, { call: 'sum', args: [[1, 2, 3, 4], 4] });
t('string arg', 'int count_a(char *s){ int n = 0; while (*s) { if (*s == \'a\') n++; s++; } return n; }', r => r.ret === 3, { call: 'count_a', args: ['banana'] });
t('modify array arg', 'void dbl(int *a, int n){ for (int i = 0; i < n; i++) a[i] *= 2; }', r => JSON.stringify(r.arrays[0]) === '[2,4,6]', { call: 'dbl', args: [[1, 2, 3], 3] });
t('getchar', H + 'void main(void){ int c; int n = 0; while ((c = getchar()) != EOF) if (c == \'x\') n++; printf("%d\\n", n); }', r => r.out === '2\n', { stdin: 'axbx' });

/* ---------- hardware: the lecture activities in C ---------- */
const dir = '/tmp/untrusted/activities/activitys/';
const has = (f) => fs.existsSync(dir + f);
if (has('Activity 5 in C.txt')) {
  const src = fs.readFileSync(dir + 'Activity 5 in C.txt', 'utf8');
  t('Activity 5C', src, r => r.get('RD0') === 1, { maxCycles: 20000, events: [{ at: 2000, pins: { D: 0b010 } }, { at: 4000, pins: { D: 0 } }] });
  t('Activity 5C off', src, r => r.get('RD0') === 0, { maxCycles: 20000, events: [{ at: 2000, pins: { D: 0b010 } }, { at: 4000, pins: { D: 0b100 } }, { at: 6000, pins: { D: 0 } }] });
}
if (has('Activity 6 in C.txt')) t('Activity 6C blink', fs.readFileSync(dir + 'Activity 6 in C.txt', 'utf8'), r => Math.abs(r.get('PERIOD.D0') - 2050000) < 2000 && Math.abs(r.get('HIGH.D0') - 50000) < 500, { maxCycles: 9000000 });
if (has('Activity 7 in C.txt')) {
  const src = fs.readFileSync(dir + 'Activity 7 in C.txt', 'utf8');
  [[0b1001, 0b111], [0b0111, 0b100], [0b1100, 0b011], [0b0101, 0]].forEach(([i, o]) => t('Activity 7C ' + i, src, r => r.get('PORTC') === o, { maxCycles: 5000, init: { pins: { D: i } } }));
}
if (has('Activity 8 in C.txt')) t('Activity 8C int', fs.readFileSync(dir + 'Activity 8 in C.txt', 'utf8'), r => r.get('RD0') === 1 && r.get('INTF') === 0, { maxCycles: 2000000, events: [{ at: 700000, pins: { B: 1 } }] });
if (has('Activity 8 in C.txt')) t('Activity 8C no int', fs.readFileSync(dir + 'Activity 8 in C.txt', 'utf8'), r => r.get('RD0') === 0 && Math.abs(r.get('PERIOD.D1') - 1000000) < 3000, { maxCycles: 4000000 });
if (has('Activity 9 in C.txt')) t('Activity 9C', fs.readFileSync(dir + 'Activity 9 in C.txt', 'utf8'), r => r.get('RD0') === 0 && r.get('RISES.D0') === 1 && r.get('HIGH.D0') > 490000 && r.get('HIGH.D0') < 520000, { maxCycles: 3000000, events: [{ at: 700000, pins: { B: 1 } }] });
if (has('Activity 13 in C.txt')) t('Activity 13C pwm', fs.readFileSync(dir + 'Activity 13 in C.txt', 'utf8'), r => r.get('PWM1.PERIOD') === 4096 && r.get('PWM1.FREQ') > 244 && r.get('PWM1.FREQ') < 244.3 && r.get('CCPR1L') + r.get('CCPR2L') === 255, { maxCycles: 600000 });
if (has('Activity 16 in C.txt')) {
  const src = fs.readFileSync(dir + 'Activity 16 in C.txt', 'utf8');
  t('Activity 16C hot', src, r => r.get('LCD1') === 'Temp is: 50c' && r.get('LCD2') === 'Hot', { maxCycles: 3500000, init: { analog: { 0: 0.5 }, vrefP: 1 } });
  t('Activity 16C cold', src, r => r.get('LCD1') === 'Temp is: 25c' && r.get('LCD2') === 'Cold', { maxCycles: 3500000, init: { analog: { 0: 0.25 }, vrefP: 1 } });
}
console.log('C interpreter tests: ' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
