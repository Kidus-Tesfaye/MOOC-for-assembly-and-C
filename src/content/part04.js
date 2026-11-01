/* Part 4 - Making decisions (C conditions, the STATUS flags, skips; Lectures 4, 5 and 9, Activity 7) */
(function () {
const START = R`#include <stdio.h>

void main(void) {

}
`;
const prog = (body) => '#include <stdio.h>\n\nvoid main(void) {\n' + body.replace(/^/gm, '    ') + '\n}\n';
const ASTART = '; write your instructions here\n\n    GOTO $\n';
D.part({
  title: 'Making decisions',
  intro: R`<p>Programs become interesting when they can choose what to do. In C a decision is written with <code>if</code> and <code>else</code>. The processor itself has no "if": it has <b>flags</b> that record facts about the last result, and <b>skip</b> instructions that jump over the next instruction depending on a bit. In this part you learn both views and how to translate one into the other.</p>`,
  sections: [
    {
      title: 'Conditions in C',
      objectives: ['You will be able to write <code>if</code>, <code>else</code> and <code>else if</code> statements', 'You will know the comparison and logical operators of C', 'You will avoid the classic mistake of writing <code>=</code> instead of <code>==</code>'],
      blocks: [
        D.T(R`<p>An <code>if</code> statement executes a block of code only when a <b>condition</b> is true:</p>`),
        D.CODE(R`#include <stdio.h>

void main(void) {
    int temperature;
    printf("Temperature: ");
    scanf("%d", &temperature);
    if (temperature > 40) {
        printf("Hot\n");
    }
    printf("Done\n");
}`),
        D.OUT(R`Temperature: [[45]]
Hot
Done`),
        D.T(R`<p>The condition is written in parentheses after <code>if</code>, and the code to execute is written between braces. If the block has only one statement, the braces may be left out, as in the lecture code <code>if (pb_on == 1) led = 1;</code>. Writing them always is a good habit.</p>
<p>An <code>else</code> block is executed when the condition is false, and <code>else if</code> adds more conditions, tested one after the other until one is true:</p>`),
        D.CODE(R`if (temperature > 40) {
    printf("Hot\n");
} else if (temperature < 10) {
    printf("Cold\n");
} else {
    printf("Pleasant\n");
}`),
        D.TABLE(['Operator', 'Meaning', 'Example (with x = 5)'], [
          ['<code>==</code>', 'equal to', '<code>x == 5</code> is true'],
          ['<code>!=</code>', 'not equal to', '<code>x != 5</code> is false'],
          ['<code>&lt;</code>, <code>&gt;</code>', 'less than, greater than', '<code>x &lt; 3</code> is false'],
          ['<code>&lt;=</code>, <code>&gt;=</code>', 'less than or equal, greater than or equal', '<code>x &gt;= 5</code> is true'],
          ['<code>&amp;&amp;</code>', 'and: both conditions true', '<code>x &gt; 0 &amp;&amp; x &lt; 10</code> is true'],
          ['<code>||</code>', 'or: at least one condition true', '<code>x &lt; 0 || x &gt; 10</code> is false'],
          ['<code>!</code>', 'not: inverts a condition', '<code>!(x == 5)</code> is false']
        ]),
        D.T(R`<p>In C a condition is simply a number: <b>zero means false</b> and <b>any other value means true</b>. A comparison produces $1$ when it is true and $0$ when it is false. That is why <code>while (1)</code> in the lecture activities repeats forever: $1$ is always true.</p>`),
        D.WARN('= is not ==', R`<p>The lecture asks: where is the mistake in <code>if (PORTD = 20) PORTC = 20;</code>? A single <code>=</code> is an <i>assignment</i>: it stores $20$ in PORTD, and the condition is then $20$, which is always true. A comparison needs two equal signs: <code>if (PORTD == 20)</code>. The compiler accepts both, so this mistake is easy to miss.</p>`),
        D.c('Hot or cold', R`<p>Write a program which asks for a temperature and prints <code>Hot</code> if it is greater than $40$, otherwise <code>Cold</code>. This is the decision of Activity 16C, which shows the temperature of a sensor on an LCD.</p>`, {
          start: START, sample: R`Temperature: [[52]]
Hot`,
          tests: [{ name: '52', stdin: '52\n', out: 'Temperature: Hot\n' }, { name: '40 (not greater than 40)', stdin: '40\n', out: 'Temperature: Cold\n' }, { name: '-5', stdin: '-5\n', out: 'Temperature: Cold\n' }, { name: '41', stdin: '41\n', out: 'Temperature: Hot\n' }],
          solution: prog(R`int t;
printf("Temperature: ");
scanf("%d", &t);
if (t > 40) {
    printf("Hot\n");
} else {
    printf("Cold\n");
}`)
        }, '', { hint: R`Read the number with <code>scanf</code>, then use <code>if (t > 40) ... else ...</code>.` }),
        D.c('The bigger number', R`<p>Write a program which asks for two integers and prints the bigger one. If they are equal, it prints <code>They are equal</code>.</p>`, {
          start: START, sample: R`First: [[17]]
Second: [[42]]
The bigger is 42`,
          tests: [{ name: '17, 42', stdin: '17\n42\n', out: 'First: Second: The bigger is 42\n' }, { name: '9, 3', stdin: '9\n3\n', out: 'First: Second: The bigger is 9\n' }, { name: '5, 5', stdin: '5\n5\n', out: 'First: Second: They are equal\n' }, { name: '-2, -7', stdin: '-2\n-7\n', out: 'First: Second: The bigger is -2\n' }],
          solution: prog(R`int a, b;
printf("First: ");
scanf("%d", &a);
printf("Second: ");
scanf("%d", &b);
if (a > b) {
    printf("The bigger is %d\n", a);
} else if (b > a) {
    printf("The bigger is %d\n", b);
} else {
    printf("They are equal\n");
}`)
        }, '', { hint: 'There are three cases: a > b, b > a, and the remaining case where they are equal.' }),
        D.c('Grade', R`<p>Write a program which asks for exam points ($0 \ldots 100$) and prints the grade according to this table:</p><table class="mini"><tr><td>$0 \ldots 49$</td><td>F</td></tr><tr><td>$50 \ldots 69$</td><td>C</td></tr><tr><td>$70 \ldots 84$</td><td>B</td></tr><tr><td>$85 \ldots 100$</td><td>A</td></tr></table><p>If the number is outside $0 \ldots 100$, print <code>Impossible</code>.</p>`, {
          start: START, sample: R`Points: [[77]]
Grade: B`,
          tests: [{ name: '77', stdin: '77\n', out: 'Points: Grade: B\n' }, { name: '49', stdin: '49\n', out: 'Points: Grade: F\n' }, { name: '50', stdin: '50\n', out: 'Points: Grade: C\n' }, { name: '85', stdin: '85\n', out: 'Points: Grade: A\n' }, { name: '100', stdin: '100\n', out: 'Points: Grade: A\n' }, { name: '101', stdin: '101\n', out: 'Points: Impossible\n' }, { name: '-1', stdin: '-1\n', out: 'Points: Impossible\n' }],
          solution: prog(R`int p;
printf("Points: ");
scanf("%d", &p);
if (p < 0 || p > 100) {
    printf("Impossible\n");
} else if (p >= 85) {
    printf("Grade: A\n");
} else if (p >= 70) {
    printf("Grade: B\n");
} else if (p >= 50) {
    printf("Grade: C\n");
} else {
    printf("Grade: F\n");
}`)
        }, '', { hint: [R`First test the impossible values with <code>||</code>.`, R`Then go from the highest grade down: <code>else if (p >= 85)</code>, <code>else if (p >= 70)</code>... Each <code>else if</code> is only tested when the previous conditions were false.`] }),
        D.mc('Assignment in a condition', R`<p>What does this program print?</p>`, ['<code>yes 20</code>', '<code>no 7</code>', '<code>yes 7</code>', 'It does not compile'], 0, R`<code>x = 20</code> stores $20$ in <code>x</code>; the value of the condition is $20$, which is true. Use <code>==</code> to compare.`, { snippet: { text: R`int x = 7;
if (x = 20) printf("yes ");
else printf("no ");
printf("%d\n", x);`, lang: 'c' }, hint: 'A single = assigns a value. What is the value of the whole expression x = 20?' }),
        D.mc('True or false', R`<p>With <code>a = 3</code> and <code>b = 0</code>, which conditions are true? Select all that apply.</p>`, ['<code>a &amp;&amp; b</code>', '<code>a || b</code>', '<code>!b</code>', '<code>a &gt; 2 &amp;&amp; b == 0</code>', '<code>a == 3 &amp;&amp; !a</code>'], [1, 2, 3], R`$b = 0$ is false and $a = 3$ is true. So <code>a || b</code>, <code>!b</code> and <code>a &gt; 2 &amp;&amp; b == 0</code> are true; <code>a &amp;&amp; b</code> and <code>a == 3 &amp;&amp; !a</code> are false.`, { hint: 'Zero is false; any other value is true.' }),
        D.c('Leap year', R`<p>A year is a leap year if it is divisible by $4$, except the years divisible by $100$, which are leap years only if they are also divisible by $400$. Write a program which asks for a year and prints whether it is a leap year.</p>`, {
          start: START, sample: R`Year: [[2024]]
2024 is a leap year`,
          tests: [{ name: '2024', stdin: '2024\n', out: 'Year: 2024 is a leap year\n' }, { name: '2023', stdin: '2023\n', out: 'Year: 2023 is not a leap year\n' }, { name: '1900', stdin: '1900\n', out: 'Year: 1900 is not a leap year\n' }, { name: '2000', stdin: '2000\n', out: 'Year: 2000 is a leap year\n' }],
          solution: prog(R`int y;
printf("Year: ");
scanf("%d", &y);
if ((y % 4 == 0 && y % 100 != 0) || y % 400 == 0) {
    printf("%d is a leap year\n", y);
} else {
    printf("%d is not a leap year\n", y);
}`)
        }, '', { hint: [R`"Divisible by 4" is <code>y % 4 == 0</code>: the remainder of the division is zero.`, R`Combine the rules with <code>&amp;&amp;</code> and <code>||</code>: divisible by 4 and not by 100, or divisible by 400.`] })
      ]
    },
    {
      title: 'The STATUS flags',
      objectives: ['You will know the flags Z, C and DC of the STATUS register', 'You will know which instructions change the flags', 'You will be able to use Z to test for equality and C to compare two numbers'],
      blocks: [
        D.T(R`<p>The processor has no instruction that compares two numbers and jumps. Instead, after many operations the ALU records facts about the result in three bits of the <b>STATUS</b> register, called <b>flags</b>:</p>`),
        D.TABLE(['Flag', 'Bit of STATUS', 'Set to 1 when'], [
          ['<b>Z</b> (zero)', '2', 'the result of the operation is zero'],
          ['<b>C</b> (carry)', '0', R`an addition produces a ninth bit (the result exceeded $255$), or a subtraction does <i>not</i> need a borrow (the first number was $\geq$ the second)`],
          ['<b>DC</b> (digit carry)', '1', 'a carry passed from bit 3 to bit 4 (from the low nibble to the high nibble)']
        ]),
        D.T(R`<p>Not every instruction changes every flag. <code>ADDLW</code>, <code>ADDWF</code>, <code>SUBLW</code> and <code>SUBWF</code> change Z, C and DC. The logic instructions (<code>ANDLW</code>, <code>IORWF</code>, <code>XORLW</code>...), <code>MOVF</code>, <code>INCF</code>, <code>DECF</code>, <code>COMF</code>, <code>CLRF</code> and <code>CLRW</code> change only Z. <code>MOVLW</code>, <code>MOVWF</code>, <code>SWAPF</code> and the bit and jump instructions change no flag at all.</p>`),
        D.H('Z: are two values equal?'),
        D.T(R`<p>Two values are equal exactly when their XOR is zero: equal bits give $0$. So the usual way to compare W with a constant is <code>XORLW</code>, followed by a test of Z. Activity 7 compares the switches with each case in this way:</p>`),
        D.CODE(R`MOVF    PORTD_TEMP, W
XORLW   00001001B     ; compare with 1001
                      ; Z = 1 if PORTD_TEMP was 1001`, 'asm'),
        D.T(R`<p>(<code>MOVF f, W</code> sets Z too, so <code>MOVF X, W</code> alone tells whether X is zero.)</p>`),
        D.H('C: which value is bigger?'),
        D.T(R`<p>For an unsigned comparison, subtract and look at the carry, exactly as in Part 2. <code>SUBWF f, W</code> calculates $f - W$:</p>
$$C = 1 \iff f \geq W, \qquad C = 0 \iff f < W.$$
<p>In addition $Z = 1$ when $f = W$. With these two flags every comparison $<$, $\leq$, $=$, $\geq$, $>$ can be decided.</p>`),
        D.mc('Which flag?', 'Which flag tells you that the result of the last operation was zero?', ['Z', 'C', 'DC', 'RP0'], 0, 'Z is the zero flag (bit 2 of STATUS).', { hint: 'Z for zero.' }),
        D.trace('Flags after additions', 'Follow the program and write W, Z and C after each instruction.', { code: 'MOVLW 200\nADDLW 56\nADDLW 10\nMOVLW 0', watch: ['W', 'Z', 'C'] }, R`$200 + 56 = 256$: W $= 0$, Z $= 1$, C $= 1$. Then $0 + 10 = 10$: Z $= 0$, C $= 0$. MOVLW changes no flag, so Z and C stay $0$ even though W becomes $0$.`, { hint: 'MOVLW does not change any flag.' }),
        D.trace('Compare with XORLW', R`<p>REG1 $= 9$. Follow the program and write W and Z after each instruction.</p>`, { pre: 'REG1 EQU 0x20', code: 'MOVF REG1, W\nXORLW 9\nMOVF REG1, W\nXORLW 7', watch: ['W', 'Z'], init: { REG1: 9 } }, R`$9 \text{ XOR } 9 = 0$ sets Z; $9 \text{ XOR } 7 = 0000\,1110_{2} = 14$ clears Z.`, { hint: 'XOR of two equal values is zero.', note: 'Start: REG1 = 9.' }),
        D.multi('SUBWF and the carry', R`<p>REG1 $= 40$ and W $= 55$. After <code>SUBWF REG1, W</code>, what are W, Z and C?</p>`, [{ label: 'W =', ans: [241] }, { label: 'Z =', ans: [0] }, { label: 'C =', ans: [0] }], R`$40 - 55 = -15$, stored as $256 - 15 = 241$. The result is not zero and $40 < 55$, so $C = 0$.`, { hint: R`Is $f \geq W$?` }),
        D.mc('Which instruction keeps the flags?', 'Which instruction never changes the Z flag?', ['<code>MOVWF</code>', '<code>MOVF</code>', '<code>INCF</code>', '<code>ANDLW</code>'], 0, 'MOVWF only copies W into a register; MOVF, INCF and ANDLW set Z according to their result.', { hint: 'Moving W into a register does not involve the ALU.' })
      ]
    },
    {
      title: 'Decisions in assembly: skip instructions',
      objectives: ['You will be able to use BTFSS and BTFSC', 'You will be able to translate an <code>if</code>/<code>else</code> from C into assembly', 'You will be able to compare two numbers in assembly'],
      blocks: [
        D.T(R`<p>The PIC makes decisions with two instructions that test one bit and <b>skip</b> the next instruction:</p>`),
        D.TABLE(['Instruction', 'Name', 'Operation'], [
          ['<code>BTFSS f, b</code>', 'Bit Test f, Skip if Set', 'if bit b of f is $1$, skip the next instruction'],
          ['<code>BTFSC f, b</code>', 'Bit Test f, Skip if Clear', 'if bit b of f is $0$, skip the next instruction'],
          ['<code>BSF f, b</code>', 'Bit Set f', 'bit b of f $\\leftarrow 1$'],
          ['<code>BCF f, b</code>', 'Bit Clear f', 'bit b of f $\\leftarrow 0$']
        ]),
        D.T(R`<p>The bit can be given by its number or by its name: <code>BTFSC STATUS, 2</code> and <code>BTFSC ZERO</code> test the same Z flag (the lecture code uses <code>ZERO</code>). The skipped instruction is usually a <code>GOTO</code>, so the skip decides which way the program goes. This is how an <code>if</code>/<code>else</code> becomes assembly:</p>`),
        D.SIDE(R`if (x == 9) {
    result = 1;
} else {
    result = 2;
}`, R`    MOVF    X, W
    XORLW   9          ; Z = 1 if X == 9
    BTFSS   ZERO       ; equal? skip the GOTO
    GOTO    ELSE_PART  ; not equal
    MOVLW   1          ; then-part
    MOVWF   RESULT
    GOTO    END_IF
ELSE_PART:
    MOVLW   2          ; else-part
    MOVWF   RESULT
END_IF:`, { cap: R`The skip jumps over exactly one instruction. When X is $9$, Z is $1$ and <code>BTFSS</code> skips the <code>GOTO ELSE_PART</code>.` }),
        D.T(R`<p>Comparing two numbers uses the carry. To decide "if A $\geq$ B": put B in W and calculate A $-$ W with <code>SUBWF A, W</code>; then C $= 1$ exactly when A $\geq$ B. Note that <code>SUBWF A, W</code> leaves A unchanged.</p>`),
        D.CODE(R`    MOVF    B, W
    SUBWF   A, W       ; W = A - B, C = 1 if A >= B
    BTFSS   STATUS, 0  ; C = 1? skip the GOTO
    GOTO    B_BIGGER
    ; here A >= B`, 'asm'),
        D.KEY('Cycles', R`<p>Most instructions take one instruction cycle. A skip takes $2$ cycles when it skips (and $1$ when it does not), and <code>GOTO</code> always takes $2$ cycles. This matters when a program must run with exact timing (Part 5).</p>`),
        D.trace('Trace with BTFSS', R`<p>REG1 $= 128$ (bit 7 is $1$). Follow the program. A skipped instruction is not executed, so it does not appear in the table.</p>`, { pre: 'REG1 EQU 0x20', code: 'MOVLW 1\nBTFSS REG1, 7\nMOVLW 2\nADDLW 10\nBTFSC REG1, 0\nADDLW 100', watch: ['W'], init: { REG1: 128 } }, R`Bit 7 is $1$, so <code>BTFSS</code> skips <code>MOVLW 2</code>; W $= 1 + 10 = 11$. Bit 0 is $0$, so <code>BTFSC</code> skips <code>ADDLW 100</code>.`, { hint: 'Skip if Set / Skip if Clear.', note: 'Start: REG1 = 128 = 1000,0000.' }),
        D.asm('Is it nine?', R`<p>Write a program which sets RESULT to $1$ if the register X holds $9$, and to $0$ otherwise. The tests put different values in X.</p>`, {
          pre: 'X EQU 0x20\nRESULT EQU 0x21', start: ASTART,
          tests: [{ name: 'X = 9', init: { X: 9, RESULT: 77 }, expect: { RESULT: 1 } }, { name: 'X = 8', init: { X: 8, RESULT: 77 }, expect: { RESULT: 0 } }, { name: 'X = 25', init: { X: 25, RESULT: 77 }, expect: { RESULT: 0 } }],
          solution: '    CLRF RESULT\n    MOVF X, W\n    XORLW 9\n    BTFSC ZERO\n    INCF RESULT, F\n    GOTO $'
        }, 'Clear RESULT, compare X with 9 with XORLW and, only when Z = 1, increment RESULT.', { hint: [R`Start with <code>CLRF RESULT</code>; then RESULT only needs to change in the "equal" case.`, R`<code>MOVF X, W</code>, <code>XORLW 9</code>, <code>BTFSC ZERO</code> and an instruction that makes RESULT $1$.`] }),
        D.asm('The maximum', R`<p>Store in MAX the bigger of the unsigned numbers in A and B (either one if they are equal). A and B must keep their values.</p>`, {
          pre: 'A EQU 0x20\nB EQU 0x21\nMAX EQU 0x22', start: ASTART,
          tests: [{ name: 'A = 30, B = 70', init: { A: 30, B: 70 }, expect: { MAX: 70, A: 30, B: 70 } }, { name: 'A = 200, B = 15', init: { A: 200, B: 15 }, expect: { MAX: 200 } }, { name: 'A = B = 99', init: { A: 99, B: 99 }, expect: { MAX: 99 } }, { name: 'A = 128, B = 127', init: { A: 128, B: 127 }, expect: { MAX: 128 } }],
          solution: '    MOVF B, W\n    SUBWF A, W\n    BTFSS STATUS, 0\n    GOTO B_BIG\n    MOVF A, W\n    MOVWF MAX\n    GOTO DONE\nB_BIG:\n    MOVF B, W\n    MOVWF MAX\nDONE:\n    GOTO $'
        }, R`<code>SUBWF A, W</code> calculates $A - B$ and sets C when $A \geq B$; the skip then chooses which register to copy into MAX.`, { hint: [R`<code>MOVF B, W</code> and <code>SUBWF A, W</code> give C $= 1$ when A $\geq$ B.`, R`Test C with <code>BTFSS STATUS, 0</code> and jump to a label that copies B when the carry is $0$.`] }),
        D.asm('Absolute difference', R`<p>Store $|A - B|$ in DIFF: the difference of the bigger and the smaller number, which is never negative.</p>`, {
          pre: 'A EQU 0x20\nB EQU 0x21\nDIFF EQU 0x22', start: ASTART,
          tests: [{ name: 'A = 90, B = 35', init: { A: 90, B: 35 }, expect: { DIFF: 55 } }, { name: 'A = 35, B = 90', init: { A: 35, B: 90 }, expect: { DIFF: 55 } }, { name: 'A = B = 12', init: { A: 12, B: 12 }, expect: { DIFF: 0 } }],
          solution: '    MOVF B, W\n    SUBWF A, W\n    BTFSC STATUS, 0\n    GOTO STORE\n    MOVF A, W\n    SUBWF B, W\nSTORE:\n    MOVWF DIFF\n    GOTO $'
        }, R`Calculate $A - B$; if the carry shows a borrow ($A < B$), calculate $B - A$ instead.`, { hint: [R`First calculate $A - B$ into W with <code>SUBWF A, W</code>.`, R`If C $= 0$ (a borrow, A $<$ B), calculate $B - A$ with <code>MOVF A, W</code> and <code>SUBWF B, W</code> before storing.`] })
      ]
    },
    {
      title: 'Several cases',
      objectives: ['You will be able to choose between several cases with <code>else if</code> and <code>switch</code>', 'You will be able to write the same choice in assembly with a chain of comparisons'],
      blocks: [
        D.T(R`<p><b>Activity 7</b> reads four switches and lights three LEDs according to a table. Using the "more logical" wiring of the lecture (a pressed switch reads $1$, a lit LED is $1$), the table is:</p>`),
        D.TABLE(['SW3 SW2 SW1 SW0', 'LED2 LED1 LED0'], [['<code>1001</code>', '<code>111</code>'], ['<code>0111</code>', '<code>100</code>'], ['<code>1100</code>', '<code>011</code>'], ['anything else', '<code>000</code>']], { mono: [0, 1], small: true }),
        D.T(R`<p>In C this is a chain of <code>if</code>/<code>else if</code>, as in Activity 7C. When all the cases compare the same value with constants, C also offers the <code>switch</code> statement, which is often clearer:</p>`),
        D.SIDE(R`if (sw == 0b1001) leds = 0b111;
else if (sw == 0b0111) leds = 0b100;
else if (sw == 0b1100) leds = 0b011;
else leds = 0b000;`, R`switch (sw) {
    case 0b1001: leds = 0b111; break;
    case 0b0111: leds = 0b100; break;
    case 0b1100: leds = 0b011; break;
    default:     leds = 0b000;
}`, { cTitle: 'C with else if', asmTitle: 'C with switch', cap: R`A <code>switch</code> jumps to the <code>case</code> whose value equals <code>sw</code>, or to <code>default</code>. Each case ends with <code>break</code>; without it, the execution would continue into the next case.` }),
        D.T(R`<p>In assembly the cases are compared one after the other with <code>XORLW</code> and <code>BTFSC ZERO</code>. Activity 7 does exactly that inside a subroutine that returns the LED value with <code>RETLW</code> (you will meet subroutines in Part 6). Without a subroutine the chain looks like this:</p>`),
        D.CODE(R`    MOVF    SW, W
    XORLW   00001001B   ; case 1001?
    BTFSC   ZERO
    GOTO    CASE1
    MOVF    SW, W
    XORLW   00000111B   ; case 0111?
    BTFSC   ZERO
    GOTO    CASE2
    ; ... the other cases ...
    MOVLW   00000000B   ; else
    GOTO    STORE
CASE1:
    MOVLW   00000111B
    GOTO    STORE
CASE2:
    MOVLW   00000100B
STORE:
    MOVWF   LEDS`, 'asm'),
        D.c('Activity 7 logic', R`<p>The variable <code>sw</code> holds the four switches (the lowest four bits). Set <code>leds</code> according to the table of Activity 7 and print it in binary-looking form with three digits, as in the example. The tests change <code>sw</code>.</p><p>Hint: <code>printf("%d%d%d\n", (leds >> 2) & 1, (leds >> 1) & 1, leds & 1);</code> prints the three lowest bits; the operator <code>&gt;&gt;</code> shifts the bits to the right (Part 7).</p>`, {
          start: R`#include <stdio.h>

unsigned char sw = 0b1001;

void main(void) {
    unsigned char leds;

    printf("%d%d%d\n", (leds >> 2) & 1, (leds >> 1) & 1, leds & 1);
}
`, sample: '111',
          tests: [{ name: 'sw = 1001', out: '111\n' }, { name: 'sw = 0111', setGlobals: { sw: 7 }, out: '100\n' }, { name: 'sw = 1100', setGlobals: { sw: 12 }, out: '011\n' }, { name: 'sw = 0000', setGlobals: { sw: 0 }, out: '000\n' }, { name: 'sw = 1111', setGlobals: { sw: 15 }, out: '000\n' }],
          solution: R`#include <stdio.h>

unsigned char sw = 0b1001;

void main(void) {
    unsigned char leds;
    switch (sw) {
        case 0b1001: leds = 0b111; break;
        case 0b0111: leds = 0b100; break;
        case 0b1100: leds = 0b011; break;
        default:     leds = 0b000;
    }
    printf("%d%d%d\n", (leds >> 2) & 1, (leds >> 1) & 1, leds & 1);
}
`
        }, '', { hint: R`Use the <code>switch</code> or the <code>else if</code> chain shown above. Do not forget the default case.` }),
        D.c('Day of the week', R`<p>Write a program which asks for a number $1 \ldots 7$ and prints the name of the day (1 is Monday). For any other number, print <code>Invalid</code>. Use a <code>switch</code>.</p>`, {
          start: START, sample: R`Day number: [[3]]
Wednesday`,
          tests: [{ name: '3', stdin: '3\n', out: 'Day number: Wednesday\n' }, { name: '1', stdin: '1\n', out: 'Day number: Monday\n' }, { name: '7', stdin: '7\n', out: 'Day number: Sunday\n' }, { name: '5', stdin: '5\n', out: 'Day number: Friday\n' }, { name: '9', stdin: '9\n', out: 'Day number: Invalid\n' }],
          reqs: [{ re: /\bswitch\b/, msg: 'Use a switch statement.' }],
          solution: prog(R`int d;
printf("Day number: ");
scanf("%d", &d);
switch (d) {
    case 1: printf("Monday\n"); break;
    case 2: printf("Tuesday\n"); break;
    case 3: printf("Wednesday\n"); break;
    case 4: printf("Thursday\n"); break;
    case 5: printf("Friday\n"); break;
    case 6: printf("Saturday\n"); break;
    case 7: printf("Sunday\n"); break;
    default: printf("Invalid\n");
}`)
        }, '', { hint: 'Seven cases and a default. End every case with break.' }),
        D.mc('Missing break', R`<p>What does this code print when <code>x</code> is $1$?</p>`, ['<code>one</code>', '<code>onetwo</code>', '<code>onetwoother</code>', '<code>other</code>'], 1, 'Without break after case 1, the execution falls through into case 2, which then breaks.', { snippet: { text: R`switch (x) {
    case 1: printf("one");
    case 2: printf("two"); break;
    default: printf("other");
}`, lang: 'c' }, hint: 'Where is the first break after case 1?' }),
        D.asm('Activity 7 in assembly', R`<p>Write the case chain of Activity 7: compare the register SW with <code>1001B</code>, <code>0111B</code> and <code>1100B</code> and store <code>111B</code>, <code>100B</code>, <code>011B</code> (or <code>000B</code> for any other value) in LEDS.</p>`, {
          pre: 'SW EQU 0x20\nLEDS EQU 0x21', start: ASTART,
          tests: [{ name: 'SW = 1001', init: { SW: 9 }, expect: { LEDS: 7 } }, { name: 'SW = 0111', init: { SW: 7 }, expect: { LEDS: 4 } }, { name: 'SW = 1100', init: { SW: 12 }, expect: { LEDS: 3 } }, { name: 'SW = 0110', init: { SW: 6, LEDS: 99 }, expect: { LEDS: 0 } }],
          solution: '    MOVF SW, W\n    XORLW 00001001B\n    BTFSC ZERO\n    GOTO CASE1\n    MOVF SW, W\n    XORLW 00000111B\n    BTFSC ZERO\n    GOTO CASE2\n    MOVF SW, W\n    XORLW 00001100B\n    BTFSC ZERO\n    GOTO CASE3\n    MOVLW 00000000B\n    GOTO STORE\nCASE1:\n    MOVLW 00000111B\n    GOTO STORE\nCASE2:\n    MOVLW 00000100B\n    GOTO STORE\nCASE3:\n    MOVLW 00000011B\nSTORE:\n    MOVWF LEDS\n    GOTO $'
        }, 'Each case reloads SW into W, XORs it with the case value and jumps to its own label when Z = 1; all paths end at STORE.', { hint: [R`Copy the chain shown above and add the third case.`, R`Reload SW before every <code>XORLW</code>: the XOR changed W.`] })
      ]
    }
  ]
});
})();
