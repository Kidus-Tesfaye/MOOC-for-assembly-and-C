/* Part 5 - Loops and time (loops; Lecture 5 execution speed; Lecture 8 delays in assembly; Activity 6) */
(function () {
const ASTART = '; write your instructions here\n\n    GOTO $\n';
const cyc = (src) => { const r = Asm.run(src, { maxSteps: 3000000 }); return r.m.cycles; };
const NESTED = (n1, n2) => 'A1 EQU 0x70\nA2 EQU 0x71\n    MOVLW ' + n2 + '\n    MOVWF A2\nOUTER:\n    MOVLW ' + n1 + '\n    MOVWF A1\nINNER:\n    DECFSZ A1, F\n    GOTO INNER\n    DECFSZ A2, F\n    GOTO OUTER\n    GOTO $';
D.part({
  title: 'Loops and time',
  intro: R`<p>A processor is good at doing the same thing many times, very fast. In this part you write loops in assembly: endless loops, loops that run a fixed number of times with <code>DECFSZ</code>, and loops that multiply, divide and count. Then you learn exactly how long each instruction takes, so that a loop can wait for a precise time: the delay that makes the LED of Activity 6 blink once per second.</p>`,
  sections: [
    {
      title: 'Loops in assembly',
      objectives: ['You will be able to write a loop with a label and GOTO', 'You will be able to count with DECFSZ and INCFSZ', 'You will be able to repeat a block an exact number of times'],
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
        D.T(R`<p>The usual counting loop loads a counter, runs the body and decrements the counter with <code>DECFSZ</code>; the <code>GOTO</code> back to the start is skipped when the counter reaches zero. "<i>Add $3$ to TOTAL five times</i>" becomes:</p>`),
        D.CODE(R`    MOVLW   5
    MOVWF   COUNT
LOOP:
    MOVLW   3
    ADDWF   TOTAL, F
    DECFSZ  COUNT, F    ; count - 1, skip if 0
    GOTO    LOOP
    ; continues here after 5 rounds`, 'asm', { cap: R`The body runs $5$ times: TOTAL grows by $5 \times 3 = 15$. <code>DECFSZ</code> tests the counter <i>after</i> the body, so the body always runs at least once.` }),
        D.T(R`<p>For short jumps the lecture code often uses <code>$</code> instead of a label: <code>GOTO $-1</code> jumps one instruction back, so the pair <code>DECFSZ COUNT, F</code> / <code>GOTO $-1</code> is a loop that only counts down.</p>`),
        D.WARN('A counter that starts at zero', R`<p>If the counter is $0$ when the loop starts, the first <code>DECFSZ</code> gives $255$, not $0$, and the loop runs $256$ times. Test for zero before the loop when the count may be $0$.</p>`),
        D.trace('DECFSZ loop', R`<p>Follow the loop and write REG1 after each executed instruction.</p>`, { pre: 'REG1 EQU 0x20', code: 'MOVLW 3\nMOVWF REG1\nDECFSZ REG1, F\nGOTO $-1\nMOVLW 7', watch: ['REG1'] }, R`REG1: $3, 2$, back, $1$, back, $0$: the last DECFSZ skips the GOTO, and MOVLW 7 runs.`, { hint: 'When DECFSZ gives 0, the GOTO is skipped.' }),
        D.trace('An INCFSZ loop', R`<p>INCFSZ counts <i>up</i> and skips when the register wraps from $255$ to $0$. Follow REG1.</p>`, { pre: 'REG1 EQU 0x20', code: 'MOVLW 253\nMOVWF REG1\nINCFSZ REG1, F\nGOTO $-1\nMOVLW 7', watch: ['W', 'REG1'] }, R`REG1: $253$, then $254$, $255$ and $0$: the third INCFSZ gives $0$, skips the GOTO and MOVLW 7 runs.`, { hint: 'After 255 comes 0.' }),
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
        }, R`The counter takes the values $N, N-1, \ldots, 1$ and each one is added to SUM.`, { hint: R`Add <code>COUNT</code> itself (with <code>MOVF COUNT, W</code> and <code>ADDWF SUM, F</code>) before <code>DECFSZ COUNT, F</code>.` }),
        D.asm('Count the ones', R`<p>Count how many bits of NUM are $1$ and store the count in ONES. Rotate NUM eight times with <code>RLF</code>: each rotation moves one bit into C, which you can test with <code>BTFSC STATUS, 0</code>. NUM may change.</p>`, {
          start: 'NUM   EQU 0x20\nONES  EQU 0x21\nCOUNT EQU 0x22\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [[0xB5, 5], [0, 0], [255, 8], [0x80, 1]].map(([v, n]) => ({ name: R`$\text{NUM} = ` + H.b8(v).slice(0, 4) + R`\,` + H.b8(v).slice(4) + R`_{2}$`, init: { NUM: v, ONES: 9 }, expect: { ONES: n } })),
          reqs: [{ re: /\bRLF\b|\bRRF\b/i, msg: 'Rotate NUM with RLF (or RRF).' }],
          solution: 'NUM   EQU 0x20\nONES  EQU 0x21\nCOUNT EQU 0x22\n\n    CLRF   ONES\n    MOVLW  8\n    MOVWF  COUNT\nLOOP:\n    RLF    NUM, F       ; next bit into C\n    BTFSC  STATUS, 0\n    INCF   ONES, F      ; it was a 1\n    DECFSZ COUNT, F\n    GOTO   LOOP\n    GOTO $\n'
        }, R`A loop of $8$ rounds; in each round <code>RLF</code> pushes bit 7 into C, and <code>INCF ONES, F</code> runs only when C is $1$.`, { hint: [R`Clear ONES and load COUNT with $8$.`, R`Loop body: <code>RLF NUM, F</code>, <code>BTFSC STATUS, 0</code>, <code>INCF ONES, F</code>, then <code>DECFSZ COUNT, F</code> and <code>GOTO LOOP</code>.`] })
      ]
    },
    {
      title: 'How fast is an instruction?',
      objectives: ['You will be able to calculate the instruction time from the oscillator frequency', 'You will know which instructions take two cycles', 'You will be able to count the cycles of a short program'],
      blocks: [
        D.T(R`<p>No processor works without a clock. The oscillator produces a square wave of frequency $F_{\text{osc}}$ (also called $F_{\text{clk}}$), whose period is</p>
$$T_{\text{clk}} = \frac{1}{F_{\text{osc}}}.$$
<p>The clock can come from an external circuit (EC mode), from a quartz crystal or ceramic resonator (LP, XT and HS modes, for low, medium and high frequencies), from a resistor-capacitor circuit (RC mode), or from the two <b>internal oscillators</b> of the chip: the PIC16F887 can generate $8$ internal frequencies, from $31\ \mathrm{kHz}$ to $8\ \mathrm{MHz}$, selected with the register <b>OSCCON</b>. The default is $4\ \mathrm{MHz}$; the lecture activities select it explicitly with <code>MOVLW 01100000B</code> and <code>MOVWF OSCCON</code>. The maximum clock of the chip is $20\ \mathrm{MHz}$.</p>
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
        D.num('Count the cycles', R`<p>How many cycles does this program need until it reaches <code>GOTO $</code> (the final GOTO is not counted)?</p>`, cyc('MOVLW 3\nMOVWF 0x70\nDECFSZ 0x70, F\nGOTO $-1\nGOTO $'), R`$1 + 1$ for MOVLW and MOVWF, two rounds of DECFSZ ($1$) and GOTO ($2$) $= 6$, and the last DECFSZ that skips $= 2$: $1 + 1 + 6 + 2 = 10$ cycles.`, { snippet: { text: 'MOVLW 3\nMOVWF 0x70\nDECFSZ 0x70, F\nGOTO $-1\nGOTO $', lang: 'asm', lines: true }, unit: 'cycles', hint: 'DECFSZ runs three times: the first two do not skip, the third one skips.' }),
        D.multi('The internal oscillator', R`<p>Questions from the lecture about the clock of the PIC16F887.</p>`, [{ label: 'How many internal frequencies can be selected?', ans: [8] }, { label: 'Default frequency (MHz):', ans: [4], unit: 'MHz' }, { label: 'Name of the register that selects it:', ans: [/^osccon$/i], kind: 'text', solText: 'OSCCON', solInput: 'OSCCON' }], R`$8$ frequencies from $31\ \mathrm{kHz}$ to $8\ \mathrm{MHz}$, $4\ \mathrm{MHz}$ by default, selected with OSCCON.`, { hint: 'The activities write 01100000B into this register.' })
      ]
    },
    {
      title: 'Delay loops',
      objectives: [R`You will be able to calculate the time of a delay loop: $3n + 1$ cycles`, 'You will be able to calculate the time of two nested loops', 'You will be able to make a program wait for an exact number of cycles'],
      blocks: [
        D.T(R`<p>The processor is fast: at $4\ \mathrm{MHz}$ it executes a million instructions per second. To slow a process down, for example to blink an LED that the eye can follow, the program must <b>wait</b>. The simplest way is a loop that only counts. The lecture analyses this one:</p>`),
        D.CODE(R`    MOVLW   0x21        ; 1 cycle
    MOVWF   0x70        ; 1 cycle
    DECFSZ  0x70, F     ; 1 cycle (2 when it skips)
    GOTO    $-1         ; 2 cycles`, 'asm'),
        D.T(R`<p>With the counter $n$ loaded in register <code>0x70</code>, the pair DECFSZ/GOTO costs $3$ cycles and runs $n - 1$ times; the last DECFSZ skips and costs $2$:</p>
$$N_{\text{cycles}} = 1 + 1 + 3\,(n - 1) + 2 = 3n + 1.$$
<p>With $n = 21_{16} = 33$: $3 \times 33 + 1 = 100$ cycles, which is $100\ \mu\mathrm{s}$ at $4\ \mathrm{MHz}$. Since the counter is a byte, one loop can wait at most $3 \times 255 + 1 = 766$ cycles. The registers <code>0x70</code> to <code>0x7F</code> are used for the counters because they can be reached from every bank of the RAM (Part 7).</p>`),
        D.multi('The 100-cycle delay', R`<p>Fill in the cycles of each part of the <code>_delay(100)</code> code shown above ($n = 33$), and the time at $4\ \mathrm{MHz}$.</p>`, [{ label: 'MOVLW + MOVWF:', ans: [2], unit: 'cycles' }, { label: 'First 32 rounds of DECFSZ + GOTO:', ans: [96], unit: 'cycles' }, { label: 'Last DECFSZ (it skips):', ans: [2], unit: 'cycles' }, { label: 'Total time at 4 MHz:', ans: [100], unit: 'µs', unitAlt: ['us', 'μs'] }], R`$2 + 32 \times 3 + 2 = 100$ cycles; with $T_{\text{ins}} = 1\ \mu\mathrm{s}$ that is $100\ \mu\mathrm{s}$.`, { hint: 'The pair DECFSZ + GOTO takes 3 cycles when DECFSZ does not skip.' }),
        D.num('The longest single loop', R`<p>What is the longest delay, in cycles, that one counter loop of this form can produce?</p>`, 766, R`With $n = 255$: $3 \times 255 + 1 = 766$ cycles.`, { hint: R`Use $3n + 1$ with the largest byte value.` }),
        D.asm('A delay of exactly 100 cycles', R`<p>Write a small program that spends exactly $100$ cycles before it reaches <code>GOTO $</code> (the final GOTO is not counted): load a counter, then loop with <code>DECFSZ</code> and <code>GOTO $-1</code>. Find the starting value of the counter.</p>`, {
          pre: 'COUNTER EQU 0x70', start: ASTART, tests: [{ expect: { CYCLES: 100 } }], reqs: [{ re: /\bDECFSZ\b/i, msg: 'Use DECFSZ.' }], solution: 'MOVLW 0x21\nMOVWF COUNTER\nDECFSZ COUNTER, F\nGOTO $-1\nGOTO $'
        }, R`With a counter $n$ the program takes $3n + 1$ cycles; $3n + 1 = 100$ gives $n = 33 = 21_{16}$.`, { hint: R`Solve $3n + 1 = 100$.` }),
        D.asm('A delay of 1000 cycles', R`<p>One counter is not enough for $1000$ cycles. Write a program that spends exactly $1000$ cycles before <code>GOTO $</code>. You may use a loop and add <code>NOP</code> instructions ($1$ cycle each) to adjust the total.</p>`, {
          pre: 'C1 EQU 0x70\nC2 EQU 0x71', start: ASTART, tests: [{ expect: { CYCLES: 1000 } }], reqs: [{ re: /\bDECFSZ\b/i, msg: 'Use a DECFSZ loop.' }], solution: 'MOVLW 0xFF\nMOVWF C1\nDECFSZ C1, F\nGOTO $-1\nMOVLW 0x4D\nMOVWF C1\nDECFSZ C1, F\nGOTO $-1\nNOP\nNOP\nGOTO $'
        }, R`Two loops in a row: $n = 255$ gives $3 \times 255 + 1 = 766$ cycles; for the remaining $1000 - 766 = 234$ cycles, $n = 77 = 4D_{16}$ gives $3 \times 77 + 1 = 232$, and two NOP instructions add the last $2$ cycles.`, { hint: [R`Two loops in a row: the first with $n = 255$ gives $766$ cycles.`, R`The remaining $234$ cycles: a second loop with $n = 77$ gives $3 \times 77 + 1 = 232$. Add two <code>NOP</code> instructions, or find other values.`] }),
        D.H('Nested loops'),
        D.T(R`<p>For longer delays a loop is placed inside another one. The outer counter A2 repeats the whole inner loop, and the inner counter A1 is reloaded each time:</p>`),
        D.CODE(NESTED('N1', 'N2').replace('    GOTO $', '').replace('A1 EQU 0x70\nA2 EQU 0x71\n', ''), 'asm'),
        D.T(R`<p>One round of the outer loop costs $2$ cycles to reload A1, $3N_{1} - 1$ for the inner loop, and $3$ for <code>DECFSZ A2</code> with its <code>GOTO</code>: $3N_{1} + 4$ cycles. The last round costs one cycle less (the skip), and the first two instructions add $2$. In total</p>
$$N_{\text{cycles}} = N_{2}\,(3N_{1} + 4) + 1.$$
<p>With $N_{1} = 255$ and $N_{2} = 255$ that is already $196\,096$ cycles, about $0.2\ \mathrm{s}$ at $4\ \mathrm{MHz}$; a third counter reaches seconds. Finding the three counter values for a given time by hand is tedious, so programmers use an online delay calculator, as the lecture does for the activities.</p>`),
        D.num('Two nested loops', R`<p>How many cycles does the nested loop above take with $N_{1} = 100$ and $N_{2} = 10$ (until the code after the loop)?</p>`, cyc(NESTED(100, 10)), R`$N_{2}\,(3N_{1} + 4) + 1 = 10 \times 304 + 1 = 3041$ cycles, about $3\ \mathrm{ms}$ at $4\ \mathrm{MHz}$.`, { unit: 'cycles', hint: R`Use $N_{2}\,(3N_{1} + 4) + 1$.` }),
        D.num('Delay in milliseconds', R`<p>The same nested loop with $N_{1} = 200$ and $N_{2} = 5$ runs on a PIC at $8\ \mathrm{MHz}$. How long does it take, in milliseconds?</p>`, cyc(NESTED(200, 5)) * 0.5 / 1000, R`$5 \times (3 \times 200 + 4) + 1 = 3021$ cycles. At $8\ \mathrm{MHz}$, $T_{\text{ins}} = \frac{4}{8\ \mathrm{MHz}} = 0.5\ \mu\mathrm{s}$, so $3021 \times 0.5\ \mu\mathrm{s} = 1510.5\ \mu\mathrm{s} \approx 1.51\ \mathrm{ms}$.`, { unit: 'ms', tol: 0.01, hint: 'First the number of cycles, then multiply by the instruction time.' }),
        D.asm('A 10 ms delay', R`<p>Write a program that spends exactly $10\,000$ cycles ($10\ \mathrm{ms}$ at $4\ \mathrm{MHz}$) before it reaches <code>GOTO $</code>. Use the nested loop with the formula $N_{2}\,(3N_{1} + 4) + 1$, and <code>NOP</code> instructions to adjust.</p>`, {
          start: 'A1 EQU 0x70\nA2 EQU 0x71\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [{ expect: { CYCLES: 10000 } }],
          reqs: [{ re: /DECFSZ[\s\S]*DECFSZ/i, msg: 'Use two nested DECFSZ loops.' }],
          solution: 'A1 EQU 0x70\nA2 EQU 0x71\n\n    MOVLW 13\n    MOVWF A2\nOUTER:\n    MOVLW 255\n    MOVWF A1\nINNER:\n    DECFSZ A1, F\n    GOTO INNER\n    DECFSZ A2, F\n    GOTO OUTER\n    NOP                 ; 9998 + 2 = 10000\n    NOP\n    GOTO $\n'
        }, R`With $N_{1} = 255$: $3N_{1} + 4 = 769$ and $N_{2} = 13$ gives $13 \times 769 + 1 = 9998$ cycles; two NOP instructions add the last $2$. Other combinations work as well.`, { hint: [R`Choose $N_{1} = 255$, so that one outer round costs $769$ cycles.`, R`$13 \times 769 + 1 = 9998$: two NOP instructions are missing.`] })
      ]
    },
    {
      title: 'Activity 6: the blinking LED',
      objectives: ['You will be able to read the complete program of Activity 6', 'You will be able to check the timing of a delay subroutine'],
      blocks: [
        D.T(R`<p>A frequency of $1\ \mathrm{Hz}$ means a period $T = \frac{1}{1\ \mathrm{Hz}} = 1\ \mathrm{s}$: the LED is on for $\frac{T}{2} = 500\ \mathrm{ms}$ and off for $500\ \mathrm{ms}$. In Activity 6 the LED is connected to the pin RD0. The program sets the LED, waits, clears it, waits, and repeats forever. The waiting is done by a <b>subroutine</b>, a piece of code that is called with <code>CALL</code> and ends with <code>RETURN</code> (Part 6 explains them):</p>`),
        D.CODE(R`A1      EQU 0X70           ; the three delay counters
A2      EQU 0X71
A3      EQU 0X72
#define LED RD0

        ORG 0
        GOTO MAIN

MAIN:   CALL    SETUP          ; PORTD output, 4 MHz (Part 7)
REPEAT: BSF     LED            ; LED on
        CALL    DELAY_500MS
        BCF     LED            ; LED off
        CALL    DELAY_500MS
        GOTO    REPEAT

DELAY_500MS:                   ; three nested loops
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
        RETURN`, 'asm', { cap: R`Activity 6 (the SETUP subroutine is shown in Part 7). The delay routine takes $499\,998$ cycles including its <code>RETURN</code>; with the $2$ cycles of the <code>CALL</code> that is exactly $500\,000$ cycles, $500\ \mathrm{ms}$ at $4\ \mathrm{MHz}$.` }),
        D.T(R`<p>Notice the trick of the three loops: the inner <code>GOTO $-1</code> jumps back to <code>DECFSZ A1</code>, and the other two <code>GOTO</code> instructions also jump back to that same line. When A1 reaches $0$ the next pass starts from $0$ and therefore runs $256$ times; only the first pass uses $54_{16} = 84$. The values were produced by a delay calculator for exactly $500\ \mathrm{ms}$.</p>`),
        D.num('Where does GOTO $-5 go?', R`<p>In <code>DELAY_500MS</code>, to which instruction does <code>GOTO $-5</code> jump? Give its position counted from <code>DECFSZ A1, 1</code> as $0$.</p>`, 0, R`<code>GOTO $-5</code> is $5$ instructions after <code>DECFSZ A1, 1</code> (DECFSZ A1, GOTO, DECFSZ A2, GOTO, DECFSZ A3, GOTO), so it jumps back to <code>DECFSZ A1, 1</code> itself, position $0$.`, { hint: 'Count the instructions from DECFSZ A1, 1 to GOTO $-5.' }),
        D.asm('Check the 500 ms delay', R`<p>Copy the subroutine <code>DELAY_500MS</code> of Activity 6 below the given main program, so that the test can measure it. The test checks that the call takes exactly $500\,000$ cycles.</p>`, {
          start: 'A1 EQU 0X70\nA2 EQU 0X71\nA3 EQU 0X72\n\n    CALL DELAY_500MS\n    GOTO $\n\n; write DELAY_500MS here\n',
          tests: [{ maxSteps: 2000000, expect: { CYCLES: 500000 } }],
          reqs: [{ re: /DELAY_500MS\s*:/i, msg: 'Write the label DELAY_500MS: before the subroutine.' }],
          solution: 'A1 EQU 0X70\nA2 EQU 0X71\nA3 EQU 0X72\n\n    CALL DELAY_500MS\n    GOTO $\n\nDELAY_500MS:\n    MOVLW 0X54\n    MOVWF A1\n    MOVLW 0X8a\n    MOVWF A2\n    MOVLW 0X03\n    MOVWF A3\n    DECFSZ A1, 1\n    GOTO $-1\n    DECFSZ A2, 1\n    GOTO $-3\n    DECFSZ A3, 1\n    GOTO $-5\n    NOP\n    RETURN\n'
        }, R`$499\,998$ cycles in the subroutine plus $2$ for the CALL give exactly $500\,000$ cycles.`, { hint: 'Copy the routine exactly, including the NOP and the RETURN.' }),
        D.num('Period of 1 Hz', R`<p>An LED blinks at $2\ \mathrm{Hz}$ with equal on and off times. How long is it on, in milliseconds?</p>`, 250, R`$T = \frac{1}{2\ \mathrm{Hz}} = 500\ \mathrm{ms}$ and the LED is on for $\frac{T}{2} = 250\ \mathrm{ms}$.`, { unit: 'ms', hint: R`First find the period $T = \frac{1}{f}$.` }),
        D.num('Half the blinking speed', R`<p>To blink the LED at $0.5\ \mathrm{Hz}$ instead of $1\ \mathrm{Hz}$ (with equal on and off times), how many times must <code>DELAY_500MS</code> be called after each change of the LED?</p>`, 2, R`At $0.5\ \mathrm{Hz}$ the period is $\frac{1}{0.5} = 2\ \mathrm{s}$: $1\ \mathrm{s}$ on and $1\ \mathrm{s}$ off, which is two calls of $500\ \mathrm{ms}$.`, { hint: 'Find the new period first.' })
      ]
    },
{
      title: 'Challenge: integer square root',
      objectives: ['You will turn a mathematical identity into a loop'],
      blocks: [
        D.T(R`<p>The PIC cannot multiply, let alone take square roots. But the odd numbers have a beautiful property:</p>
$$1 = 1^{2}, \quad 1 + 3 = 2^{2}, \quad 1 + 3 + 5 = 3^{2}, \quad \ldots, \quad 1 + 3 + 5 + \cdots + (2k - 1) = k^{2}.$$
<p>So the square root of a number is how many odd numbers $1, 3, 5, \ldots$ can be subtracted from it, one after the other, before the rest becomes too small. For $20$: $20 - 1 - 3 - 5 - 7 = 4$, and the next odd number $9$ no longer fits, so $\lfloor \sqrt{20} \rfloor = 4$.</p>`),
        D.asm('Integer square root', R`<p>Store in ROOT the integer square root of N ($0 \leq \text{N} \leq 255$): the biggest whole number whose square is not more than N. Use the odd-number method above. REST and ODD are free.</p>`, {
          start: 'N    EQU 0x20\nROOT EQU 0x21\nREST EQU 0x22\nODD  EQU 0x23\n\n; write your code here\n\n    GOTO $\n',
          tests: [[0, 0], [1, 1], [2, 1], [15, 3], [16, 4], [20, 4], [99, 9], [100, 10], [255, 15]].map(([n, r]) => ({ name: R`$\text{N} = ` + n + R`$`, init: { N: n, ROOT: 99 }, expect: { ROOT: r } })),
          solution: 'N    EQU 0x20\nROOT EQU 0x21\nREST EQU 0x22\nODD  EQU 0x23\n\n    CLRF  ROOT\n    MOVF  N, W\n    MOVWF REST        ; what is left\n    MOVLW 1\n    MOVWF ODD         ; the next odd number\nLOOP:\n    MOVF  ODD, W\n    SUBWF REST, W     ; REST - ODD\n    BTFSS STATUS, 0\n    GOTO  DONE        ; it does not fit any more\n    MOVWF REST\n    INCF  ROOT, F\n    INCF  ODD, F\n    INCF  ODD, F      ; ODD + 2\n    GOTO  LOOP\nDONE:\n    GOTO $\n'
        }, R`Each round subtracts the next odd number and counts one. After $k$ rounds exactly $k^{2}$ has been subtracted, so the loop stops at the biggest $k$ with $k^{2} \leq \text{N}$. For $\text{N} = 255$: $15^{2} = 225$ fits but $16^{2} = 256$ does not.`, { challenge: true, hint: [R`REST starts as N, ODD as $1$, ROOT as $0$.`, R`Loop: if $\text{REST} - \text{ODD}$ needs a borrow, stop; otherwise keep the difference in REST, add $1$ to ROOT and $2$ to ODD.`] })
      ]
    }
  ]
});
})();
