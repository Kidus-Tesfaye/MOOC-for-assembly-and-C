/* Part 8 - Data types and arithmetic (Lecture 8: data types in XC8; Lecture 2; Activity 16C formulas) */
(function () {
const START = R`#include <stdio.h>

void main(void) {

}
`;
const prog = (body) => '#include <stdio.h>\n\nvoid main(void) {\n' + body.replace(/^/gm, '    ') + '\n}\n';
const ASTART = '; write your code here\n\n    GOTO $\n';
D.part({
  title: 'Data types and arithmetic',
  intro: R`<p>On an 8-bit processor every byte counts, and the type of a variable decides how many bytes it uses and which values it can hold. In this part you study the types of XC8 in detail, the rules C follows when it mixes types in a calculation, floating-point and fixed-point numbers, and how numbers larger than a byte are handled in assembly.</p>`,
  sections: [
    {
      title: 'The types of XC8',
      objectives: ['You will know the size and range of every integer type of XC8', 'You will know that a plain <code>char</code> is unsigned in XC8', 'You will know what little endian means'],
      blocks: [
        D.T(R`<p>The XC8 compiler supports integer types of $1$, $2$, $3$ and $4$ bytes, and a single-bit type. If no signedness is written, an integer type is <b>signed</b>, except the <code>char</code> types, which are always <b>unsigned</b> in XC8. Signed values are stored in two's complement.</p>`),
        D.TABLE(['Type', 'Size', 'Range'], [
          ['<code>bit</code> (or <code>__bit</code>)', '1 bit', '$0$ or $1$'],
          ['<code>char</code>, <code>unsigned char</code>', '8 bits', '$0 \\ldots 255$'],
          ['<code>signed char</code>', '8 bits', '$-128 \\ldots 127$'],
          ['<code>short</code>, <code>int</code>', '16 bits', '$-32768 \\ldots 32767$'],
          ['<code>unsigned short</code>, <code>unsigned int</code>', '16 bits', '$0 \\ldots 65535$'],
          ['<code>short long</code>', '24 bits', '$-8\\,388\\,608 \\ldots 8\\,388\\,607$'],
          ['<code>unsigned short long</code>', '24 bits', '$0 \\ldots 16\\,777\\,215$'],
          ['<code>long</code>', '32 bits', '$-2\\,147\\,483\\,648 \\ldots 2\\,147\\,483\\,647$'],
          ['<code>unsigned long</code>', '32 bits', '$0 \\ldots 4\\,294\\,967\\,295$'],
          ['<code>float</code>, <code>double</code>', '32 bits (or 24 bits)', R`about $\pm 3.4 \times 10^{38}$, $6$–$7$ significant digits`]
        ], { cap: R`With XC8 2.x in C99 mode (the version used by the activities), <code>float</code> and <code>double</code> are 32 bits. The lecture quotes the older C90 mode, where 24-bit floating point was the default (options <code>--FLOAT=24</code> and <code>--DOUBLE=24</code>).` }),
        D.T(R`<p>The header <code>&lt;stdint.h&gt;</code> gives the same types names that say their size: <code>uint8_t</code>, <code>int16_t</code>, <code>uint32_t</code>... They make a program easier to move to another processor. The operator <code>sizeof</code> gives the size of a type or a variable in bytes: on the PIC, <code>sizeof(int)</code> is $2$.</p>
<p>Values of several bytes are stored in <b>little endian</b> order: the least significant byte at the lowest address. The value $1234_{16}$ of an <code>unsigned int</code> is stored as the byte $34_{16}$ followed by $12_{16}$. A <code>union</code> (several variables sharing the same memory) makes this visible:</p>`),
        D.CODE(R`union {
    unsigned int word;
    unsigned char byte[2];
} u;

u.word = 0x1234;
printf("%X %X\n", u.byte[0], u.byte[1]);`),
        D.OUT('34 12'),
        D.mc('Plain char', 'In XC8, what is the range of a variable declared simply as <code>char</code>?', ['$0 \\ldots 255$', '$-128 \\ldots 127$', '$0 \\ldots 65535$', 'It depends on the value'], 0, 'In XC8 the char types are always unsigned, unless declared signed char.', { hint: 'The lecture: "except for the char types, which are always unsigned".' }),
        D.multi('Sizes', R`<p>Give the size in bytes of each type in XC8.</p>`, [{ label: '<code>int</code>:', ans: [2] }, { label: '<code>short long</code>:', ans: [3] }, { label: '<code>long</code>:', ans: [4] }, { label: '<code>float</code>:', ans: [4] }], 'int is 16 bits, short long 24 bits, long and float 32 bits.', { hint: 'One byte is 8 bits.' }),
        D.mc('Which type?', R`<p>Which is the smallest type that can store the number of seconds in a day, $86400$?</p>`, ['<code>unsigned short long</code> (24 bits)', '<code>int</code>', '<code>unsigned int</code>', '<code>unsigned char</code>'], 0, R`$86400 > 65535$, so 16 bits are not enough; 24 bits hold up to $16\,777\,215$.`, { hint: R`Compare $86400$ with $65535$.` }),
        D.c('Sizes with sizeof', R`<p>Write a program which prints the sizes of <code>char</code>, <code>int</code>, <code>long</code> and <code>float</code> with <code>sizeof</code>, in the format shown.</p>`, {
          start: START, sample: R`char: 1
int: 2
long: 4
float: 4`,
          tests: [{ name: 'Output', out: 'char: 1\nint: 2\nlong: 4\nfloat: 4\n' }],
          reqs: [{ re: /sizeof/, msg: 'Use sizeof.' }],
          solution: prog(R`printf("char: %u\n", sizeof(char));
printf("int: %u\n", sizeof(int));
printf("long: %u\n", sizeof(long));
printf("float: %u\n", sizeof(float));`)
        }, '', { hint: R`<code>sizeof(int)</code> is an unsigned number: print it with <code>%u</code>.` }),
        D.c('Little endian', R`<p>Using a <code>union</code> of an <code>unsigned long</code> and an array of four <code>unsigned char</code>, print the four bytes of the value in the global variable <code>value</code>, from the lowest address to the highest, in hexadecimal with two digits each, separated by spaces.</p>`, {
          start: R`#include <stdio.h>

unsigned long value = 0x12345678;

void main(void) {

}
`, sample: '78 56 34 12',
          tests: [{ name: R`$12345678_{16}$`, out: '78 56 34 12\n' }, { name: R`$A1B2C3D4_{16}$`, setGlobals: { value: 0xA1B2C3D4 }, out: 'D4 C3 B2 A1\n' }],
          reqs: [{ re: /union/, msg: 'Use a union.' }],
          solution: R`#include <stdio.h>

unsigned long value = 0x12345678;

void main(void) {
    union {
        unsigned long l;
        unsigned char b[4];
    } u;
    u.l = value;
    printf("%02X %02X %02X %02X\n", u.b[0], u.b[1], u.b[2], u.b[3]);
}
`
        }, '', { hint: R`Declare <code>union { unsigned long l; unsigned char b[4]; } u;</code>, store <code>value</code> in <code>u.l</code> and print <code>u.b[0]</code> to <code>u.b[3]</code>.` })
      ]
    },
    {
      title: 'Overflow, promotion and casts',
      objectives: ['You will know how C converts types inside an expression (integer promotion)', 'You will be able to avoid overflow by choosing the right type', 'You will be able to convert a value with a cast'],
      blocks: [
        D.T(R`<p>Before an arithmetic operation, C converts the operands to a common type with two rules:</p>
<ol>
<li><b>Integer promotion</b>: a value smaller than an <code>int</code> (<code>char</code>, <code>bit</code>) is first converted to <code>int</code>.</li>
<li><b>Usual arithmetic conversions</b>: if the two operands still have different types, the "smaller" is converted to the "larger": <code>int</code> $\to$ <code>long</code> $\to$ <code>float</code>; and an <code>unsigned</code> type wins over a signed type of the same size.</li>
</ol>
<p>The result has that common type. Only when it is stored does it get converted to the type of the variable:</p>`),
        D.CODE(R`unsigned char a = 200, b = 100;
int sum = a + b;            // 300: a and b are promoted to int first
unsigned char c = a + b;    // 300 does not fit: c = 44
long big = 300 * 300;       // int * int overflows BEFORE it is stored: 24464
long ok = 300L * 300;       // long * int is calculated as long: 90000`),
        D.T(R`<p>The last two lines show the most common trap: storing a result in a <code>long</code> does not help if the calculation itself is done in 16 bits. $300 \times 300 = 90000$ does not fit in an <code>int</code>; its lowest 16 bits are $90000 - 65536 = 24464$. Making one operand <code>long</code> (with the suffix <code>L</code> or a cast) makes the whole multiplication 32-bit.</p>`),
        D.H('Casts'),
        D.T(R`<p>A <b>cast</b> converts a value to another type explicitly: the type is written in parentheses before the value. Activity 16C uses casts in both directions:</p>`),
        D.CODE(R`float temperature = (float) AN0_value * 100 / 1023;   // calculate with decimals
itoa(phrase, (int) temperature, 10);                   // drop the decimals`),
        D.T(R`<p>Converting a float to an integer drops the fractional part (it truncates towards zero: $(int)\,2.9 = 2$ and $(int)\,{-2.9} = -2$). Integer division also truncates, so to get decimals at least one operand must be a float: <code>7 / 2</code> is $3$ but <code>(float) 7 / 2</code> is $3.5$.</p>`),
        D.WARN('Signed and unsigned in a comparison', R`<p>With <code>int a = -1;</code> and <code>unsigned int b = 1;</code>, the condition <code>a &lt; b</code> is <b>false</b>: <code>a</code> is converted to <code>unsigned int</code> and becomes $65535$. Avoid comparing signed and unsigned variables.</p>`),
        D.num('Promotion', R`<p>With <code>unsigned char x = 250;</code>, what does <code>printf("%d\n", x + 10);</code> print?</p>`, 260, R`<code>x</code> is promoted to <code>int</code> before the addition, so the result is $260$; nothing is stored in a byte.`, { hint: 'The sum is calculated as an int.' }),
        D.num('The 16-bit trap', R`<p>What does <code>long r = 250 * 400;</code> store in <code>r</code> with XC8?</p>`, 100000 - 131072, R`$250 \times 400 = 100000$ is calculated as an <code>int</code>: $100000 - 65536 = 34464$, which as a signed 16-bit number is $34464 - 65536 = -31072$.`, { hint: R`The multiplication is done in 16 bits. Keep the lowest 16 bits, then remember that an int is signed.` }),
        D.c('Fix the overflow', R`<p>The program below should print the energy $E = V \times I \times t$ of a battery in millijoules, but the result is wrong. Fix the calculation (without changing the types of <code>v</code>, <code>i</code> and <code>t</code>) so that it prints the correct value.</p>`, {
          start: R`#include <stdio.h>

int v = 5;        // volts
int i = 200;      // milliamperes
int t = 3600;     // seconds

void main(void) {
    long e = v * i * t;
    printf("E = %ld mJ\n", e);
}
`, sample: 'E = 3600000 mJ',
          tests: [{ name: '5 V, 200 mA, 3600 s', out: 'E = 3600000 mJ\n' }, { name: '12 V, 1000 mA, 60 s', setGlobals: { v: 12, i: 1000, t: 60 }, out: 'E = 720000 mJ\n' }],
          forbid: [{ re: /long\s+v|long\s+i\b|long\s+t\b/, msg: 'Keep the types of v, i and t: change the calculation instead.' }],
          solution: R`#include <stdio.h>

int v = 5;        // volts
int i = 200;      // milliamperes
int t = 3600;     // seconds

void main(void) {
    long e = (long) v * i * t;
    printf("E = %ld mJ\n", e);
}
`
        }, '', { hint: R`Cast the first operand: <code>(long) v * i * t</code>. Then every multiplication is done with 32 bits.` }),
        D.c('Average with decimals', R`<p>Write a function <code>float average(int a, int b, int c)</code> which returns the exact average of three integers, with decimals.</p>`, {
          start: R`float average(int a, int b, int c) {

}
`, tests: [{ call: 'average', args: [1, 2, 4], ret: 2.333333 }, { call: 'average', args: [10, 20, 30], ret: 20 }, { call: 'average', args: [-3, 0, 4], ret: 0.333333 }],
          solution: R`float average(int a, int b, int c) {
    return (float)(a + b + c) / 3;
}
`
        }, '', { hint: R`Convert the sum to <code>float</code> before dividing: <code>(float)(a + b + c) / 3</code>.` }),
        D.mc('Comparison trap', R`<p>What does this code print?</p>`, ['<code>greater</code>', '<code>smaller</code>', '<code>equal</code>', 'It does not compile'], 0, R`<code>a</code> is converted to <code>unsigned int</code>: $-1$ becomes $65535$, which is greater than $10$.`, { snippet: { text: R`int a = -1;
unsigned int b = 10;
if (a < b) printf("smaller\n");
else if (a == b) printf("equal\n");
else printf("greater\n");`, lang: 'c' }, hint: 'Which type wins when int meets unsigned int?' })
      ]
    },
    {
      title: 'Floating point and fixed point',
      objectives: ['You will be able to calculate and print with <code>float</code>', 'You will know why floating point is expensive on an 8-bit processor', 'You will be able to use fixed-point integers instead'],
      blocks: [
        D.T(R`<p>A <code>float</code> stores a number with decimals in a binary form of scientific notation: a sign, a mantissa and an exponent. It has about $7$ significant digits, so it cannot represent every decimal number exactly: $0.1$ is stored as $0.100000001490116\ldots$ Print floats with <code>%f</code>, or with <code>%.2f</code> to choose $2$ decimals.</p>`),
        D.CODE(R`float t = 512 * 100.0 / 1023;
printf("%f\n", t);
printf("%.1f\n", t);`),
        D.OUT(R`50.048874
50.0`),
        D.T(R`<p>The PIC16 has no hardware for floating point (not even for multiplication), so every float operation is a long subroutine: slow and large. A common alternative is <b>fixed point</b>: keep integers that count a small unit. A temperature of $25.3\,^{\circ}\mathrm{C}$ is stored as $253$ tenths of a degree; a voltage of $2.5\ \mathrm{V}$ as $2500$ millivolts. The calculation stays in integers, and the decimal point is only added when printing:</p>`),
        D.CODE(R`int tenths = 253;                               // 25.3 degrees
printf("%d.%d C\n", tenths / 10, tenths % 10);`),
        D.OUT('25.3 C'),
        D.T(R`<p>The order of the operations matters with integers. To scale an A/D reading of $0 \ldots 1023$ to millivolts ($0 \ldots 5000$), multiply first and divide last, with a <code>long</code> to avoid overflow:</p>
$$V_{\text{mV}} = \frac{\text{reading} \times 5000}{1023}.$$
<p>Dividing first (<code>reading / 1023 * 5000</code>) would give $0$ for every reading below $1023$.</p>`),
        D.c('Celsius to Fahrenheit', R`<p>Write a function <code>float to_fahrenheit(float c)</code> which converts a temperature from degrees Celsius: $F = \frac{9}{5}\,C + 32$.</p>`, {
          start: R`float to_fahrenheit(float c) {

}
`, tests: [{ call: 'to_fahrenheit', args: [0], ret: 32 }, { call: 'to_fahrenheit', args: [100], ret: 212 }, { call: 'to_fahrenheit', args: [36.6], ret: 97.88 }, { call: 'to_fahrenheit', args: [-40], ret: -40 }],
          solution: R`float to_fahrenheit(float c) {
    return c * 9 / 5 + 32;
}
`
        }, '', { hint: R`Beware of <code>9 / 5</code>: with integers it is $1$. Write <code>c * 9 / 5</code> (c is a float) or <code>9.0 / 5</code>.` }),
        D.c('ADC to millivolts', R`<p>Write a function <code>int to_mv(int reading)</code> which converts an A/D reading ($0 \ldots 1023$) into millivolts with integer arithmetic: $\frac{\text{reading} \times 5000}{1023}$, rounded down.</p>`, {
          start: R`int to_mv(int reading) {

}
`, tests: [{ call: 'to_mv', args: [0], ret: 0 }, { call: 'to_mv', args: [1023], ret: 5000 }, { call: 'to_mv', args: [512], ret: 2502 }, { call: 'to_mv', args: [100], ret: 488 }],
          forbid: [{ re: /float|double/, msg: 'Use integer arithmetic only.' }],
          solution: R`int to_mv(int reading) {
    return (long) reading * 5000 / 1023;
}
`
        }, '', { hint: R`$1023 \times 5000$ does not fit in an int: multiply as a <code>long</code>, then divide.` }),
        D.c('Print a fixed-point value', R`<p>The global variable <code>tenths</code> holds a temperature in tenths of a degree (it is never negative). Print it with one decimal and the unit, as in the example.</p>`, {
          start: R`#include <stdio.h>

int tenths = 253;

void main(void) {

}
`, sample: 'Temperature: 25.3 C',
          tests: [{ name: '253', out: 'Temperature: 25.3 C\n' }, { name: '400', setGlobals: { tenths: 400 }, out: 'Temperature: 40.0 C\n' }, { name: '7', setGlobals: { tenths: 7 }, out: 'Temperature: 0.7 C\n' }],
          forbid: [{ re: /float|double/, msg: 'Use integers only.' }],
          solution: R`#include <stdio.h>

int tenths = 253;

void main(void) {
    printf("Temperature: %d.%d C\n", tenths / 10, tenths % 10);
}
`
        }, '', { hint: R`The integer part is <code>tenths / 10</code> and the decimal is <code>tenths % 10</code>.` }),
        D.num('Float precision', R`<p>About how many significant decimal digits does a 32-bit <code>float</code> keep?</p>`, 7, R`A 32-bit float has a 24-bit mantissa: $2^{24} \approx 1.7 \times 10^{7}$, about $7$ digits.`, { tol: 0, hint: 'The table at the beginning of this part tells it.' })
      ]
    },
    {
      title: 'Numbers bigger than a byte in assembly',
      objectives: ['You will be able to store a 16-bit number in two registers', 'You will be able to increment and add 16-bit numbers with the carry', 'You will be able to shift with RLF and RRF'],
      blocks: [
        D.T(R`<p>The registers of the PIC hold $8$ bits, so a $16$-bit number uses two of them: a <b>high</b> byte H and a <b>low</b> byte L, with value $256 \times H + L$. Timer1 is such a pair (TMR1H:TMR1L), and so is the 10-bit result of the A/D converter (ADRESH:ADRESL). Operations on such numbers are done one byte at a time, passing the carry from the low byte to the high byte:</p>`),
        D.SIDE(R`unsigned int n;
n = n + 1;`, R`    INCF    NL, F       ; low byte + 1
    BTFSC   STATUS, 2   ; became 0? (Z)
    INCF    NH, F       ; then carry into the high byte`, { cap: R`A 16-bit increment: when the low byte overflows from $255$ to $0$, the high byte is incremented.` }),
        D.SIDE(R`unsigned int a, b;
a = a + b;`, R`    MOVF    BL, W
    ADDWF   AL, F       ; low bytes, C = carry out
    BTFSC   STATUS, 0
    INCF    AH, F       ; add the carry
    MOVF    BH, W
    ADDWF   AH, F       ; high bytes`, { cap: R`A 16-bit addition: add the low bytes, add the carry to the high byte, then add the high bytes.` }),
        D.H('Rotations'),
        D.T(R`<p><code>RLF f, d</code> (rotate left through carry) shifts every bit one place to the left: bit 7 goes into C and the old C comes into bit 0. <code>RRF f, d</code> does the same to the right. With C $= 0$ first, <code>RLF</code> multiplies an unsigned byte by $2$ and <code>RRF</code> divides it by $2$; the bit that falls out is in C. For a $16$-bit number, rotate the low byte and then the high byte: the carry carries the bit across.</p>`),
        D.trace('Rotate left', R`<p>REG1 $= 1000\,0101_{2} = 133$ and C $= 0$. Follow the program and write REG1 and C after each instruction.</p>`, { pre: 'REG1 EQU 0x20', code: 'RLF REG1, F\nRLF REG1, F\nRRF REG1, F', watch: ['REG1', 'C'], init: { REG1: 133, C: 0 } }, R`$1000\,0101_{2}$ rotated left gives $0000\,1010_{2} = 10$ with C $= 1$; again: $0001\,0101_{2} = 21$ with C $= 0$; rotated right: $0000\,1010_{2} = 10$ with C $= 1$.`, { hint: 'Bit 7 goes into C, and C comes into bit 0.', note: R`Start: REG1 $= 1000\,0101_{2}$ and C $= 0$.` }),
        D.asm('16-bit increment', R`<p>The 16-bit number NH:NL must be incremented by one, with the carry going into NH when NL overflows. The tests start from several values.</p>`, {
          pre: 'NH EQU 0x20\nNL EQU 0x21', start: ASTART,
          tests: [{ name: R`$00FF_{16} + 1$`, init: { NH: 0, NL: 0xFF }, expect: { NH: 1, NL: 0 } }, { name: R`$1234_{16} + 1$`, init: { NH: 0x12, NL: 0x34 }, expect: { NH: 0x12, NL: 0x35 } }, { name: R`$0BFF_{16} + 1$`, init: { NH: 0x0B, NL: 0xFF }, expect: { NH: 0x0C, NL: 0 } }],
          solution: '    INCF NL, F\n    BTFSC STATUS, 2\n    INCF NH, F\n    GOTO $'
        }, 'INCF sets Z when the low byte wraps to 0; only then is the high byte incremented.', { hint: 'INCF NL, F; then test Z with BTFSC STATUS, 2 and increment NH.' }),
        D.asm('16-bit addition', R`<p>Add the 16-bit number BH:BL to AH:AL (the result stays in AH:AL). The tests check several values.</p>`, {
          pre: 'AH EQU 0x20\nAL EQU 0x21\nBH EQU 0x22\nBL EQU 0x23', start: ASTART,
          tests: [{ name: R`$01F0_{16} + 0020_{16}$`, init: { AH: 1, AL: 0xF0, BH: 0, BL: 0x20 }, expect: { AH: 2, AL: 0x10 } }, { name: R`$1000 + 2000$`, init: { AH: 3, AL: 0xE8, BH: 7, BL: 0xD0 }, expect: { AH: 0x0B, AL: 0xB8 } }, { name: R`$00FF_{16} + 00FF_{16}$`, init: { AH: 0, AL: 0xFF, BH: 0, BL: 0xFF }, expect: { AH: 1, AL: 0xFE } }],
          solution: '    MOVF BL, W\n    ADDWF AL, F\n    BTFSC STATUS, 0\n    INCF AH, F\n    MOVF BH, W\n    ADDWF AH, F\n    GOTO $'
        }, 'Low bytes first; the carry out of the low addition is added to the high byte, then the high bytes are added.', { hint: 'Copy the 16-bit addition shown above.' }),
        D.asm('Multiply by 4', R`<p>Multiply the register X by $4$ with two left rotations (the result is at most $255$). Clear the carry before each rotation so that a $0$ comes into bit 0.</p>`, {
          pre: 'X EQU 0x20', start: ASTART,
          tests: [{ name: R`$X = 13$`, init: { X: 13, C: 1 }, expect: { X: 52 } }, { name: R`$X = 60$`, init: { X: 60, C: 1 }, expect: { X: 240 } }],
          reqs: [{ re: /\bRLF\b/i, msg: 'Use RLF.' }],
          solution: '    BCF STATUS, 0\n    RLF X, F\n    BCF STATUS, 0\n    RLF X, F\n    GOTO $'
        }, R`Each left shift multiplies by $2$: $X \times 2 \times 2 = 4X$. Clearing C makes the new bit 0 a zero.`, { hint: 'BCF STATUS, 0 then RLF X, F, twice.' })
      ]
    }
  ]
});
})();
