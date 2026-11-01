/* Part 4 - Making decisions (skip instructions, comparisons and several cases; Lectures 4, 5 and 9, Activity 7) */
(function () {
const ASTART = '; write your instructions here\n\n    GOTO $\n';
D.part({
  title: 'Making decisions',
  intro: R`<p>A program becomes useful when it can choose what to do: light an LED only when a button is pressed, compare a temperature with a limit, react differently to each switch combination. The PIC has no "if" instruction. Instead, it tests one bit and <b>skips</b> the next instruction. In this part you build every kind of decision from that single idea: equal or not, bigger or smaller, inside a range, and a choice between several cases, as in Activity 7.</p>`,
  sections: [
    {
      title: 'Skip instructions: if and else in assembly',
      objectives: ['You will be able to use BTFSS and BTFSC', 'You will be able to write an if/else decision in assembly with skips and labels', 'You will know how many cycles a skip takes'],
      blocks: [
        D.T(R`<p>The PIC makes decisions with two instructions that test one bit and <b>skip</b> the next instruction:</p>`),
        D.TABLE(['Instruction', 'Name', 'Operation'], [
          ['<code>BTFSS f, b</code>', 'Bit Test f, Skip if Set', 'if bit b of f is $1$, skip the next instruction'],
          ['<code>BTFSC f, b</code>', 'Bit Test f, Skip if Clear', 'if bit b of f is $0$, skip the next instruction'],
          ['<code>BSF f, b</code>', 'Bit Set f', 'bit b of f $\\leftarrow 1$'],
          ['<code>BCF f, b</code>', 'Bit Clear f', 'bit b of f $\\leftarrow 0$']
        ]),
        D.T(R`<p>The bit can be given by its number or by its name: <code>BTFSC STATUS, 2</code> and <code>BTFSC ZERO</code> test the same Z flag (the lecture code uses <code>ZERO</code>). The skipped instruction is usually a <code>GOTO</code>, so the skip decides which way the program goes. A decision written in words, "<i>if X is 9 then RESULT is 1, else RESULT is 2</i>", becomes:</p>`),
        D.CODE(R`    MOVF    X, W
    XORLW   9          ; Z = 1 if X == 9
    BTFSS   ZERO       ; equal? skip the GOTO
    GOTO    ELSE_PART  ; not equal
    MOVLW   1          ; then-part
    MOVWF   RESULT
    GOTO    END_IF
ELSE_PART:
    MOVLW   2          ; else-part
    MOVWF   RESULT
END_IF:`, 'asm', { cap: R`The skip jumps over exactly one instruction. When X is $9$, Z is $1$ and <code>BTFSS</code> skips the <code>GOTO ELSE_PART</code>, so the then-part runs; the then-part ends with a jump over the else-part.` }),
        D.T(R`<p>When one branch is a single instruction, the jumps are not even needed: the skip itself chooses whether that instruction runs. For example "<i>if Z is 1, increment COUNT</i>" is just <code>BTFSC ZERO</code> followed by <code>INCF COUNT, F</code>.</p>`),
        D.KEY('Cycles', R`<p>Most instructions take one instruction cycle. A skip takes $2$ cycles when it skips (and $1$ when it does not), and <code>GOTO</code> always takes $2$ cycles. This matters when a program must run with exact timing (Part 5).</p>`),
        D.trace('Trace with BTFSS', R`<p>REG1 $= 128$ (bit 7 is $1$). Follow the program. A skipped instruction is not executed, so it does not appear in the table.</p>`, { pre: 'REG1 EQU 0x20', code: 'MOVLW 1\nBTFSS REG1, 7\nMOVLW 2\nADDLW 10\nBTFSC REG1, 0\nADDLW 100', watch: ['W'], init: { REG1: 128 } }, R`Bit 7 is $1$, so <code>BTFSS</code> skips <code>MOVLW 2</code>; W $= 1 + 10 = 11$. Bit 0 is $0$, so <code>BTFSC</code> skips <code>ADDLW 100</code>.`, { hint: 'Skip if Set / Skip if Clear.', note: R`Start: REG1 $= 128 = 1000\,0000_{2}$.` }),
        D.multi('Cycles of a decision', R`<p>Count the instruction cycles of the code above, from <code>MOVF X, W</code> up to <code>END_IF</code>, in the two cases.</p>`, [{ label: R`X $= 9$:`, ans: [8], unit: 'cycles' }, { label: R`X $= 5$:`, ans: [7], unit: 'cycles' }], R`X $= 9$: MOVF $1$, XORLW $1$, BTFSS skipping $2$, MOVLW $1$, MOVWF $1$, GOTO END_IF $2$, in total $8$. X $= 5$: MOVF $1$, XORLW $1$, BTFSS not skipping $1$, GOTO ELSE_PART $2$, MOVLW $1$, MOVWF $1$, in total $7$.`, { hint: 'A skip that skips takes 2 cycles, otherwise 1; GOTO always takes 2.' }),
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
      title: 'Comparing numbers',
      objectives: ['You will be able to test equal, smaller and bigger with the flags Z and C', 'You will be able to compare a register with a constant', 'You will be able to test whether a value lies inside a range'],
      blocks: [
        D.T(R`<p>Every comparison is a subtraction followed by a look at the flags. For two unsigned numbers A and B, put B in W and calculate $A - B$ with <code>SUBWF A, W</code> (A is not changed). Then:</p>`),
        D.TABLE(['Condition', 'Flags after A minus B', 'Skip instruction that jumps when the condition is true'], [
          [R`$A = B$`, R`Z $= 1$`, '<code>BTFSC STATUS, 2</code> + <code>GOTO</code>'],
          [R`$A \neq B$`, R`Z $= 0$`, '<code>BTFSS STATUS, 2</code> + <code>GOTO</code>'],
          [R`$A \geq B$`, R`C $= 1$`, '<code>BTFSC STATUS, 0</code> + <code>GOTO</code>'],
          [R`$A < B$`, R`C $= 0$`, '<code>BTFSS STATUS, 0</code> + <code>GOTO</code>'],
          [R`$A > B$`, R`C $= 1$ and Z $= 0$`, R`exchange the roles: $B < A$ is $B - A$ with C $= 0$`],
          [R`$A \leq B$`, R`C $= 0$ or Z $= 1$`, R`exchange the roles: $B \geq A$ is $B - A$ with C $= 1$`]
        ], { cap: R`"Skip if clear" followed by a <code>GOTO</code> jumps when the bit is $1$, and "skip if set" followed by a <code>GOTO</code> jumps when the bit is $0$.` }),
        D.H('Comparing with a constant'),
        D.T(R`<p>To compare a register with a number $k$, load the register into W and use <code>SUBLW k</code>, which calculates $k - W$:</p>
$$C = 1 \iff k - W \geq 0 \iff W \leq k.$$
<p>So "<i>is NUM greater than $100$?</i>" is: <code>MOVF NUM, W</code>, <code>SUBLW 100</code>, and NUM $> 100$ exactly when C $= 0$. Watch the direction: the constant is now the first number of the subtraction.</p>`),
        D.CODE(R`    MOVF    NUM, W
    SUBLW   100        ; 100 - NUM: C = 1 if NUM <= 100
    BTFSS   STATUS, 0  ; C = 1? then NUM <= 100: skip
    GOTO    TOO_BIG    ; C = 0: NUM > 100`, 'asm'),
        D.H('Ranges'),
        D.T(R`<p>A condition such as $20 \leq T \leq 30$ needs two comparisons, one for each limit. Test the first limit and jump away as soon as it fails; only a value that survives both tests is inside the range. This is how a thermostat or an alarm decides (Part 12 measures real temperatures).</p>`),
        D.mc('Which flag for A < B?', R`<p>After <code>MOVF B, W</code> and <code>SUBWF A, W</code>, which flag value means $A < B$?</p>`, ['C $= 0$', 'C $= 1$', 'Z $= 1$', 'DC $= 1$'], 0, R`$A - B$ needs a borrow exactly when $A < B$, and a borrow gives C $= 0$.`, { hint: 'A borrow clears the carry.' }),
        D.multi('Flags of a comparison', R`<p>NUM $= 70$. After <code>MOVF NUM, W</code> and <code>SUBLW 50</code>, what are W, Z and C? Is NUM greater than $50$?</p>`, [{ label: 'W =', ans: [236] }, { label: 'Z =', ans: [0] }, { label: 'C =', ans: [0] }, { label: R`NUM $> 50$? (1 yes, 0 no)`, ans: [1] }], R`$50 - 70 = -20$, stored as $236$, with a borrow: C $= 0$, which means W $> 50$.`, { hint: 'SUBLW calculates k minus W.' }),
        D.trace('A comparison chain', R`<p>T $= 25$. Follow the program: it sets FLAG to $1$ only when $20 \leq T \leq 30$. Skipped instructions do not appear.</p>`, { pre: 'T EQU 0x20\nFLAG EQU 0x21', code: 'CLRF FLAG\nMOVLW 20\nSUBWF T, W\nBTFSS STATUS, 0\nGOTO $+5\nMOVF T, W\nSUBLW 30\nBTFSC STATUS, 0\nINCF FLAG, F', watch: ['W', 'C', 'FLAG'], init: { T: 25 } }, R`$T - 20 = 5$ with C $= 1$ ($T \geq 20$), so the jump is skipped. $30 - T = 5$ with C $= 1$ ($T \leq 30$), so <code>INCF FLAG, F</code> runs.`, { hint: R`<code>SUBWF T, W</code> is $T - 20$; <code>SUBLW 30</code> is $30 - T$.`, note: R`Start: T $= 25$. <code>GOTO $+5</code> jumps five instructions ahead, past the end of the code.` }),
        D.asm('Greater than 100?', R`<p>Set FLAG to $1$ if the unsigned number in NUM is <b>greater than</b> $100$, and to $0$ otherwise. Use <code>SUBLW</code>.</p>`, {
          start: 'NUM  EQU 0x20\nFLAG EQU 0x21\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [[150, 1], [100, 0], [101, 1], [7, 0], [255, 1]].map(([v, f]) => ({ name: R`$\text{NUM} = ` + v + '$', init: { NUM: v, FLAG: 9 }, expect: { FLAG: f, NUM: v } })),
          reqs: [{ re: /\bSUBLW\b/i, msg: 'Use SUBLW to compare with 100.' }],
          solution: 'NUM  EQU 0x20\nFLAG EQU 0x21\n\n    CLRF  FLAG\n    MOVF  NUM, W\n    SUBLW 100           ; 100 - NUM: C = 1 if NUM <= 100\n    BTFSS STATUS, 0\n    INCF  FLAG, F       ; C = 0: NUM > 100\n    GOTO $\n'
        }, R`<code>SUBLW 100</code> gives C $= 1$ when NUM $\leq 100$. Only when C $= 0$ is FLAG incremented from $0$ to $1$. The test $\text{NUM} = 100$ checks the boundary: $100$ is not greater than $100$.`, { hint: [R`Start with <code>CLRF FLAG</code>.`, R`<code>MOVF NUM, W</code>, <code>SUBLW 100</code>, then skip <code>INCF FLAG, F</code> when C $= 1$.`] }),
        D.asm('Inside a range', R`<p>A thermostat keeps the temperature T between $20$ and $30$ (both included). Set OK to $1$ when $20 \leq T \leq 30$ and to $0$ otherwise.</p>`, {
          start: 'T  EQU 0x20\nOK EQU 0x21\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [[25, 1], [20, 1], [30, 1], [19, 0], [31, 0], [0, 0], [200, 0]].map(([v, f]) => ({ name: R`$T = ` + v + '$', init: { T: v, OK: 9 }, expect: { OK: f } })),
          solution: 'T  EQU 0x20\nOK EQU 0x21\n\n    CLRF  OK\n    MOVLW 20\n    SUBWF T, W          ; T - 20: C = 1 if T >= 20\n    BTFSS STATUS, 0\n    GOTO  DONE          ; T < 20\n    MOVF  T, W\n    SUBLW 30            ; 30 - T: C = 1 if T <= 30\n    BTFSC STATUS, 0\n    INCF  OK, F         ; both tests passed\nDONE:\n    GOTO $\n'
        }, R`The lower limit is tested with $T - 20$ (C $= 1$ when $T \geq 20$), the upper limit with $30 - T$ (C $= 1$ when $T \leq 30$). The boundaries $20$ and $30$ must give OK $= 1$.`, { hint: [R`Clear OK first, then jump to the end as soon as a test fails.`, R`Lower limit: <code>MOVLW 20</code>, <code>SUBWF T, W</code>. Upper limit: <code>MOVF T, W</code>, <code>SUBLW 30</code>.`] }),
        D.asm('Limit a value', R`<p>The register LEVEL must never exceed $200$. If it is greater than $200$, set it to $200$; otherwise leave it unchanged.</p>`, {
          start: 'LEVEL EQU 0x20\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [[250, 200], [201, 200], [200, 200], [120, 120], [0, 0]].map(([v, r]) => ({ name: R`$\text{LEVEL} = ` + v + '$', init: { LEVEL: v }, expect: { LEVEL: r } })),
          solution: 'LEVEL EQU 0x20\n\n    MOVF  LEVEL, W\n    SUBLW 200           ; 200 - LEVEL: C = 1 if LEVEL <= 200\n    BTFSC STATUS, 0\n    GOTO  DONE\n    MOVLW 200\n    MOVWF LEVEL\nDONE:\n    GOTO $\n'
        }, R`Compare with <code>SUBLW 200</code>; when C $= 1$ the value is already fine and the program jumps over the two instructions that write $200$.`, { hint: R`<code>MOVF LEVEL, W</code>, <code>SUBLW 200</code>, then <code>BTFSC STATUS, 0</code> and <code>GOTO DONE</code>.` })
      ]
    },
    {
      title: 'Several cases (Activity 7)',
      objectives: ['You will be able to choose between several cases with a chain of comparisons', 'You will be able to write the case chain of Activity 7'],
      blocks: [
        D.T(R`<p><b>Activity 7</b> reads four switches and lights three LEDs according to a table. Using the "more logical" wiring of the lecture (a pressed switch reads $1$, a lit LED is $1$), the table is:</p>`),
        D.TABLE(['SW3 SW2 SW1 SW0', 'LED2 LED1 LED0'], [['<code>1001</code>', '<code>111</code>'], ['<code>0111</code>', '<code>100</code>'], ['<code>1100</code>', '<code>011</code>'], ['anything else', '<code>000</code>']], { mono: [0, 1], small: true }),
        D.T(R`<p>In assembly the cases are compared one after the other with <code>XORLW</code> and <code>BTFSC ZERO</code>: as soon as one matches, the program jumps to the code of that case; if none matches, the code after the chain is the "else" case. Activity 7 does exactly that inside a subroutine that returns the LED value with <code>RETLW</code> (you will meet subroutines in Part 6). Without a subroutine the chain looks like this:</p>`),
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
        D.WARN('Reload before every XORLW', R`<p><code>XORLW</code> changes W. If the next case compares W again without reloading it, it compares the result of the previous XOR, not the switches. Either reload with <code>MOVF SW, W</code> before every case, or use the trick of the lecture: XOR with the <i>difference</i> between two consecutive case values.</p>`),
        D.asm('Activity 7 in assembly', R`<p>Write the case chain of Activity 7: compare the register SW with <code>1001B</code>, <code>0111B</code> and <code>1100B</code> and store <code>111B</code>, <code>100B</code>, <code>011B</code> (or <code>000B</code> for any other value) in LEDS.</p>`, {
          pre: 'SW EQU 0x20\nLEDS EQU 0x21', start: ASTART,
          tests: [{ name: 'SW = 1001', init: { SW: 9 }, expect: { LEDS: 7 } }, { name: 'SW = 0111', init: { SW: 7 }, expect: { LEDS: 4 } }, { name: 'SW = 1100', init: { SW: 12 }, expect: { LEDS: 3 } }, { name: 'SW = 0110', init: { SW: 6, LEDS: 99 }, expect: { LEDS: 0 } }],
          solution: '    MOVF SW, W\n    XORLW 00001001B\n    BTFSC ZERO\n    GOTO CASE1\n    MOVF SW, W\n    XORLW 00000111B\n    BTFSC ZERO\n    GOTO CASE2\n    MOVF SW, W\n    XORLW 00001100B\n    BTFSC ZERO\n    GOTO CASE3\n    MOVLW 00000000B\n    GOTO STORE\nCASE1:\n    MOVLW 00000111B\n    GOTO STORE\nCASE2:\n    MOVLW 00000100B\n    GOTO STORE\nCASE3:\n    MOVLW 00000011B\nSTORE:\n    MOVWF LEDS\n    GOTO $'
        }, 'Each case reloads SW into W, XORs it with the case value and jumps to its own label when Z = 1; all paths end at STORE.', { hint: [R`Copy the chain shown above and add the third case.`, R`Reload SW before every <code>XORLW</code>: the XOR changed W.`] }),
        D.asm('A grade', R`<p>SCORE holds a mark from $0$ to $100$. Store in GRADE the ASCII code of the letter: <code>'A'</code> for $85$ or more, <code>'B'</code> for $70$ to $84$, <code>'C'</code> for $50$ to $69$ and <code>'F'</code> below $50$. Test the highest limit first.</p>`, {
          start: 'SCORE EQU 0x20\nGRADE EQU 0x21\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [[92, 'A'], [85, 'A'], [84, 'B'], [70, 'B'], [69, 'C'], [50, 'C'], [49, 'F'], [0, 'F']].map(([v, g]) => ({ name: R`$\text{SCORE} = ` + v + '$', init: { SCORE: v }, expect: { GRADE: g.charCodeAt(0) } })),
          solution: "SCORE EQU 0x20\nGRADE EQU 0x21\n\n    MOVLW 85\n    SUBWF SCORE, W      ; SCORE - 85\n    BTFSC STATUS, 0\n    GOTO  GA            ; SCORE >= 85\n    MOVLW 70\n    SUBWF SCORE, W\n    BTFSC STATUS, 0\n    GOTO  GB\n    MOVLW 50\n    SUBWF SCORE, W\n    BTFSC STATUS, 0\n    GOTO  GC\n    MOVLW 'F'\n    GOTO  STORE\nGA: MOVLW 'A'\n    GOTO  STORE\nGB: MOVLW 'B'\n    GOTO  STORE\nGC: MOVLW 'C'\nSTORE:\n    MOVWF GRADE\n    GOTO $\n"
        }, R`Each test is SCORE minus a limit: C $= 1$ means SCORE $\geq$ the limit. Because the highest limit is tested first, a mark that reaches the second test is already known to be below $85$.`, { hint: [R`<code>MOVLW 85</code>, <code>SUBWF SCORE, W</code>, <code>BTFSC STATUS, 0</code>, <code>GOTO GA</code>; then the same for $70$ and $50$.`, R`Each case loads its letter, for example <code>MOVLW 'A'</code>, and all cases end at a common <code>MOVWF GRADE</code>.`] }),
        D.mc('Order of the tests', R`<p>A program tests "SCORE $\geq 50$" first and jumps to the grade C code when it is true; then it tests "SCORE $\geq 70$" and "SCORE $\geq 85$". What grade does a mark of $90$ get?</p>`, ['C', 'A', 'B', 'F'], 0, R`$90 \geq 50$ is already true, so the first test jumps to grade C and the other tests are never reached. With "greater or equal" tests, start from the highest limit.`, { hint: 'Which test is true first?' })
      ]
    }
  ]
});
})();
