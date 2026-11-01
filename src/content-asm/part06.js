/* Part 6 - Subroutines and tables (Lecture 4: CALL/RETURN and the stack; Lecture 6: program template; Activity 7 RETLW) */
(function () {
const ASTART = '; write your code here\n';
D.part({
  title: 'Subroutines and tables',
  intro: R`<p>Large programs are built from small, named pieces called <b>subroutines</b>. In this part you write and call subroutines, see how the processor remembers where to return with its <b>stack</b>, return values in W with <code>RETLW</code>, build look-up tables with a computed jump, and learn the standard structure of a complete PIC program.</p>`,
  sections: [
    {
      title: 'CALL, RETURN and the stack',
      objectives: ['You will be able to write and call a subroutine in assembly', 'You will know how the stack remembers the return address', 'You will know the limit of 8 nested calls'],
      blocks: [
        D.T(R`<p>In assembly a function is called a <b>subroutine</b>: a block of instructions that starts with a label and ends with <code>RETURN</code>. It is called with <code>CALL</code>:</p>`),
        D.TABLE(['Instruction', 'Operation', 'Cycles'], [
          ['<code>CALL k</code>', 'push the return address (the address after the CALL) onto the stack, then jump to k', '2'],
          ['<code>RETURN</code>', 'pop the return address from the stack and jump back to it', '2'],
          ['<code>RETLW k</code>', '$W \\leftarrow k$, then return like RETURN', '2']
        ]),
        D.T(R`<p>The <b>stack</b> is a small separate memory that stores return addresses. It works in the order <b>last in, first out</b> (LIFO): the last address pushed is the first one popped, so a subroutine can call another subroutine and the returns happen in the right order. The stack of the PIC16F887 has only <b>8 levels</b>: at most $8$ calls can be nested, and an interrupt also uses one level. A ninth nested call overwrites the oldest address, and the program will return to a wrong place.</p>`),
        D.CODE(R`    MOVLW   5
    CALL    ADD_THREE   ; W = 8
    CALL    ADD_THREE   ; W = 11
    GOTO    $

ADD_THREE:
    ADDLW   3
    RETURN`, 'asm', { cap: R`The subroutine is placed after the <code>GOTO $</code> of the main code, so that the processor can reach it only through a <code>CALL</code>. Each <code>RETURN</code> continues after the <code>CALL</code> that started it.` }),
        D.KEY('Never fall into a subroutine', R`<p>A subroutine must only be entered with <code>CALL</code>. If the main code runs into it by accident (for example because the <code>GOTO $</code> or the main loop is missing), its <code>RETURN</code> finds an empty stack. That is why the lecture template places <code>MAIN</code> first, ends it with an endless loop, and writes the subroutines after it.</p>`),
        D.trace('Trace a subroutine', 'Follow the program with CALL and RETURN. Write W after each executed instruction.', { code: 'MOVLW 5\nCALL ADD10\nCALL ADD10\nGOTO $\nADD10:\nADDLW 10\nRETURN', watch: ['W'], maxRows: 7 }, R`W $= 5$; the first call adds $10$ ($15$) and returns; the second call adds $10$ again ($25$).`, { hint: 'After RETURN the program continues with the instruction after the CALL.' }),
        D.trace('Nested calls', R`<p>FIRST calls SECOND. Follow W and SP, the number of return addresses on the stack.</p>`, { code: 'MOVLW 1\nCALL FIRST\nGOTO $\nFIRST:\nADDLW 2\nCALL SECOND\nADDLW 4\nRETURN\nSECOND:\nADDLW 8\nRETURN', watch: ['W', 'SP'], maxRows: 8 }, R`Each CALL pushes one address (SP grows to $2$ inside SECOND) and each RETURN pops one. W: $1, 3, 11$, back in FIRST $15$, and finally back in the main code.`, { hint: 'CALL adds 1 to SP, RETURN subtracts 1. The other instructions do not change SP.' }),
        D.mc('LIFO', 'The stack follows the sequence ...', ['Last in, first out', 'First in, first out', 'Random order', 'Address order'], 0, 'The return address pushed last is popped first: the innermost call returns first.', { hint: 'Think of a pile of plates.' }),
        D.num('Stack size', R`<p>How many levels does the stack of the PIC16F887 have?</p>`, 8, 'The hardware stack has 8 levels.', { hint: 'Nested calls are limited to this number.' }),
        D.num('How deep?', R`<p>MAIN calls A, A calls B, and B calls C. While C runs, an interrupt arrives. How many levels of the stack are in use inside the interrupt routine?</p>`, 4, R`Three return addresses for the three nested calls, plus one for the interrupt: $4$ of the $8$ levels.`, { hint: 'An interrupt also pushes a return address.' }),
        D.asm('A doubling subroutine', R`<p>Write a subroutine <code>DOUBLE</code> which doubles the value of W ($W \leftarrow 2W$, for results up to $255$). The main code is given: it calls <code>DOUBLE</code> three times starting from $W = 5$, so W must end as $40$.</p>`, {
          pre: '    MOVLW 5\n    CALL DOUBLE\n    CALL DOUBLE\n    CALL DOUBLE\n    MOVWF RESULT\n    GOTO $\nRESULT EQU 0x20\nTEMP EQU 0x21', start: 'DOUBLE:\n    ; double W\n\n    RETURN\n',
          tests: [{ expect: { RESULT: 40 } }], solution: 'DOUBLE:\n    MOVWF TEMP\n    ADDWF TEMP, W\n    RETURN\n'
        }, R`Store W in TEMP and add it to W again: $W + W = 2W$.`, { hint: R`Copy W into TEMP with <code>MOVWF TEMP</code>, then <code>ADDWF TEMP, W</code> calculates $TEMP + W$.` }),
        D.asm('A subroutine that calls another', R`<p>The subroutine <code>DOUBLE</code> is given. Write the subroutine <code>QUAD</code>, which multiplies W by $4$ by calling <code>DOUBLE</code> twice. The main code starts from $W = 6$ and stores the result of <code>QUAD</code> in RESULT.</p>`, {
          pre: 'RESULT EQU 0x20\nTEMP EQU 0x21\n    MOVLW 6\n    CALL QUAD\n    MOVWF RESULT\n    GOTO $\nDOUBLE:\n    MOVWF TEMP\n    ADDWF TEMP, W\n    RETURN', start: 'QUAD:\n    ; call DOUBLE twice\n\n    RETURN\n',
          tests: [{ expect: { RESULT: 24 } }], reqs: [{ re: /CALL\s+DOUBLE[\s\S]*CALL\s+DOUBLE/i, msg: 'Call DOUBLE twice inside QUAD.' }],
          solution: 'QUAD:\n    CALL DOUBLE\n    CALL DOUBLE\n    RETURN\n'
        }, R`QUAD is entered with one return address on the stack; each call of DOUBLE adds a second one for a moment. $6 \times 2 \times 2 = 24$.`, { hint: 'Two CALL DOUBLE instructions before the RETURN of QUAD.' }),
        D.asm('Fix the fall-through', R`<p>This program should leave $15$ in RESULT, but the assembler simulator reports a RETURN with an empty stack. Add the one missing instruction.</p>`, {
          pre: 'RESULT EQU 0x20', start: '    MOVLW 5\n    CALL ADD_TEN\n    MOVWF RESULT\nADD_TEN:\n    ADDLW 10\n    RETURN\n',
          tests: [{ expect: { RESULT: 15 } }], solution: '    MOVLW 5\n    CALL ADD_TEN\n    MOVWF RESULT\n    GOTO $\nADD_TEN:\n    ADDLW 10\n    RETURN\n'
        }, 'Without GOTO $ after MOVWF RESULT, the processor runs into ADD_TEN and its RETURN finds an empty stack.', { hint: 'The main code must stop before the subroutine.' })
      ]
    },
    {
      title: 'Returning values and look-up tables',
      objectives: ['You will know that a subroutine returns a value in W', 'You will be able to use RETLW to return a constant', 'You will be able to build a look-up table with a computed jump'],
      blocks: [
        D.T(R`<p>A subroutine gives its result back in the W register. When the result is a constant, the instruction <code>RETLW k</code> loads it and returns in one step. <b>Activity 7</b> uses this: its subroutine <code>READ_SWITCHES</code> compares the switches with the cases and returns the LED pattern with <code>RETLW</code>; the main code then copies W to PORTC.</p>`),
        D.CODE(R`MAIN:
    CALL    SETUP
REPEAT:
    MOVF    PORTD, W
    ANDLW   00001111B       ; masking only the 4 lowest bits
    MOVWF   PORTD_TEMP      ; and saving in a temporary file
    CALL    READ_SWITCHES
    MOVWF   PORTC           ; put the returned value on PORTC
    GOTO    REPEAT

READ_SWITCHES:
    MOVF    PORTD_TEMP, W
    XORLW   00001001B       ; compare with 1001
    BTFSC   ZERO
    RETLW   00000111B       ; case 1
    MOVF    PORTD_TEMP, W
    XORLW   00000111B       ; compare with 0111
    BTFSC   ZERO
    RETLW   00000100B       ; case 2
    MOVF    PORTD_TEMP, W
    XORLW   00001100B       ; compare with 1100
    BTFSC   ZERO
    RETLW   00000011B       ; case 3
    RETLW   00000000B       ; case else`, 'asm'),
        D.H('Look-up tables'),
        D.T(R`<p>A <b>look-up table</b> returns the value number $i$ of a list. On the PIC it is built from a subroutine that adds W to the low byte of the program counter, <code>PCL</code>, followed by a list of <code>RETLW</code> instructions. Writing PCL is a jump: with $W = i$ the processor lands on the $i$-th <code>RETLW</code> after the <code>ADDWF</code>, which returns the value:</p>`),
        D.CODE(R`SQUARE:              ; W = index 0 ... 4
    ADDWF   PCL, F   ; jump W lines forward
    RETLW   0
    RETLW   1
    RETLW   4
    RETLW   9
    RETLW   16`, 'asm', { cap: R`With W $= 3$, <code>ADDWF PCL, F</code> jumps over three RETLW instructions and lands on <code>RETLW 9</code>.` }),
        D.WARN('Two rules for tables', R`<p>Only the low byte of the program counter, PCL, is changed by <code>ADDWF PCL, F</code>. The high bits of the next address come from the register PCLATH, which is $0$ in short programs. So a table must not cross a $256$-word boundary of the program memory, and a program longer than $256$ words must set PCLATH before the jump. Second, the index must stay inside the table: an index that is too big jumps past the last <code>RETLW</code> into whatever code follows.</p>`),
        D.mc('RETLW', 'What does <code>RETLW 00000111B</code> do?', ['It puts 00000111B in W and returns from the subroutine', 'It returns and clears W', 'It compares W with 00000111B', 'It jumps to address 7'], 0, 'RETLW = return with literal in W.', { hint: 'RETurn with Literal in W.' }),
        D.num('Computed jump', R`<p>The table <code>SQUARE</code> above is called with W $= 4$. Which value does it return?</p>`, 16, R`<code>ADDWF PCL, F</code> skips four RETLW instructions ($0$, $1$, $4$, $9$) and the fifth one returns $16$.`, { hint: 'Index 0 is the first RETLW.' }),
        D.asm('Activity 7 subroutine', R`<p>Write the subroutine <code>READ_SWITCHES</code> of Activity 7: it compares <code>PORTD_TEMP</code> with <code>1001B</code>, <code>0111B</code> and <code>1100B</code> and returns <code>111B</code>, <code>100B</code> or <code>011B</code> in W, or <code>000B</code> for any other value. The main code is given.</p>`, {
          pre: 'PORTD_TEMP EQU 0x20\nRESULT EQU 0x21\n    CALL READ_SWITCHES\n    MOVWF RESULT\n    GOTO $', start: 'READ_SWITCHES:\n\n',
          tests: [{ name: '1001', init: { PORTD_TEMP: 9 }, expect: { RESULT: 7 } }, { name: '0111', init: { PORTD_TEMP: 7 }, expect: { RESULT: 4 } }, { name: '1100', init: { PORTD_TEMP: 12 }, expect: { RESULT: 3 } }, { name: '0000', init: { PORTD_TEMP: 0, RESULT: 99 }, expect: { RESULT: 0 } }, { name: '1111', init: { PORTD_TEMP: 15, RESULT: 99 }, expect: { RESULT: 0 } }],
          reqs: [{ re: /\bRETLW\b/i, msg: 'Return the values with RETLW.' }],
          solution: 'READ_SWITCHES:\n    MOVF PORTD_TEMP, W\n    XORLW 00001001B\n    BTFSC ZERO\n    RETLW 00000111B\n    MOVF PORTD_TEMP, W\n    XORLW 00000111B\n    BTFSC ZERO\n    RETLW 00000100B\n    MOVF PORTD_TEMP, W\n    XORLW 00001100B\n    BTFSC ZERO\n    RETLW 00000011B\n    RETLW 00000000B\n'
        }, 'Each case reloads PORTD_TEMP, compares with XORLW and returns the pattern with RETLW when Z = 1; the last RETLW is the else case.', { hint: 'Copy the routine shown above: three cases and a final RETLW for the else case.' }),
        D.asm('Seven-segment table', R`<p>A seven-segment display shows a digit by lighting segments a–g. Write the look-up table <code>SEG7</code> which returns the segment pattern of the digit in W ($0 \ldots 9$), using these codes (bit 0 is segment a): <code>0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F</code>. The main code is given.</p>`, {
          pre: 'DIGIT EQU 0x20\nRESULT EQU 0x21\n    MOVF DIGIT, W\n    CALL SEG7\n    MOVWF RESULT\n    GOTO $', start: 'SEG7:\n    ADDWF PCL, F\n',
          tests: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => ({ name: 'digit ' + d, init: { DIGIT: d }, expect: { RESULT: [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F][d] } })),
          solution: 'SEG7:\n    ADDWF PCL, F\n    RETLW 0x3F\n    RETLW 0x06\n    RETLW 0x5B\n    RETLW 0x4F\n    RETLW 0x66\n    RETLW 0x6D\n    RETLW 0x7D\n    RETLW 0x07\n    RETLW 0x7F\n    RETLW 0x6F\n'
        }, R`<code>ADDWF PCL, F</code> jumps W instructions forward, onto the RETLW of that digit.`, { hint: 'After ADDWF PCL, F write ten RETLW instructions, one per digit, in order.' }),
        D.asm('Squares', R`<p>Write a look-up table <code>SQUARE</code> which returns the square of W for W $= 0 \ldots 15$ ($15^{2} = 225$ still fits in a byte). The main code is given.</p>`, {
          pre: 'NUM EQU 0x20\nRESULT EQU 0x21\n    MOVF NUM, W\n    CALL SQUARE\n    MOVWF RESULT\n    GOTO $', start: 'SQUARE:\n    ADDWF PCL, F\n',
          tests: [0, 1, 7, 12, 15].map(n => ({ name: R`$` + n + R`^{2}$`, init: { NUM: n }, expect: { RESULT: n * n } })),
          solution: 'SQUARE:\n    ADDWF PCL, F\n' + Array.from({ length: 16 }, (_, i) => '    RETLW ' + i * i + '\n').join('')
        }, R`Sixteen RETLW instructions: $0, 1, 4, 9, \ldots, 225$.`, { hint: 'After ADDWF PCL, F write RETLW 0, RETLW 1, RETLW 4 and so on up to RETLW 225.' })
      ]
    },
    {
      title: 'The structure of a complete program',
      objectives: ['You will know the order of the parts of an assembly program', 'You will know the reset vector and the interrupt vector', 'You will know what the configuration bits are'],
      blocks: [
        D.T(R`<p>The lecture gives a fixed order for the parts of an assembly program (Lecture 6):</p>
<ol>
<li>a <b>description</b> of the code in comments,</li>
<li>the <b>include</b> of <code>xc.inc</code>, the file with the names of the registers and bits,</li>
<li>the <b>configuration bits</b>,</li>
<li>the <b>interrupt</b> code (Part 10),</li>
<li>the <b>main code</b>,</li>
<li>the <b>SETUP</b> function, which configures the ports and the oscillator,</li>
<li>any other functions.</li>
</ol>`),
        D.CODE(R`; Activity 2: this code writes 11111111 on all the ports
    #include <xc.inc>
  CONFIG  FOSC = INTRC_NOCLKOUT ; internal oscillator
  CONFIG  WDTE = OFF            ; no watchdog timer
  ; ... the other configuration bits ...

PSECT BLABLA,CLASS=CODE, DELTA=2,ABS

    ORG     0          ; reset vector
    GOTO    MAIN
    ORG     0X4        ; interrupt vector
    RETFIE             ; return from interrupt (Part 10)

MAIN:
    CALL    SETUP
    MOVLW   11111111B
    MOVWF   PORTD      ; ... and the other ports
    GOTO    $          ; do nothing

SETUP:
    ; bank 1: OSCCON and the TRIS registers, bank 3: ANSEL ...
    RETURN`, 'asm'),
        D.T(R`<p>Two addresses of the Flash memory are special: the program starts at address $0$ (the <b>reset vector</b>), and an interrupt jumps to address $4$ (the <b>interrupt vector</b>). There are only four locations in between, so the template puts a <code>GOTO MAIN</code> at address $0$ and the interrupt code (here just <code>RETFIE</code>) at <code>ORG 0X4</code>.</p>`),
        D.H('Configuration bits'),
        D.T(R`<p>The <b>configuration bits</b> are settings stored in the chip together with the program: they are not in the RAM and the program does not change them while it runs. MPLAB X can generate the <code>CONFIG</code> lines from a window of options. The activities use:</p>`),
        D.TABLE(['Setting', 'Meaning'], [
          ['<code>FOSC = INTRC_NOCLKOUT</code>', 'use the internal oscillator; the pins RA6 and RA7 stay normal I/O pins'],
          ['<code>WDTE = OFF</code>', 'no watchdog timer (a timer that resets a program that hangs)'],
          ['<code>PWRTE = OFF</code>', 'no power-up timer'],
          ['<code>MCLRE = OFF</code>', 'the pin MCLR is used as the input RE3, not as a reset pin'],
          ['<code>CP = OFF</code>, <code>CPD = OFF</code>', 'the program and the data are not protected against reading'],
          ['<code>BOREN = OFF</code>', 'no brown-out reset (reset when the supply voltage drops)'],
          ['<code>LVP = OFF</code>', 'no low-voltage programming: RB3 is a normal I/O pin']
        ]),
        D.H('Assembly compared with C'),
        D.T(R`<p>The lecture also writes some activities in C and compares the two languages (Lecture 8). Its conclusions explain why assembly is still taught, and they are a common exam question:</p>`),
        D.TABLE(['', 'Assembly', 'C'], [
          ['Writing the code', 'longer: every step goes through W', 'easier and shorter'],
          ['Control of the registers', 'direct control of every register and bank', 'the compiler chooses the registers and the banks'],
          ['Execution time', 'known exactly, instruction by instruction', 'cannot be predicted exactly'],
          ['Place in Flash memory', 'chosen with <code>ORG</code>', 'chosen by the compiler (in the lecture the code starts at <code>0x7DD</code>)']
        ], { cap: 'The conclusions of Lecture 8. The assembly and C versions of Activity 5 do the same work but produce different machine code.' }),
        D.order('Template order', 'Put the parts of an assembly program in the order of the lecture template.', ['Description of the code (comments)', 'Include of xc.inc', 'Configuration bits', 'Interrupt code at ORG 0X4', 'Main code', 'SETUP function', 'Other functions'], 'Description, include, configuration, interrupt, main, setup, other functions.', { hint: 'The interrupt code must be at address 4, before the main code.' }),
        D.mc('The reset vector', 'Where does the processor start after the chip is powered up or reset?', ['At address 0 of the Flash memory', 'At address 4', 'At the label MAIN', 'At the last instruction'], 0, 'Address 0 is the reset vector; address 4 is the interrupt vector.', { hint: 'ORG 0 is called the reset vector.' }),
        D.multi('The two vectors', R`<p>Give the two special addresses of the program memory.</p>`, [{ label: 'Reset vector:', ans: [0] }, { label: 'Interrupt vector:', ans: [4] }], R`The program starts at address $0$ and an interrupt jumps to address $4$; that is why the template has <code>ORG 0</code> with <code>GOTO MAIN</code>, then <code>ORG 0X4</code>.`, { hint: 'ORG 0 and ORG 0X4.' }),
        D.tf('CONFIG in RAM', 'The configuration words are located in the RAM.', false, 'They are stored with the program in the chip, not in the RAM, and the program does not change them while it runs.', { hint: 'Are they changed while the program runs?' }),
        D.mc('Which is true?', 'Which statement matches the conclusions of Lecture 8?', ['In assembly you know exactly how long each instruction takes; in C you cannot predict the execution time exactly', 'C programs always run faster than assembly', 'In C you must select the RAM banks yourself', 'Assembly code is always placed by the compiler'], 0, 'C is easier, assembly gives direct control and exact timing.', { hint: 'Which language shows every instruction that is executed?' }),
        D.fill('The assembly template', 'Complete the skeleton of an assembly program.', '    #include <{{xc.inc}}>\n\n    {{ORG}} 0\n    GOTO {{MAIN}}\n    ORG 0X{{4}}\n    {{RETFIE}}\n\nMAIN:\n    CALL {{SETUP}}\n    GOTO $\n\nSETUP:\n    ; configure the ports\n    {{RETURN}}', R`<code>xc.inc</code> gives the register names; <code>ORG 0</code> with <code>GOTO MAIN</code> is the reset vector, <code>ORG 0X4</code> the interrupt vector (here only <code>RETFIE</code>); MAIN calls SETUP, which ends with <code>RETURN</code>.`, { lang: 'asm', hint: 'Look at the template of Activity 2 above.' })
      ]
    }
  ]
});
})();
