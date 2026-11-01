/* Part 8 - Arithmetic beyond 8 bits (16-bit numbers, multiplication and division, decimal digits and BCD) */
(function () {
const ASTART = '; write your code here\n\n    GOTO $\n';
const hx = (n) => n.toString(16).toUpperCase().padStart(4, '0');
D.part({
  title: 'Arithmetic beyond 8 bits',
  intro: R`<p>A register holds only $8$ bits, but real programs count beyond $255$, multiply, and show numbers as decimal digits on a display. In this part you store numbers in two registers and add, subtract and compare them with the carry, multiply and divide with loops and shifts, and split a byte into its decimal digits and ASCII characters, which Part 13 sends to the LCD and the serial port.</p>`,
  sections: [
    {
      title: '16-bit numbers',
      objectives: ['You will be able to store a 16-bit number in two registers', 'You will be able to increment, decrement and add 16-bit numbers', 'You will know how the carry links the two bytes'],
      blocks: [
        D.T(R`<p>The registers of the PIC hold $8$ bits, so a $16$-bit number uses two of them: a <b>high</b> byte H and a <b>low</b> byte L, with value $256 \times H + L$. Timer1 is such a pair (TMR1H:TMR1L), and so is the 10-bit result of the A/D converter (ADRESH:ADRESL). Operations on such numbers are done one byte at a time, passing the carry from the low byte to the high byte:</p>`),
        D.CODE(R`    INCF    NL, F       ; low byte + 1
    BTFSC   STATUS, 2   ; became 0? (Z)
    INCF    NH, F       ; then carry into the high byte`, 'asm', { cap: R`A 16-bit increment: when the low byte overflows from $255$ to $0$, the high byte is incremented. INCF does not change C, so the overflow is detected with Z.` }),
        D.CODE(R`    MOVF    BL, W
    ADDWF   AL, F       ; low bytes, C = carry out
    BTFSC   STATUS, 0
    INCF    AH, F       ; add the carry
    MOVF    BH, W
    ADDWF   AH, F       ; high bytes`, 'asm', { cap: R`A 16-bit addition AH:AL $\leftarrow$ AH:AL $+$ BH:BL: add the low bytes, add the carry to the high byte, then add the high bytes.` }),
        D.T(R`<p>A decrement works the other way round: the high byte must be decremented when the low byte goes from $0$ to $255$. Since DECF does not change C either, test whether the low byte is zero <i>before</i> decrementing it.</p>`),
        D.multi('High and low byte', R`<p>The number $1000$ is stored in two registers H:L. Give H and L in decimal.</p>`, [{ label: 'H =', ans: [3] }, { label: 'L =', ans: [232] }], R`$1000 = 3 \times 256 + 232$, or in hexadecimal $03E8_{16}$: H $= 03_{16} = 3$ and L $= E8_{16} = 232$.`, { hint: R`Divide by $256$: the quotient is H and the remainder is L.` }),
        D.num('A 16-bit value', R`<p>The pair TMR1H:TMR1L holds $12_{16}$ and $34_{16}$. What is the 16-bit value in decimal?</p>`, 0x1234, R`$1234_{16} = 18 \times 256 + 52 = 4660$.`, { hint: R`Value $= 256 \times H + L$.` }),
        D.asm('16-bit increment', R`<p>The 16-bit number NH:NL must be incremented by one, with the carry going into NH when NL overflows. The tests start from several values.</p>`, {
          pre: 'NH EQU 0x20\nNL EQU 0x21', start: ASTART,
          tests: [{ name: R`$00FF_{16} + 1$`, init: { NH: 0, NL: 0xFF }, expect: { NH: 1, NL: 0 } }, { name: R`$1234_{16} + 1$`, init: { NH: 0x12, NL: 0x34 }, expect: { NH: 0x12, NL: 0x35 } }, { name: R`$0BFF_{16} + 1$`, init: { NH: 0x0B, NL: 0xFF }, expect: { NH: 0x0C, NL: 0 } }],
          solution: '    INCF NL, F\n    BTFSC STATUS, 2\n    INCF NH, F\n    GOTO $'
        }, 'INCF sets Z when the low byte wraps to 0; only then is the high byte incremented.', { hint: 'INCF NL, F; then test Z with BTFSC STATUS, 2 and increment NH.' }),
        D.asm('16-bit decrement', R`<p>Decrement the 16-bit number NH:NL by one. When NL is $0$ before the decrement, NH must be decremented too (a borrow). The tests start from several values.</p>`, {
          start: 'NH EQU 0x20\nNL EQU 0x21\n\n; write your code here\n\n    GOTO $\n',
          tests: [[0x0100, 0x00FF], [0x1234, 0x1233], [0x0B00, 0x0AFF], [0x0001, 0x0000]].map(([a, r]) => ({ name: R`$` + hx(a) + R`_{16} - 1$`, init: { NH: a >> 8, NL: a & 255 }, expect: { NH: r >> 8, NL: r & 255 } })),
          solution: 'NH EQU 0x20\nNL EQU 0x21\n\n    MOVF  NL, F       ; Z = 1 if NL is 0\n    BTFSC STATUS, 2\n    DECF  NH, F       ; borrow from the high byte\n    DECF  NL, F\n    GOTO $\n'
        }, R`<code>MOVF NL, F</code> tests NL for zero without changing it. Only when NL is $0$ is NH decremented; then NL goes from $0$ to $255$.`, { hint: [R`Test NL with <code>MOVF NL, F</code> before decrementing it.`, R`<code>BTFSC STATUS, 2</code> then <code>DECF NH, F</code>, and finally <code>DECF NL, F</code>.`] }),
        D.asm('16-bit addition', R`<p>Add the 16-bit number BH:BL to AH:AL (the result stays in AH:AL). The tests check several values.</p>`, {
          pre: 'AH EQU 0x20\nAL EQU 0x21\nBH EQU 0x22\nBL EQU 0x23', start: ASTART,
          tests: [{ name: R`$01F0_{16} + 0020_{16}$`, init: { AH: 1, AL: 0xF0, BH: 0, BL: 0x20 }, expect: { AH: 2, AL: 0x10 } }, { name: R`$1000 + 2000$`, init: { AH: 3, AL: 0xE8, BH: 7, BL: 0xD0 }, expect: { AH: 0x0B, AL: 0xB8 } }, { name: R`$00FF_{16} + 00FF_{16}$`, init: { AH: 0, AL: 0xFF, BH: 0, BL: 0xFF }, expect: { AH: 1, AL: 0xFE } }],
          solution: '    MOVF BL, W\n    ADDWF AL, F\n    BTFSC STATUS, 0\n    INCF AH, F\n    MOVF BH, W\n    ADDWF AH, F\n    GOTO $'
        }, 'Low bytes first; the carry out of the low addition is added to the high byte, then the high bytes are added.', { hint: 'Copy the 16-bit addition shown above.' }),
        D.mc('When does the high byte change?', 'In a 16-bit addition, when must 1 be added to the high byte of the result?', ['When the addition of the low bytes sets the carry C', 'When the low byte of the result is zero', 'When the high bytes are equal', 'Always'], 0, 'The carry out of the low byte is worth 256: it belongs to the high byte.', { hint: 'What does the ninth bit of the low-byte sum represent?' })
      ]
    },
    {
      title: '16-bit subtraction and comparison',
      objectives: ['You will be able to subtract two 16-bit numbers with the borrow', 'You will be able to compare two 16-bit numbers'],
      blocks: [
        D.T(R`<p>Subtraction follows the same pattern as addition, with the borrow instead of the carry. After <code>SUBWF</code> on the low bytes, C $= 0$ means a borrow, and $1$ must then be taken from the high byte:</p>`),
        D.CODE(R`    MOVF    BL, W
    SUBWF   AL, F       ; low bytes: AL - BL
    BTFSS   STATUS, 0   ; borrow? (C = 0)
    DECF    AH, F       ; take it from the high byte
    MOVF    BH, W
    SUBWF   AH, F       ; high bytes: AH - BH`, 'asm', { cap: R`AH:AL $\leftarrow$ AH:AL $-$ BH:BL.` }),
        D.H('Comparing 16-bit numbers'),
        D.T(R`<p>To compare two 16-bit numbers A and B, compare the <b>high bytes first</b>: if they differ, they decide alone. Only when the high bytes are equal do the low bytes decide. This is how you compare $1200$ and $1150$: the hundreds decide before the units.</p>`),
        D.asm('16-bit subtraction', R`<p>Calculate AH:AL $\leftarrow$ AH:AL $-$ BH:BL (the tests keep A $\geq$ B).</p>`, {
          start: 'AH EQU 0x20\nAL EQU 0x21\nBH EQU 0x22\nBL EQU 0x23\n\n; write your code here\n\n    GOTO $\n',
          tests: [[0x0310, 0x0120], [1000, 1], [0x0100, 0x0001], [0x1234, 0x1234]].map(([a, b]) => ({ name: R`$` + hx(a) + R`_{16} - ` + hx(b) + R`_{16}$`, init: { AH: a >> 8, AL: a & 255, BH: b >> 8, BL: b & 255 }, expect: { AH: (a - b) >> 8, AL: (a - b) & 255 } })),
          solution: 'AH EQU 0x20\nAL EQU 0x21\nBH EQU 0x22\nBL EQU 0x23\n\n    MOVF  BL, W\n    SUBWF AL, F\n    BTFSS STATUS, 0\n    DECF  AH, F\n    MOVF  BH, W\n    SUBWF AH, F\n    GOTO $\n'
        }, R`Low bytes first; a borrow (C $= 0$) costs $1$ in the high byte; then the high bytes are subtracted.`, { hint: 'Copy the subtraction shown above.' }),
        D.asm('16-bit comparison', R`<p>Set FLAG to $1$ if A $\geq$ B, where A $=$ AH:AL and B $=$ BH:BL are unsigned 16-bit numbers, and to $0$ otherwise. A and B must keep their values.</p>`, {
          start: 'AH   EQU 0x20\nAL   EQU 0x21\nBH   EQU 0x22\nBL   EQU 0x23\nFLAG EQU 0x24\n\n; write your code here\n\n    GOTO $\n',
          tests: [[1200, 1150, 1], [1150, 1200, 0], [0x0300, 0x02FF, 1], [0x02FF, 0x0300, 0], [500, 500, 1], [0x0105, 0x0110, 0]].map(([a, b, f]) => ({ name: R`$A = ` + a + R`$, $B = ` + b + R`$`, init: { AH: a >> 8, AL: a & 255, BH: b >> 8, BL: b & 255, FLAG: 9 }, expect: { FLAG: f, AH: a >> 8, AL: a & 255 } })),
          solution: 'AH   EQU 0x20\nAL   EQU 0x21\nBH   EQU 0x22\nBL   EQU 0x23\nFLAG EQU 0x24\n\n    CLRF  FLAG\n    MOVF  BH, W\n    SUBWF AH, W       ; AH - BH\n    BTFSS STATUS, 0\n    GOTO  DONE        ; AH < BH: A < B\n    BTFSS STATUS, 2\n    GOTO  BIGGER      ; AH > BH: A > B\n    MOVF  BL, W       ; high bytes equal: the low bytes decide\n    SUBWF AL, W\n    BTFSS STATUS, 0\n    GOTO  DONE\nBIGGER:\n    INCF  FLAG, F\nDONE:\n    GOTO $\n'
        }, R`$AH - BH$ with C $= 0$ means A $<$ B; with C $= 1$ and Z $= 0$ it means A $>$ B. Only when Z $= 1$ (equal high bytes) does $AL - BL$ decide.`, { hint: [R`Clear FLAG. Compare the high bytes with <code>MOVF BH, W</code> and <code>SUBWF AH, W</code>.`, R`C $= 0$: done (A $<$ B). Z $= 0$: A $>$ B. Otherwise compare the low bytes the same way.`] }),
        D.mc('Which byte first?', 'To compare two 16-bit numbers, which bytes must be compared first?', ['The high bytes', 'The low bytes', 'It does not matter', 'Both at the same time with one SUBWF'], 0, 'A difference in the high bytes is worth at least 256, more than any difference in the low bytes.', { hint: 'Which byte has the bigger weight?' })
      ]
    },
    {
      title: 'Multiplication and division',
      objectives: ['You will be able to multiply by a constant with shifts and additions', 'You will be able to multiply two bytes into a 16-bit result', 'You will know how division by repeated subtraction works'],
      blocks: [
        D.T(R`<p>The ALU of the PIC16 cannot multiply or divide. Part 5 multiplied by repeated addition and divided by repeated subtraction. Two better tools exist:</p>
<ul>
<li><b>Multiplying by a constant</b> splits the constant into powers of two, which are left shifts: $10X = 8X + 2X$, so three shifts and one addition replace ten additions.</li>
<li><b>Multiplying two bytes</b> gives up to $16$ bits ($255 \times 255 = 65025$), so the product needs two registers, and each addition must carry into the high byte, as in the 16-bit addition.</li>
</ul>`),
        D.CODE(R`    BCF     STATUS, 0
    RLF     X, W        ; W = 2X
    MOVWF   TEMP        ; TEMP = 2X
    BCF     STATUS, 0
    RLF     TEMP, F     ; TEMP = 4X
    BCF     STATUS, 0
    RLF     TEMP, F     ; TEMP = 8X
    ADDWF   TEMP, W     ; W = 8X + 2X = 10X`, 'asm', { cap: R`Multiplying by $10$ with shifts. <code>RLF X, W</code> leaves X unchanged; W keeps $2X$ while TEMP is shifted.` }),
        D.T(R`<p>The fastest general method, <b>shift and add</b>, is the long multiplication of school in binary: for each bit of the multiplier that is $1$, add the multiplicand shifted to that position. It needs only $8$ rounds for any two bytes. Repeated addition is simpler to write but needs up to $255$ rounds.</p>`),
        D.asm('Times ten', R`<p>Calculate RESULT $= 10 \times$ X for X $\leq 25$ with shifts and one addition (no loop). X must keep its value.</p>`, {
          start: 'X      EQU 0x20\nTEMP   EQU 0x21\nRESULT EQU 0x22\n\n; write your code here\n\n    GOTO $\n',
          tests: [[7, 70], [25, 250], [0, 0], [13, 130]].map(([x, r]) => ({ name: R`$X = ` + x + R`$`, init: { X: x, C: 1 }, expect: { RESULT: r, X: x } })),
          reqs: [{ re: /\bRLF\b/i, msg: 'Multiply with RLF shifts.' }], forbid: [{ re: /\bDECFSZ\b|\bINCFSZ\b/i, msg: 'No loop: use shifts and one addition.' }],
          solution: 'X      EQU 0x20\nTEMP   EQU 0x21\nRESULT EQU 0x22\n\n    BCF   STATUS, 0\n    RLF   X, W        ; W = 2X\n    MOVWF TEMP\n    BCF   STATUS, 0\n    RLF   TEMP, F     ; 4X\n    BCF   STATUS, 0\n    RLF   TEMP, F     ; 8X\n    ADDWF TEMP, W     ; 8X + 2X\n    MOVWF RESULT\n    GOTO $\n'
        }, R`$10X = 8X + 2X$. The tests start with C $= 1$: without <code>BCF STATUS, 0</code> before each rotation, a $1$ would enter bit 0.`, { hint: 'Follow the code shown above and store W in RESULT at the end.' }),
        D.asm('Product with 16 bits', R`<p>Calculate the 16-bit product PH:PL $= A \times B$ for any two bytes, by adding A to PL:PH, B times, with the carry going into PH. If B is $0$ the product is $0$.</p>`, {
          start: 'A     EQU 0x20\nB     EQU 0x21\nPH    EQU 0x22\nPL    EQU 0x23\nCOUNT EQU 0x24\n\n; write your code here\n\n    GOTO $\n',
          tests: [[200, 100], [255, 255], [7, 0], [16, 16], [3, 5]].map(([a, b]) => ({ name: R`$` + a + R` \times ` + b + R`$`, init: { A: a, B: b, PH: 9, PL: 9 }, expect: { PH: (a * b) >> 8, PL: (a * b) & 255 } })),
          solution: 'A     EQU 0x20\nB     EQU 0x21\nPH    EQU 0x22\nPL    EQU 0x23\nCOUNT EQU 0x24\n\n    CLRF  PH\n    CLRF  PL\n    MOVF  B, W\n    BTFSC STATUS, 2\n    GOTO  DONE        ; B = 0\n    MOVWF COUNT\nLOOP:\n    MOVF  A, W\n    ADDWF PL, F       ; add A to the low byte\n    BTFSC STATUS, 0\n    INCF  PH, F       ; carry into the high byte\n    DECFSZ COUNT, F\n    GOTO  LOOP\nDONE:\n    GOTO $\n'
        }, R`A loop of B rounds, each one a 16-bit addition of A: $200 \times 100 = 20000 = 4E20_{16}$ gives PH $= 4E_{16}$ and PL $= 20_{16}$.`, { hint: [R`Clear PH and PL; if B is $0$ you are done. Copy B into COUNT.`, R`Loop: <code>MOVF A, W</code>, <code>ADDWF PL, F</code>, <code>BTFSC STATUS, 0</code>, <code>INCF PH, F</code>, then <code>DECFSZ COUNT, F</code>.`] }),
        D.multi('Shift and add', R`<p>Multiply $13 \times 11$ by shift and add. $11 = 1011_{2}$, so the product is $13 \times 8 + 13 \times 2 + 13 \times 1$. Give each partial product and the result.</p>`, [{ label: R`$13 \times 8 =$`, ans: [104] }, { label: R`$13 \times 2 =$`, ans: [26] }, { label: R`Product:`, ans: [143] }], R`The bits $3$, $1$ and $0$ of $11$ are $1$: $104 + 26 + 13 = 143$.`, { hint: 'Each partial product is 13 shifted left by the position of a 1 bit.' }),
        D.num('Division by shifts', R`<p>Dividing by $8$ needs three right shifts. What is $200 \div 8$ after three <code>RRF</code> with C cleared each time?</p>`, 25, R`$200 \to 100 \to 50 \to 25$.`, { hint: 'Each right shift halves the number.' })
      ]
    },
    {
      title: 'Decimal digits and BCD',
      objectives: ['You will be able to split a byte into hundreds, tens and units', 'You will be able to turn a digit into its ASCII character', 'You will know the packed BCD format'],
      blocks: [
        D.T(R`<p>A display shows decimal digits, but a register holds binary. To show $173$, the program must find the digits $1$, $7$ and $3$: subtract $100$ as many times as possible (counting the subtractions gives the hundreds), then $10$ (the tens), and what is left is the units. It is the division by repeated subtraction of Part 5, done twice.</p>`),
        D.T(R`<p>Each digit then becomes a character for the LCD or the serial port by adding the ASCII code of <code>'0'</code>, which is $48 = 30_{16}$: the digit $7$ becomes $7 + 48 = 55$, the code of <code>'7'</code>. In assembly that is <code>ADDLW '0'</code>.</p>`),
        D.TABLE(['Character', R`<code>'0'</code>`, R`<code>'1'</code>`, '…', R`<code>'9'</code>`, R`<code>'A'</code>`, R`<code>'a'</code>`, 'space'], [['Decimal', '48', '49', '…', '57', '65', '97', '32'], ['Hexadecimal', '30', '31', '…', '39', '41', '61', '20']], { small: true }),
        D.H('Packed BCD'),
        D.T(R`<p>In <b>BCD</b> (binary-coded decimal) each decimal digit is stored in its own nibble. <i>Packed</i> BCD puts two digits in one byte: $59$ is stored as $0101\,1001_{2} = 59_{16}$, so the hexadecimal form of the byte reads like the decimal number. Real-time clock chips and seven-segment drivers use BCD. With <code>SWAPF</code> the tens move into the high nibble: <code>SWAPF TENS, W</code> then <code>IORWF UNITS, W</code>.</p>`),
        D.asm('Split into digits', R`<p>Split NUM ($0 \ldots 255$) into its decimal digits HUND, TENS and UNITS. NUM may change.</p>`, {
          start: 'NUM   EQU 0x20\nHUND  EQU 0x21\nTENS  EQU 0x22\nUNITS EQU 0x23\n\n; write your code here\n\n    GOTO $\n',
          tests: [255, 47, 100, 9, 0, 173].map(v => ({ name: R`$\text{NUM} = ` + v + R`$`, init: { NUM: v, HUND: 9, TENS: 9, UNITS: 9 }, expect: { HUND: Math.floor(v / 100), TENS: Math.floor(v / 10) % 10, UNITS: v % 10 } })),
          solution: 'NUM   EQU 0x20\nHUND  EQU 0x21\nTENS  EQU 0x22\nUNITS EQU 0x23\n\n    CLRF  HUND\n    CLRF  TENS\n    MOVF  NUM, W\n    MOVWF UNITS       ; what is left\nH_LOOP:\n    MOVLW 100\n    SUBWF UNITS, W    ; UNITS - 100\n    BTFSS STATUS, 0\n    GOTO  T_LOOP      ; less than 100 left\n    MOVWF UNITS\n    INCF  HUND, F\n    GOTO  H_LOOP\nT_LOOP:\n    MOVLW 10\n    SUBWF UNITS, W    ; UNITS - 10\n    BTFSS STATUS, 0\n    GOTO  DONE\n    MOVWF UNITS\n    INCF  TENS, F\n    GOTO  T_LOOP\nDONE:\n    GOTO $\n'
        }, R`Two loops of repeated subtraction: $173 - 100 = 73$ (HUND $= 1$), then $73 - 10 - 10 \ldots = 3$ seven times (TENS $= 7$); UNITS keeps the $3$ that is left.`, { hint: [R`Copy NUM into UNITS and clear HUND and TENS.`, R`Loop: <code>MOVLW 100</code>, <code>SUBWF UNITS, W</code>; if C $= 1$, store W in UNITS and increment HUND. Then the same with $10$ and TENS.`] }),
        D.asm('Digits to ASCII', R`<p>HUND, TENS and UNITS hold three digits. Store their ASCII characters in CH_H, CH_T and CH_U, ready for a display.</p>`, {
          start: 'HUND  EQU 0x21\nTENS  EQU 0x22\nUNITS EQU 0x23\nCH_H  EQU 0x24\nCH_T  EQU 0x25\nCH_U  EQU 0x26\n\n; write your code here\n\n    GOTO $\n',
          tests: [[1, 7, 3], [0, 0, 9], [2, 5, 5]].map(([h, t, u]) => ({ name: R`digits $` + h + t + u + R`$`, init: { HUND: h, TENS: t, UNITS: u }, expect: { CH_H: 48 + h, CH_T: 48 + t, CH_U: 48 + u } })),
          solution: "HUND  EQU 0x21\nTENS  EQU 0x22\nUNITS EQU 0x23\nCH_H  EQU 0x24\nCH_T  EQU 0x25\nCH_U  EQU 0x26\n\n    MOVF  HUND, W\n    ADDLW '0'\n    MOVWF CH_H\n    MOVF  TENS, W\n    ADDLW '0'\n    MOVWF CH_T\n    MOVF  UNITS, W\n    ADDLW '0'\n    MOVWF CH_U\n    GOTO $\n"
        }, R`<code>ADDLW '0'</code> adds $48$: the digit $7$ becomes <code>'7'</code>, code $55$.`, { hint: R`For each digit: <code>MOVF</code>, <code>ADDLW '0'</code>, <code>MOVWF</code>.` }),
        D.asm('Pack two digits', R`<p>TENS and UNITS hold two digits ($0 \ldots 9$). Store them in packed BCD in PACKED: the tens in the high nibble, the units in the low nibble.</p>`, {
          start: 'TENS   EQU 0x20\nUNITS  EQU 0x21\nPACKED EQU 0x22\n\n; write your code here\n\n    GOTO $\n',
          tests: [[5, 9], [0, 7], [9, 9], [4, 0]].map(([t, u]) => ({ name: R`$` + t + u + R`$`, init: { TENS: t, UNITS: u }, expect: { PACKED: t * 16 + u } })),
          reqs: [{ re: /\bSWAPF\b/i, msg: 'Use SWAPF.' }],
          solution: 'TENS   EQU 0x20\nUNITS  EQU 0x21\nPACKED EQU 0x22\n\n    SWAPF TENS, W     ; tens in the high nibble\n    IORWF UNITS, W\n    MOVWF PACKED\n    GOTO $\n'
        }, R`<code>SWAPF TENS, W</code> gives $5 \to 50_{16}$; OR with the units gives $59_{16}$.`, { hint: R`<code>SWAPF TENS, W</code>, <code>IORWF UNITS, W</code>, <code>MOVWF PACKED</code>.` }),
        D.num('ASCII of a digit', R`<p>What is the ASCII code (decimal) of the character <code>'7'</code>?</p>`, 55, R`$48 + 7 = 55$.`, { hint: R`<code>'0'</code> is $48$.` }),
        D.num('BCD in hexadecimal', R`<p>The value $83$ is stored in packed BCD. What does the register hold, written in hexadecimal?</p>`, ['83'], R`Tens $8 = 1000_{2}$ in the high nibble and units $3 = 0011_{2}$ in the low nibble: $1000\,0011_{2} = 83_{16}$ (which is $131$ in decimal).`, { kind: 'hex', hint: 'One digit per nibble.' })
      ]
    }
  ]
});
})();
