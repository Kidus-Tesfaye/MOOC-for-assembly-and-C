/* Part 5 - Loops and time (loops in C and assembly; Lecture 5 execution speed; Lecture 8 delays; Activity 6) */
(function () {
const START = R`#include <stdio.h>

void main(void) {

}
`;
const prog = (body) => '#include <stdio.h>\n\nvoid main(void) {\n' + body.replace(/^/gm, '    ') + '\n}\n';
const ASTART = '; write your instructions here\n\n    GOTO $\n';
const cyc = (src) => { const r = Asm.run(src, {}); return r.m.cycles; };
D.part({
  title: 'Loops and time',
  intro: R`<p>A loop repeats a piece of code. In this part you write loops in C and in assembly, you learn how fast the PIC executes instructions, and you use loops to make the processor wait for an exact time, as in the blinking LED of Activity 6.</p>`,
  sections: [
    {
      title: 'Loops in C: while and for',
      objectives: ['You will be able to repeat code with <code>while</code>, <code>for</code> and <code>do</code>...<code>while</code>', 'You will be able to count, add up and stop a loop with <code>break</code>', 'You will know why a microcontroller program ends with <code>while (1)</code>'],
      blocks: [
        D.T(R`<p>A <code>while</code> loop repeats its block <b>as long as</b> its condition is true. The condition is checked before every round:</p>`),
        D.CODE(R`int i = 1;
while (i <= 5) {
    printf("%d\n", i);
    i++;
}
printf("Done!\n");`),
        D.OUT(R`1
2
3
4
5
Done!`),
        D.T(R`<p>A loop that counts has three parts: the start (<code>i = 1</code>), the condition (<code>i &lt;= 5</code>) and the step (<code>i++</code>). The <code>for</code> loop puts the three parts on one line, which makes counting loops easier to read. This loop does exactly the same as the one above:</p>`),
        D.CODE(R`for (int i = 1; i <= 5; i++) {
    printf("%d\n", i);
}`),
        D.T(R`<p>A <code>do</code> ... <code>while</code> loop checks its condition <i>after</i> each round, so its body runs at least once. The statement <code>break</code> leaves a loop immediately, and <code>continue</code> jumps to the next round.</p>`),
        D.KEY('The endless loop of a microcontroller', R`<p>A program on a desktop computer finishes and returns to the operating system. A microcontroller has no operating system: its program must never end. That is why every lecture activity has an endless loop, <code>while (1) { ... }</code> in C and <code>GOTO REPEAT</code> in assembly: the main task (read the switches, update the LEDs, blink...) repeats forever.</p>`),
        D.c('Countdown', R`<p>Write a program which asks for a number and counts down from it to $1$, then prints <code>Liftoff!</code></p>`, {
          start: START, sample: R`Start from: [[3]]
3
2
1
Liftoff!`,
          tests: [{ name: '3', stdin: '3\n', out: 'Start from: 3\n2\n1\nLiftoff!\n' }, { name: '5', stdin: '5\n', out: 'Start from: 5\n4\n3\n2\n1\nLiftoff!\n' }, { name: '1', stdin: '1\n', out: 'Start from: 1\nLiftoff!\n' }],
          solution: prog(R`int n;
printf("Start from: ");
scanf("%d", &n);
while (n >= 1) {
    printf("%d\n", n);
    n--;
}
printf("Liftoff!\n");`)
        }, '', { hint: R`Loop while the number is at least $1$; print it and decrease it with <code>n--</code> in each round.` }),
        D.c('Sum of the numbers', R`<p>Write a program which asks for a positive integer $n$ and prints the sum $1 + 2 + \ldots + n$. Use a <code>long</code> for the sum and print it with <code>%ld</code>: the sum grows fast.</p>`, {
          start: START, sample: R`Upper limit: [[10]]
The sum is 55`,
          tests: [{ name: '10', stdin: '10\n', out: 'Upper limit: The sum is 55\n' }, { name: '1', stdin: '1\n', out: 'Upper limit: The sum is 1\n' }, { name: '1000', stdin: '1000\n', out: 'Upper limit: The sum is 500500\n' }],
          reqs: [{ re: /\b(for|while)\b/, msg: 'Use a loop.' }],
          solution: prog(R`int n;
long sum = 0;
printf("Upper limit: ");
scanf("%d", &n);
for (int i = 1; i <= n; i++) {
    sum += i;
}
printf("The sum is %ld\n", sum);`)
        }, '', { hint: [R`Start with <code>long sum = 0;</code> and add each number with <code>sum += i;</code>.`, R`For $n = 1000$ the sum is $500500$, which does not fit in a 16-bit <code>int</code>.`] }),
        D.c('Multiplication table', R`<p>Write a program which asks for a number and prints its multiplication table from $1$ to $10$, in the format shown.</p>`, {
          start: START, sample: R`Number: [[7]]
1 x 7 = 7
2 x 7 = 14
3 x 7 = 21
4 x 7 = 28
5 x 7 = 35
6 x 7 = 42
7 x 7 = 49
8 x 7 = 56
9 x 7 = 63
10 x 7 = 70`,
          tests: [{ name: '7', stdin: '7\n', out: 'Number: ' + Array.from({ length: 10 }, (_, i) => (i + 1) + ' x 7 = ' + 7 * (i + 1)).join('\n') + '\n' }, { name: '12', stdin: '12\n', out: 'Number: ' + Array.from({ length: 10 }, (_, i) => (i + 1) + ' x 12 = ' + 12 * (i + 1)).join('\n') + '\n' }],
          reqs: [{ re: /\bfor\b/, msg: 'Use a for loop.' }],
          solution: prog(R`int n;
printf("Number: ");
scanf("%d", &n);
for (int i = 1; i <= 10; i++) {
    printf("%d x %d = %d\n", i, n, i * n);
}`)
        }, '', { hint: R`A <code>for</code> loop from $1$ to $10$ with one <code>printf</code> inside.` }),
        D.c('Powers of two', R`<p>Write a program which prints the powers of two $2^{0}, 2^{1}, \ldots, 2^{15}$, one per line, as unsigned numbers (<code>%u</code>). Start from $1$ and double the value in each round (multiplying by $2$, or adding the value to itself).</p>`, {
          start: START, sample: R`1
2
4
...
32768`,
          tests: [{ name: 'Output', out: Array.from({ length: 16 }, (_, i) => String(2 ** i)).join('\n') + '\n' }],
          reqs: [{ re: /\b(for|while)\b/, msg: 'Use a loop.' }],
          forbid: [{ re: /32768/, msg: 'Calculate the values in the loop.' }],
          solution: prog(R`unsigned int p = 1;
for (int i = 0; i < 16; i++) {
    printf("%u\n", p);
    p = p * 2;
}`)
        }, '', { hint: R`Use an <code>unsigned int</code>: $2^{15} = 32768$ does not fit in a signed 16-bit <code>int</code>, whose largest value is $32767$.` }),
        D.c('Sum until zero', R`<p>Write a program which reads integers until the user types $0$, and then prints how many numbers were typed (not counting the $0$) and their sum. Use <code>while (1)</code> and <code>break</code>.</p>`, {
          start: START, sample: R`Number: [[5]]
Number: [[22]]
Number: [[-7]]
Number: [[0]]
Count: 3, sum: 20`,
          tests: [{ name: '5 22 -7 0', stdin: '5\n22\n-7\n0\n', out: 'Number: Number: Number: Number: Count: 3, sum: 20\n' }, { name: '0', stdin: '0\n', out: 'Number: Count: 0, sum: 0\n' }, { name: '100 100 0', stdin: '100\n100\n0\n', out: 'Number: Number: Number: Count: 2, sum: 200\n' }],
          reqs: [{ re: /\bbreak\b/, msg: 'Leave the loop with break.' }],
          solution: prog(R`int count = 0, sum = 0, x;
while (1) {
    printf("Number: ");
    scanf("%d", &x);
    if (x == 0) {
        break;
    }
    count++;
    sum += x;
}
printf("Count: %d, sum: %d\n", count, sum);`)
        }, '', { hint: R`Inside <code>while (1)</code>: print the prompt, read <code>x</code>, and <code>break</code> if it is $0$; otherwise update the count and the sum.` }),
        D.c('A square of stars', R`<p>Nested loops: a loop inside another loop. Write a program which asks for a size and prints a square of <code>*</code> characters of that size.</p>`, {
          start: START, sample: R`Size: [[3]]
***
***
***`,
          tests: [{ name: '3', stdin: '3\n', out: 'Size: ***\n***\n***\n' }, { name: '5', stdin: '5\n', out: 'Size: *****\n*****\n*****\n*****\n*****\n' }, { name: '1', stdin: '1\n', out: 'Size: *\n' }],
          solution: prog(R`int n;
printf("Size: ");
scanf("%d", &n);
for (int row = 0; row < n; row++) {
    for (int col = 0; col < n; col++) {
        printf("*");
    }
    printf("\n");
}`)
        }, '', { hint: R`The outer loop counts the rows; the inner loop prints the stars of one row; after it, print <code>\n</code>.` }),
        D.mc('How many rounds?', R`<p>How many times does this loop print <code>hello</code>?</p>`, ['4', '5', '6', 'It never stops'], 0, R`$i$ takes the values $0, 3, 6, 9$; at $12$ the condition $12 < 12$ is false. That is $4$ rounds.`, { snippet: { text: R`for (int i = 0; i < 12; i += 3) {
    printf("hello\n");
}`, lang: 'c' }, hint: 'Write down the values of i: it starts at 0 and grows by 3.' }),
        D.mc('An unsigned trap', R`<p>Why does this loop never end on the PIC?</p>`, [R`An <code>unsigned char</code> is always $\geq 0$: after $0$ the value wraps around to $255$`, R`Because <code>i--</code> adds $1$`, R`Because the loop has no braces`, R`It ends after $11$ rounds`], 0, R`For an unsigned variable the condition <code>i &gt;= 0</code> is always true: decreasing $0$ gives $255$.`, { snippet: { text: R`unsigned char i;
for (i = 10; i >= 0; i--) {
    printf("%d\n", i);
}`, lang: 'c' }, hint: 'What value comes after 0 when an unsigned char is decreased?' })
      ]
    },
    {
      title: 'Loops in assembly',
      objectives: ['You will be able to write a loop with a label and GOTO', 'You will be able to count with DECFSZ and INCFSZ', 'You will be able to translate a counting loop from C into assembly'],
      blocks: [
        D.T(R`<p>In assembly a loop is a <code>GOTO</code> back to a label. The endless loop of the lecture activities is simply</p>`),
        D.CODE(R`REPEAT:
    ; ... the main task ...
    GOTO    REPEAT      ; repeat code`, 'asm'),
        D.T(R`<p>To repeat a block a fixed number of times, the PIC has two special instructions that change a register and skip when the result is zero:</p>`),
        D.TABLE(['Instruction', 'Operation'], [
          ['<code>DECFSZ f, d</code>', '$d \\leftarrow f - 1$, and skip the next instruction if the result is $0$'],
          ['<code>INCFSZ f, d</code>', '$d \\leftarrow f + 1$, and skip the next instruction if the result is $0$ (after $255$ comes $0$)']
        ]),
        D.T(R`<p>The usual counting loop loads a counter, runs the body and decrements the counter with <code>DECFSZ</code>; the <code>GOTO</code> back to the start is skipped when the counter reaches zero:</p>`),
        D.SIDE(R`count = 5;
do {
    total = total + 3;
    count--;
} while (count != 0);`, R`    MOVLW   5
    MOVWF   COUNT
LOOP:
    MOVLW   3
    ADDWF   TOTAL, F
    DECFSZ  COUNT, F    ; count - 1, skip if 0
    GOTO    LOOP
    ; continues here after 5 rounds`, { cap: R`The body runs $5$ times: <code>TOTAL</code> grows by $5 \times 3 = 15$. Note that <code>DECFSZ</code> tests the counter <i>after</i> the body, like a <code>do</code> ... <code>while</code> loop.` }),
        D.T(R`<p>For short jumps the lecture code often uses <code>$</code> instead of a label: <code>GOTO $-1</code> jumps one instruction back, so the pair <code>DECFSZ COUNT, F</code> / <code>GOTO $-1</code> is a loop that only counts down.</p>`),
        D.trace('DECFSZ loop', R`<p>Follow the loop and write REG1 after each executed instruction.</p>`, { pre: 'REG1 EQU 0x20', code: 'MOVLW 3\nMOVWF REG1\nDECFSZ REG1, F\nGOTO $-1\nMOVLW 7', watch: ['REG1'] }, R`REG1: $3, 2$, back, $1$, back, $0$: the last DECFSZ skips the GOTO, and MOVLW 7 runs.`, { hint: 'When DECFSZ gives 0, the GOTO is skipped.' }),
        D.asm('Multiply by adding', R`<p>The ALU of the PIC16 cannot multiply. Calculate $6 \times 4$ by adding $6$ four times: leave the result $24$ in RESULT. Use a counter with <code>DECFSZ</code>.</p>`, {
          pre: 'RESULT EQU 0x20\nCOUNT EQU 0x21', start: ASTART, tests: [{ expect: { RESULT: 24 } }], reqs: [{ re: /\bDECFSZ\b/i, msg: 'Use DECFSZ for the loop.' }], solution: '    CLRF RESULT\n    MOVLW 4\n    MOVWF COUNT\nLOOP:\n    MOVLW 6\n    ADDWF RESULT, F\n    DECFSZ COUNT, F\n    GOTO LOOP\n    GOTO $'
        }, R`$6 + 6 + 6 + 6 = 24$: a counter of $4$ repeats the addition.`, { hint: [R`Clear RESULT, load COUNT with $4$.`, R`In the loop: <code>MOVLW 6</code>, <code>ADDWF RESULT, F</code>, <code>DECFSZ COUNT, F</code>, <code>GOTO LOOP</code>.`] }),
        D.asm('Multiply two registers', R`<p>Calculate $\text{PRODUCT} = A \times B$ for unsigned numbers whose product is at most $255$, by adding A to PRODUCT, B times. If B is $0$ the product is $0$. The tests use several values.</p>`, {
          pre: 'A EQU 0x20\nB EQU 0x21\nPRODUCT EQU 0x22\nCOUNT EQU 0x23', start: ASTART,
          tests: [{ name: R`$7 \times 9$`, init: { A: 7, B: 9, PRODUCT: 99 }, expect: { PRODUCT: 63 } }, { name: R`$12 \times 1$`, init: { A: 12, B: 1, PRODUCT: 99 }, expect: { PRODUCT: 12 } }, { name: R`$50 \times 5$`, init: { A: 50, B: 5, PRODUCT: 99 }, expect: { PRODUCT: 250 } }, { name: R`$9 \times 0$`, init: { A: 9, B: 0, PRODUCT: 99 }, expect: { PRODUCT: 0 } }],
          solution: '    CLRF PRODUCT\n    MOVF B, W\n    BTFSC ZERO\n    GOTO DONE\n    MOVWF COUNT\nLOOP:\n    MOVF A, W\n    ADDWF PRODUCT, F\n    DECFSZ COUNT, F\n    GOTO LOOP\nDONE:\n    GOTO $'
        }, R`Copy B into a counter and add A in each round. B $= 0$ must be tested first: <code>DECFSZ</code> of $0$ gives $255$ and would loop $256$ times.`, { hint: [R`Use a copy of B as the counter (COUNT), so that B keeps its value.`, R`<code>MOVF B, W</code> sets Z when B is $0$: test it with <code>BTFSC ZERO</code> before the loop.`] }),
        D.asm('Divide by subtracting', R`<p>Division is not available either. Calculate the quotient and the remainder of $\frac{N}{D}$ by subtracting D from N as long as the rest is $\geq$ D, counting the subtractions in Q. At the end Q holds the quotient and R the remainder. D is never $0$.</p>`, {
          pre: 'N EQU 0x20\nD EQU 0x21\nQ EQU 0x22\nR EQU 0x23', start: ASTART,
          tests: [{ name: R`$N = 47$, $D = 5$`, init: { N: 47, D: 5 }, expect: { Q: 9, R: 2 } }, { name: R`$N = 60$, $D = 6$`, init: { N: 60, D: 6 }, expect: { Q: 10, R: 0 } }, { name: R`$N = 3$, $D = 7$`, init: { N: 3, D: 7 }, expect: { Q: 0, R: 3 } }, { name: R`$N = 255$, $D = 2$`, init: { N: 255, D: 2 }, expect: { Q: 127, R: 1 } }],
          solution: '    CLRF Q\n    MOVF N, W\n    MOVWF R\nLOOP:\n    MOVF D, W\n    SUBWF R, W\n    BTFSS STATUS, 0\n    GOTO DONE\n    MOVWF R\n    INCF Q, F\n    GOTO LOOP\nDONE:\n    GOTO $'
        }, R`R starts as a copy of N. In each round $R - D$ is calculated into W; if the carry is $1$ ($R \geq D$) it is stored back in R and Q is incremented.`, { hint: [R`Copy N into R and clear Q.`, R`<code>MOVF D, W</code>, <code>SUBWF R, W</code>: if C $= 0$ the subtraction would go below zero, so you are done; otherwise <code>MOVWF R</code> and <code>INCF Q, F</code>.`] }),
        D.asm('Sum of 1 to N', R`<p>Calculate $\text{SUM} = 1 + 2 + \ldots + N$ for $1 \leq N \leq 22$ (the result fits in a byte). Hint: count N down to $1$ and add the counter itself in each round.</p>`, {
          pre: 'N EQU 0x20\nSUM EQU 0x21\nCOUNT EQU 0x22', start: ASTART,
          tests: [{ name: 'N = 10', init: { N: 10 }, expect: { SUM: 55 } }, { name: 'N = 1', init: { N: 1 }, expect: { SUM: 1 } }, { name: 'N = 22', init: { N: 22 }, expect: { SUM: 253 } }],
          solution: '    CLRF SUM\n    MOVF N, W\n    MOVWF COUNT\nLOOP:\n    MOVF COUNT, W\n    ADDWF SUM, F\n    DECFSZ COUNT, F\n    GOTO LOOP\n    GOTO $'
        }, R`The counter takes the values $N, N-1, \ldots, 1$ and each one is added to SUM.`, { hint: R`Add <code>COUNT</code> itself (with <code>MOVF COUNT, W</code> and <code>ADDWF SUM, F</code>) before <code>DECFSZ COUNT, F</code>.` })
      ]
    },
    {
      title: 'How fast is an instruction?',
      objectives: ['You will be able to calculate the instruction time from the oscillator frequency', 'You will know which instructions take two cycles', 'You will be able to count the cycles of a short program'],
      blocks: [
        D.T(R`<p>No processor works without a clock. The oscillator produces a square wave of frequency $F_{\text{osc}}$ (also called $F_{\text{clk}}$), whose period is</p>
$$T_{\text{clk}} = \frac{1}{F_{\text{osc}}}.$$
<p>The clock can come from an external circuit (EC mode), from a quartz crystal or ceramic resonator (LP, XT and HS modes, for low, medium and high frequencies), from a resistor-capacitor circuit (RC mode), or from the two <b>internal oscillators</b> of the chip: the PIC16F887 can generate $8$ internal frequencies, from $31\ \mathrm{kHz}$ to $8\ \mathrm{MHz}$, selected with the register <b>OSCCON</b>. The default is $4\ \mathrm{MHz}$; the lecture activities select it explicitly with <code>OSCCON = 0b01100000</code>. The maximum clock of the chip is $20\ \mathrm{MHz}$.</p>
<p>Each instruction needs <b>4 clock periods</b>. This time is the <b>instruction cycle</b>:</p>
$$T_{\text{ins}} = 4\,T_{\text{clk}} = \frac{4}{F_{\text{osc}}}, \qquad F_{\text{ins}} = \frac{F_{\text{osc}}}{4}.$$`),
        D.EX('The usual 4 MHz clock', 'Fosc = 4 MHz', 'text', [], R`$T_{\text{clk}} = \frac{1}{4\,000\,000} = 0.25\ \mu\mathrm{s}$, $T_{\text{ins}} = 4 \times 0.25\ \mu\mathrm{s} = 1\ \mu\mathrm{s}$ and $F_{\text{ins}} = 1\ \mathrm{MHz}$: one million instructions per second (1 MIPS). At the maximum $20\ \mathrm{MHz}$, $T_{\text{ins}} = 200\ \mathrm{ns}$ and the PIC executes 5 MIPS.`, { lineNumbers: false }),
        D.T(R`<p>Some instructions take <b>two</b> instruction cycles: those that change the program counter. <code>GOTO</code>, <code>CALL</code>, <code>RETURN</code>, <code>RETFIE</code> and <code>RETLW</code> always take $2$ cycles; the conditional skips <code>BTFSS</code>, <code>BTFSC</code>, <code>INCFSZ</code> and <code>DECFSZ</code> take $2$ cycles only when they skip.</p>`),
        D.multi('Speed at 4 MHz', R`<p>For a $4\ \mathrm{MHz}$ oscillator, give $T_{\text{clk}}$, $T_{\text{ins}}$ and $F_{\text{ins}}$.</p>`, [{ label: R`$T_{\text{clk}} =$`, ans: [0.25], unit: 'µs', unitAlt: ['us', 'μs'] }, { label: R`$T_{\text{ins}} =$`, ans: [1], unit: 'µs', unitAlt: ['us', 'μs'] }, { label: R`$F_{\text{ins}} =$`, ans: [1], unit: 'MHz' }], R`$T_{\text{clk}} = \frac{1}{4\ \mathrm{MHz}} = 0.25\ \mu\mathrm{s}$, $T_{\text{ins}} = 4 \times 0.25 = 1\ \mu\mathrm{s}$, $F_{\text{ins}} = \frac{4\ \mathrm{MHz}}{4} = 1\ \mathrm{MHz}$.`, { hint: R`$T = \frac{1}{F}$, and one instruction takes 4 clock periods.` }),
        D.num('A 16 MHz crystal', R`<p>A PIC is connected to a $16\ \mathrm{MHz}$ crystal. What is the instruction time, in microseconds?</p>`, 0.25, R`$T_{\text{ins}} = \frac{4}{16\ \mathrm{MHz}} = 0.25\ \mu\mathrm{s}$.`, { unit: 'µs', unitAlt: ['us', 'μs'], hint: R`$T_{\text{ins}} = \frac{4}{F_{\text{osc}}}$.` }),
        D.num('Finding the frequency', R`<p>The instruction <code>MOVLW</code> takes $0.2\ \mu\mathrm{s}$. What is the oscillator frequency, in MHz?</p>`, 20, R`$F_{\text{osc}} = \frac{4}{T_{\text{ins}}} = \frac{4}{0.2\ \mu\mathrm{s}} = 20\ \mathrm{MHz}$.`, { unit: 'MHz', hint: 'MOVLW is a one-cycle instruction.' }),
        D.num('A two-cycle instruction', R`<p>The instruction <code>GOTO</code> takes $0.4\ \mu\mathrm{s}$. What is the oscillator frequency, in MHz?</p>`, 20, R`GOTO takes $2$ cycles, so $T_{\text{ins}} = 0.2\ \mu\mathrm{s}$ and $F_{\text{osc}} = \frac{4}{0.2\ \mu\mathrm{s}} = 20\ \mathrm{MHz}$.`, { unit: 'MHz', hint: 'How many cycles does GOTO take?' }),
        D.num('A very slow crystal', R`<p>What is the instruction time with a $4\ \mathrm{kHz}$ crystal, in milliseconds?</p>`, 1, R`$T_{\text{ins}} = \frac{4}{4000\ \mathrm{Hz}} = 1\ \mathrm{ms}$.`, { unit: 'ms', hint: R`$4\ \mathrm{kHz} = 4000\ \mathrm{Hz}$.` }),
        D.mc('Which instructions take two cycles?', 'Select all instructions that ALWAYS take two instruction cycles.', ['GOTO', 'CALL', 'RETURN', 'MOVLW', 'DECFSZ', 'RETLW'], [0, 1, 2, 5], 'Jumps and returns always take two cycles; DECFSZ takes two only when it skips; MOVLW takes one.', { hint: 'Instructions that change the program counter.' }),
        D.multi('DECFSZ cycles', R`<p>How many cycles does <code>DECFSZ Reg1, F</code> take in each case?</p>`, [{ label: R`Reg1 $= 20$:`, ans: [1], unit: 'cycle' }, { label: R`Reg1 $= 1$:`, ans: [2], unit: 'cycles' }], R`With Reg1 $= 20$ the result is $19$: no skip, $1$ cycle. With Reg1 $= 1$ the result is $0$: the next instruction is skipped, $2$ cycles.`, { hint: 'It takes 2 cycles only when it skips.' }),
        D.num('Count the cycles', R`<p>How many cycles does this program need until it reaches <code>GOTO $</code> (the final GOTO is not counted)?</p>`, cyc('MOVLW 3\nMOVWF 0x70\nDECFSZ 0x70, F\nGOTO $-1\nGOTO $'), R`$1 + 1$ for MOVLW and MOVWF, two rounds of DECFSZ ($1$) and GOTO ($2$) $= 6$, and the last DECFSZ that skips $= 2$: $1 + 1 + 6 + 2 = 10$ cycles.`, { snippet: { text: 'MOVLW 3\nMOVWF 0x70\nDECFSZ 0x70, F\nGOTO $-1\nGOTO $', lang: 'asm', lines: true }, unit: 'cycles', hint: 'DECFSZ runs three times: the first two do not skip, the third one skips.' })
      ]
    },
    {
      title: 'Delay loops and the blinking LED',
      objectives: [R`You will be able to calculate the time of a delay loop: $3n + 1$ cycles`, 'You will know how the delay functions of XC8 work', 'You will be able to make a program wait for an exact time in C and in assembly'],
      blocks: [
        D.T(R`<p>The processor is fast: at $4\ \mathrm{MHz}$ it executes a million instructions per second. To slow a process down, for example to blink an LED that the eye can follow, the program must <b>wait</b>. The simplest way is a loop that only counts. The lecture looks at the code that the XC8 compiler produces for the C call <code>_delay(100)</code>:</p>`),
        D.CODE(R`    MOVLW   0x21        ; 1 cycle
    MOVWF   0x70        ; 1 cycle
    DECFSZ  0x70, F     ; 1 cycle (2 when it skips)
    GOTO    $-1         ; 2 cycles`, 'asm'),
        D.T(R`<p>With the counter $n$ loaded in register <code>0x70</code>, the pair DECFSZ/GOTO costs $3$ cycles and runs $n - 1$ times; the last DECFSZ skips and costs $2$:</p>
$$N_{\text{cycles}} = 1 + 1 + 3\,(n - 1) + 2 = 3n + 1.$$
<p>With $n = 21_{16} = 33$: $3 \times 33 + 1 = 100$ cycles, which is $100\ \mu\mathrm{s}$ at $4\ \mathrm{MHz}$. Since the counter is a byte, one loop can wait at most $3 \times 255 + 1 = 766$ cycles. For longer delays the compiler nests two or three loops inside each other, with three counters. It uses the registers <code>0x70</code> to <code>0x7F</code> because they are reachable from every bank of the RAM (Part 7). Finding the three counter values for a given time is tedious; online delay calculators do it, and the lecture uses one to produce the 1-second delay of the activities.</p>`),
        D.H('Delays in C'),
        D.T(R`<p>XC8 provides ready-made delay functions in <code>&lt;xc.h&gt;</code>: <code>_delay(n)</code> waits $n$ instruction cycles, and the more convenient macros <code>__delay_ms(x)</code> and <code>__delay_us(x)</code> wait $x$ milliseconds or microseconds. To convert a time into cycles they need the oscillator frequency, which the program gives with <code>#define _XTAL_FREQ 4000000</code>. <code>__delay_ms(500)</code> becomes <code>_delay(500000)</code> at $4\ \mathrm{MHz}$, because $500\ \mathrm{ms} \times 1\,000\,000$ cycles per second $= 500\,000$ cycles.</p>`),
        D.H('Activity 6: blinking an LED at 1 Hz'),
        D.T(R`<p>A frequency of $1\ \mathrm{Hz}$ means a period $T = \frac{1}{1\ \mathrm{Hz}} = 1\ \mathrm{s}$: the LED is on for $\frac{T}{2} = 500\ \mathrm{ms}$ and off for $500\ \mathrm{ms}$. The LED is connected to the pin RD0; the lines that make RD0 an output are explained in Part 7.</p>`),
        D.SIDE(R`#include <xc.h>
#define _XTAL_FREQ 4000000
#define led RD0

void main(void) {
    PORTD = 0;
    OSCCON = 0b01100000;
    TRISD = 0b00000000;
    while (1) {
        led = 1;
        __delay_ms(500);
        led = 0;
        __delay_ms(500);
    }
}`, R`REPEAT:
    BSF     LED          ; LED on
    CALL    DELAY_500MS
    BCF     LED          ; LED off
    CALL    DELAY_500MS
    GOTO    REPEAT

DELAY_500MS:             ; three nested loops
    MOVLW   0X54
    MOVWF   A1
    MOVLW   0X8a
    MOVWF   A2
    MOVLW   0X03
    MOVWF   A3
    DECFSZ  A1, 1
    GOTO    $-1
    DECFSZ  A2, 1
    GOTO    $-3
    DECFSZ  A3, 1
    GOTO    $-5
    NOP
    RETURN`, { cap: R`Activity 6 in C and in assembly (the assembly SETUP is omitted). The three counters A1, A2 and A3 are declared with <code>EQU</code> at addresses <code>0x70</code>, <code>0x71</code> and <code>0x72</code>. The delay routine takes $499\,999$ cycles, plus $2$ for the <code>CALL</code>: exactly $500\,001\ \mu\mathrm{s}$.` }),
        D.multi('The 100-cycle delay', R`<p>Fill in the cycles of each part of the <code>_delay(100)</code> code shown above ($n = 33$), and the time at $4\ \mathrm{MHz}$.</p>`, [{ label: 'MOVLW + MOVWF:', ans: [2], unit: 'cycles' }, { label: 'First 32 rounds of DECFSZ + GOTO:', ans: [96], unit: 'cycles' }, { label: 'Last DECFSZ (it skips):', ans: [2], unit: 'cycles' }, { label: 'Total time at 4 MHz:', ans: [100], unit: 'µs', unitAlt: ['us', 'μs'] }], R`$2 + 32 \times 3 + 2 = 100$ cycles; with $T_{\text{ins}} = 1\ \mu\mathrm{s}$ that is $100\ \mu\mathrm{s}$.`, { hint: 'The pair DECFSZ + GOTO takes 3 cycles when DECFSZ does not skip.' }),
        D.num('The longest single loop', R`<p>What is the longest delay, in cycles, that one counter loop of this form can produce?</p>`, 766, R`With $n = 255$: $3 \times 255 + 1 = 766$ cycles.`, { hint: R`Use $3n + 1$ with the largest byte value.` }),
        D.asm('A delay of exactly 100 cycles', R`<p>Write a small program that spends exactly $100$ cycles before it reaches <code>GOTO $</code> (the final GOTO is not counted): load a counter, then loop with <code>DECFSZ</code> and <code>GOTO $-1</code>. Find the starting value of the counter.</p>`, {
          pre: 'COUNTER EQU 0x70', start: ASTART, tests: [{ expect: { CYCLES: 100 } }], reqs: [{ re: /\bDECFSZ\b/i, msg: 'Use DECFSZ.' }], solution: 'MOVLW 0x21\nMOVWF COUNTER\nDECFSZ COUNTER, F\nGOTO $-1\nGOTO $'
        }, R`With a counter $n$ the program takes $3n + 1$ cycles; $3n + 1 = 100$ gives $n = 33 = 21_{16}$.`, { hint: R`Solve $3n + 1 = 100$.` }),
        D.asm('A delay of 1000 cycles', R`<p>One counter is not enough for $1000$ cycles. Write a program that spends exactly $1000$ cycles before <code>GOTO $</code>. You may use a loop and add <code>NOP</code> instructions ($1$ cycle each) to adjust the total.</p>`, {
          pre: 'C1 EQU 0x70\nC2 EQU 0x71', start: ASTART, tests: [{ expect: { CYCLES: 1000 } }], reqs: [{ re: /\bDECFSZ\b/i, msg: 'Use a DECFSZ loop.' }], solution: 'MOVLW 0xFF\nMOVWF C1\nDECFSZ C1, F\nGOTO $-1\nMOVLW 0x4D\nMOVWF C1\nDECFSZ C1, F\nGOTO $-1\nNOP\nNOP\nGOTO $'
        }, R`Two loops in a row: $n = 255$ gives $3 \times 255 + 1 = 766$ cycles; for the remaining $1000 - 766 = 234$ cycles, $n = 77 = 4D_{16}$ gives $3 \times 77 + 1 = 232$, and two NOP instructions add the last $2$ cycles.`, { hint: [R`Two loops in a row: the first with $n = 255$ gives $766$ cycles.`, R`The remaining $234$ cycles: a second loop with $n = 77$ gives $3 \times 77 + 1 = 232$. Add two <code>NOP</code> instructions, or find other values.`] }),
        D.c('Slow countdown', R`<p>Write a program which prints a countdown <code>3</code>, <code>2</code>, <code>1</code>, <code>Go!</code> on separate lines, waiting $500\ \mathrm{ms}$ after each number with <code>__delay_ms</code> (the clock is $4\ \mathrm{MHz}$). The test checks the output and the total time.</p>`, {
          start: R`#include <stdio.h>
#include <xc.h>
#define _XTAL_FREQ 4000000

void main(void) {

}
`, sample: R`3
2
1
Go!`,
          tests: [{ name: 'Output and time', out: '3\n2\n1\nGo!\n', expect: { CYCLES: [1490000, 1520000] } }],
          reqs: [{ re: /__delay_ms\s*\(\s*500\s*\)/, msg: 'Wait with __delay_ms(500).' }],
          solution: R`#include <stdio.h>
#include <xc.h>
#define _XTAL_FREQ 4000000

void main(void) {
    for (int i = 3; i >= 1; i--) {
        printf("%d\n", i);
        __delay_ms(500);
    }
    printf("Go!\n");
}
`
        }, '', { hint: R`A loop from $3$ down to $1$ with <code>printf</code> and <code>__delay_ms(500)</code> inside, then <code>printf("Go!\n");</code>.` }),
        D.mc('Why _XTAL_FREQ?', 'Why must a C program define <code>_XTAL_FREQ</code> before using <code>__delay_ms</code>?', ['The macro converts milliseconds into instruction cycles, which depends on the oscillator frequency', 'It sets the oscillator of the chip to that frequency', 'It is only a comment', 'It enables the timers'], 0, 'The define only informs the compiler; the frequency itself is selected with OSCCON and the configuration bits.', { hint: 'Does #define change any register?' }),
        D.num('Period of 1 Hz', R`<p>An LED blinks at $2\ \mathrm{Hz}$ with equal on and off times. How long is it on, in milliseconds?</p>`, 250, R`$T = \frac{1}{2\ \mathrm{Hz}} = 500\ \mathrm{ms}$ and the LED is on for $\frac{T}{2} = 250\ \mathrm{ms}$.`, { unit: 'ms', hint: R`First find the period $T = \frac{1}{f}$.` })
      ]
    }
  ]
});
})();
