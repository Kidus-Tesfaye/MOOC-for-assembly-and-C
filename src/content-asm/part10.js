/* Part 10 - Interrupts (Lecture 10, Lab 4: Activities 8 and 9) */
(function () {
const SETUP8 = '\nSETUP:\n    CLRF PORTD\n    BSF RP0\n    MOVLW 01100000B\n    MOVWF OSCCON\n    MOVLW 11111111B     ; RB0 is input\n    MOVWF TRISB\n    CLRF TRISD          ; PORTD is output\n    BSF RP1\n    CLRF ANSELH         ; RB0 is digital\n    BCF RP0\n    BCF RP1\n    RETURN\n';
const VEC = '#define LED_GREEN RD0\n#define LED_RED RD1\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n';
/* button presses on RB0 at given instruction counts (the pin goes back to 0 three instructions later) */
const pressSteps = (steps) => steps.reduce((a, s) => a.concat([{ step: s, pins: { B: 1 } }, { step: s + 3, pins: { B: 0 } }]), []);
D.part({
  title: 'Interrupts',
  intro: R`<p>So far the programs <i>polled</i>: they kept testing a pin or a flag in a loop. An <b>interrupt</b> lets the hardware call a routine by itself when an event happens, while the main code continues with its own work. In this part you learn how the PIC handles interrupts, write the RB0 interrupt of Activity 8, and meet the dangers of interrupts in assembly: shared variables and saving the context (Activity 9).</p>`,
  sections: [
    {
      title: 'Polling or interrupts?',
      objectives: ['You will know what an interrupt is and how the PIC answers it', 'You will know the roles of GIE, the enable bits and the flags', 'You will know why every interrupt starts at address <code>0x04</code>'],
      blocks: [
        D.T(R`<p>Imagine you are reading a book and the phone rings. You stop reading, remember where you were, answer the call, and then continue reading from the same place. You do not check the phone every second, but you are prepared for a call at any time. The PIC handles an <b>interrupt</b> in the same way:</p>
<ol>
<li>it stops the main code (after finishing the current instruction),</li>
<li>it saves the address of the next instruction on the stack,</li>
<li>it executes the <b>interrupt service routine</b> (ISR),</li>
<li>it returns to the main code where it was interrupted.</li>
</ol>
<p>The PIC16F887 has $17$ interrupt sources. Three are the main ones, controlled in the register <b>INTCON</b>: the external interrupt on the pin RB0/INT, the change of the pins of PORTB, and the overflow of Timer0. The others (Timer1, Timer2, the A/D converter, the USART receiver and transmitter, the CCP modules, the comparators, the EEPROM...) are the <b>peripheral</b> interrupts, controlled in PIE1/PIE2 and PIR1/PIR2.</p>`),
        D.TABLE(['Bit', 'Register', 'Role'], [
          ['<b>GIE</b>', 'INTCON bit 7', 'Global Interrupt Enable: if $0$, no interrupt happens at all'],
          ['<b>PEIE</b>', 'INTCON bit 6', 'Peripheral Interrupt Enable: allows the peripheral sources'],
          ['<b>INTE</b>, <b>T0IE</b>, <b>RBIE</b>', 'INTCON bits 4, 5, 3', 'enable the three main sources'],
          ['<b>INTF</b>, <b>T0IF</b>, <b>RBIF</b>', 'INTCON bits 1, 2, 0', 'the <b>flags</b>: set by the hardware when the event happens'],
          ['<b>TMR1IE</b>, <b>RCIE</b>, <b>ADIE</b>...', 'PIE1', 'enable the peripheral sources'],
          ['<b>TMR1IF</b>, <b>RCIF</b>, <b>ADIF</b>...', 'PIR1', 'the peripheral flags (aligned with the enable bits of PIE1)']
        ]),
        D.T(R`<p>An interrupt happens when a <b>flag</b> is $1$, its <b>enable bit</b> is $1$, and GIE is $1$ (and PEIE for a peripheral source). The processor then clears GIE automatically, so that no new interrupt can break into the ISR, pushes the program counter and jumps to address <code>0x04</code>, the <b>interrupt vector</b>. The ISR ends with <code>RETFIE</code>, which is a <code>RETURN</code> that also sets GIE again.</p>`),
        D.KEY('Clear the flag', R`<p>The hardware sets a flag, but only the program clears it. The first thing an ISR does is clear the flag of the event it answers; otherwise, after <code>RETFIE</code>, the flag is still $1$ and the interrupt happens again immediately, forever.</p>`),
        D.T(R`<p>All $17$ sources share the same vector $0x04$: one of the weaknesses of the PIC16. When several interrupts are enabled, the ISR must test the flags to find out which event happened (for example the fire sensor or the water-leak sensor of the lecture example).</p>`),
        D.mc('RETFIE or RETURN', 'What is the difference between RETFIE and RETURN?', ['RETFIE also sets GIE again, re-enabling the interrupts', 'RETFIE returns two levels', 'RETURN sets GIE', 'There is no difference'], 0, 'GIE was cleared automatically when the interrupt started; RETFIE restores it.', { hint: 'RETurn From IntErrupt.' }),
        D.tf('The fifth address', 'The interrupt vector is the fifth location of the program memory, counting from address 0.', true, 'Addresses 0, 1, 2, 3 and 4: address 4 is the fifth location.', { hint: 'Count 0, 1, 2, 3, 4.' }),
        D.tf('GIE in the ISR', 'When the ISR starts, the GIE bit is cleared automatically.', true, 'This prevents a new interrupt inside the ISR (no interrupt on interrupt).', { hint: 'Can an interrupt interrupt the ISR?' }),
        D.mc('First thing in the ISR', 'What should be cleared manually at the beginning of the ISR?', ['The flag of the interrupt that happened', 'GIE', 'The stack', 'The W register'], 0, 'If the flag stays set, the interrupt repeats endlessly after RETFIE.', { hint: 'The hardware sets it, the program must clear it.' }),
        D.mc('Three conditions', 'Which three bits must be 1 for the RB0/INT interrupt to happen?', ['INTF, INTE and GIE', 'INTF, PEIE and RBIE', 'T0IF, T0IE and GIE', 'GIE, PEIE and RCIE'], 0, 'The flag INTF, its enable bit INTE and the global enable GIE.', { hint: 'Flag + enable + global enable.' }),
        D.multi('INTCON bits', R`<p>Give the bit number of each bit in the register INTCON.</p>`, [{ label: 'GIE:', ans: [7] }, { label: 'INTE:', ans: [4] }, { label: 'INTF:', ans: [1] }], R`GIE is bit 7, INTE bit 4 and INTF bit 1 (see the table above).`, { hint: 'Look at the table of the interrupt bits.' })
      ]
    },
    {
      title: 'The external interrupt on RB0 (Activity 8)',
      objectives: ['You will be able to configure the RB0/INT interrupt', 'You will be able to write an ISR at address <code>0x04</code>', 'You will be able to choose the rising or the falling edge'],
      blocks: [
        D.T(R`<p><b>Activity 8</b> blinks a red LED (RD1) in the main code at $1\ \mathrm{Hz}$, and a push button on <b>RB0/INT</b> switches on a green LED (RD0) through an interrupt. The button is never tested with BTFSS: the event calls the ISR by itself. Four conditions are needed:</p>
<ol>
<li>RB0 must be a <b>digital input</b>: TRISB0 $= 1$ and ANSELH cleared (RB0 is the analog channel AN12),</li>
<li>the source must be enabled: <b>INTE</b> $= 1$,</li>
<li>the interrupts must be enabled: <b>GIE</b> $= 1$,</li>
<li>an edge on the pin: a rising edge by default (the bit INTEDG of OPTION_REG chooses the edge).</li>
</ol>`),
        D.CODE(R`    ORG     0         ; reset vector
    GOTO    MAIN
    ORG     0X4       ; interrupt vector
    BCF     INTF      ; clear the flag first
    BSF     LED_GREEN ; turn on green led
    RETFIE

MAIN:
    CALL    SETUP
    BSF     GIE       ; required condition
    BSF     INTE      ; required condition
REPEAT:               ; blink red led
    BSF     LED_RED
    CALL    DELAY_500MS
    BCF     LED_RED
    CALL    DELAY_500MS
    GOTO    REPEAT`, 'asm', { cap: R`Activity 8. The ISR is placed directly at the interrupt vector <code>0x04</code>, right after the <code>GOTO MAIN</code> of the reset vector. The SETUP makes RB0 a digital input and PORTD an output.` }),
        D.asm('Activity 8', R`<p>Complete Activity 8: write the ISR at address <code>0x04</code> (clear the flag and switch on the green LED on RD0), and enable the RB0 interrupt in the main code. The SETUP subroutine is given after your code. The simulator presses the button on RB0.</p>`, {
          pre: 'GREEN_DONE EQU 0x20\n' + VEC, post: SETUP8,
          start: '    ; the ISR: clear the flag, switch on the green LED\n\n    RETFIE\n\nMAIN:\n    CALL SETUP\n    ; enable the interrupt on RB0\n\nREPEAT:\n    GOTO REPEAT\n',
          tests: [
            { name: 'Button pressed', events: pressSteps([200]), maxSteps: 600, limitOk: true, expect: { RD0: 1, INTF: 0, GIE: 1, INTE: 1 } },
            { name: 'No button', maxSteps: 600, limitOk: true, expect: { RD0: 0, GIE: 1, INTE: 1 } }],
          solution: '    BCF INTF\n    BSF LED_GREEN\n    RETFIE\n\nMAIN:\n    CALL SETUP\n    BSF GIE\n    BSF INTE\nREPEAT:\n    GOTO REPEAT\n'
        }, 'The ISR clears INTF and sets RD0; the main code sets GIE and INTE after SETUP.', { hint: [R`The ISR: <code>BCF INTF</code>, <code>BSF LED_GREEN</code>, <code>RETFIE</code>.`, R`In MAIN after <code>CALL SETUP</code>: <code>BSF GIE</code> and <code>BSF INTE</code>.`] }),
        D.asm('Count the presses', R`<p>Write an ISR which counts the presses of the button on RB0 in PRESSES and shows the count on PORTD (in binary, on the LEDs). The main code only enables the interrupt and waits. SETUP is given after your code.</p>`, {
          pre: 'PRESSES EQU 0x20\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n', post: SETUP8,
          start: '    ; the ISR\n\n    RETFIE\n\nMAIN:\n    CALL SETUP\n    CLRF PRESSES\n    ; enable the RB0 interrupt\n\nWAIT:\n    GOTO WAIT\n',
          tests: [{ name: 'Three presses', events: pressSteps([100, 200, 300]), maxSteps: 500, limitOk: true, expect: { PRESSES: 3, 'OUT.D': 3, INTF: 0 } }, { name: 'Five presses', events: pressSteps([80, 140, 200, 260, 320]), maxSteps: 500, limitOk: true, expect: { PRESSES: 5, 'OUT.D': 5 } }],
          solution: '    BCF   INTF          ; clear the flag\n    INCF  PRESSES, F\n    MOVF  PRESSES, W\n    MOVWF PORTD\n    RETFIE\n\nMAIN:\n    CALL SETUP\n    CLRF PRESSES\n    BSF  GIE\n    BSF  INTE\nWAIT:\n    GOTO WAIT\n'
        }, R`Each rising edge on RB0 sets INTF and calls the ISR, which clears INTF, increments PRESSES and copies it to PORTD.`, { hint: [R`ISR: <code>BCF INTF</code>, <code>INCF PRESSES, F</code>, <code>MOVF PRESSES, W</code>, <code>MOVWF PORTD</code>, <code>RETFIE</code>.`, R`MAIN: <code>BSF GIE</code> and <code>BSF INTE</code>.`] }),
        D.T(R`<p>By default the interrupt happens on the <b>rising</b> edge of RB0 (from $0$ to $1$). An active-low button (pressed $= 0$) needs the <b>falling</b> edge: clear the bit <b>INTEDG</b>, bit 6 of OPTION_REG, which is in bank 1.</p>`),
        D.asm('Falling edge', R`<p>An active-low button (pressed $= 0$, with a pull-up resistor) is connected to RB0. Make the interrupt happen when the button is <b>pressed</b>, on the falling edge: clear INTEDG before enabling the interrupt. The ISR toggles the LED on RD0.</p>`, {
          pre: '    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    BCF   INTF\n    MOVLW 00000001B\n    XORWF PORTD, F      ; toggle RD0\n    RETFIE\n', post: SETUP8,
          start: 'MAIN:\n    CALL SETUP\n    ; choose the falling edge, then enable the interrupt\n\nWAIT:\n    GOTO WAIT\n',
          tests: [{ name: 'Press, release, press, release, press', init: { pins: { B: 1 } }, events: [{ step: 60, pins: { B: 0 } }, { step: 100, pins: { B: 1 } }, { step: 140, pins: { B: 0 } }, { step: 180, pins: { B: 1 } }, { step: 220, pins: { B: 0 } }], maxSteps: 300, limitOk: true, expect: { RD0: 1, INTEDG: 0, BANK: 0 } }],
          solution: 'MAIN:\n    CALL SETUP\n    BANKSEL OPTION_REG\n    BCF  OPTION_REG, 6  ; INTEDG = 0: falling edge\n    BANKSEL PORTD\n    BCF  INTF           ; forget any old edge\n    BSF  GIE\n    BSF  INTE\nWAIT:\n    GOTO WAIT\n'
        }, R`With INTEDG $= 0$ only the three presses ($1 \to 0$) call the ISR, so the LED is toggled three times and ends on. With the rising edge, the two releases would toggle it instead.`, { hint: [R`OPTION_REG is in bank 1: <code>BANKSEL OPTION_REG</code>, <code>BCF OPTION_REG, 6</code>, then back to bank 0.`, R`Clear INTF (changing the edge can set it), then <code>BSF GIE</code> and <code>BSF INTE</code>.`] })
      ]
    },
    {
      title: 'Shared variables and the context (Activity 9)',
      objectives: ['You will understand the problem of Activity 9: variables shared by the main code and the ISR', 'You will be able to save and restore W and STATUS in an ISR'],
      blocks: [
        D.T(R`<p><b>Activity 9</b> changes Activity 8 so that the green LED stays on for $500\ \mathrm{ms}$ and then switches off: the ISR calls the same <code>DELAY_500MS</code> subroutine as the main code. The program works for a while, but after a press it freezes for about $50$ seconds. Why?</p>
<p>When the button is pressed, the main code is usually inside <code>DELAY_500MS</code>, with arbitrary values in its counters A1, A2 and A3. The ISR calls the same delay, which reloads the counters and decrements them to zero. Back in the main code, the delay continues with counters that now hold zero: the next <code>DECFSZ</code> turns $0$ into $255$, and the loop runs far longer than planned. The counters are <b>shared variables</b>, used by two pieces of code that can interrupt each other.</p>`),
        D.KEY('The fix of the lecture', R`<p>Give the ISR its own variables: the corrected Activity 9 uses a second routine <code>DELAY_B_500MS</code> with its own counters B1, B2 and B3. As a rule, an ISR must never use a variable that the main code is using in the middle of a calculation.</p>`),
        D.H('Saving the context'),
        D.T(R`<p>The same problem exists for the <b>W register</b> and the <b>STATUS register</b>: the main code may be interrupted between <code>MOVLW 7</code> and <code>MOVWF A</code>, or between an instruction that sets Z and the <code>BTFSC ZERO</code> that tests it. If the ISR changes W or the flags, the main code continues with wrong values. A correct assembly ISR therefore saves W and STATUS at its start and restores them at its end. The datasheet method uses <code>SWAPF</code>, because unlike <code>MOVF</code> it does not change the Z flag:</p>`),
        D.CODE(R`W_TEMP      EQU 0x70    ; in the shared area 0x70-0x7F,
STATUS_TEMP EQU 0x71    ; reachable from every bank

    ORG     0X4
    MOVWF   W_TEMP          ; save W
    SWAPF   STATUS, W       ; save STATUS (swapped)
    MOVWF   STATUS_TEMP
    BCF     STATUS, 5       ; bank 0 for the ISR
    BCF     STATUS, 6
    ; ... the work of the ISR ...
    SWAPF   STATUS_TEMP, W  ; restore STATUS (and the bank)
    MOVWF   STATUS
    SWAPF   W_TEMP, F       ; restore W without changing the flags
    SWAPF   W_TEMP, W
    RETFIE`, 'asm'),
        D.T(R`<p>Why the shared area? When the interrupt arrives, the main code may be in any bank, so the ISR cannot select a bank before saving W: that would change STATUS, which is not saved yet. The registers $70_{16} \ldots 7F_{16}$ are the same in all four banks, so <code>MOVWF W_TEMP</code> always reaches the same register.</p>`),
        D.mc('The 50 seconds of Activity 9', 'Why does the assembly version of Activity 9 freeze for a long time?', ['The ISR and the main code use the same delay counters, so the main delay continues with destroyed counter values', 'The stack overflows', 'GIE is never set again', 'The button bounces'], 0, 'The shared variables A1, A2 and A3 are reloaded and emptied by the ISR while the main delay is using them.', { hint: 'Which variables do the main code and the ISR both use?' }),
        D.mc('SWAPF', 'Why does the context saving use SWAPF to copy STATUS and W?', ['SWAPF does not change any flag, while MOVF changes Z', 'SWAPF is faster', 'SWAPF selects bank 0', 'SWAPF clears the flags'], 0, 'MOVF sets Z according to the value moved, which would destroy the saved flags.', { hint: 'Which flags does MOVF change?' }),
        D.mc('Why the shared area?', R`<p>Why are W_TEMP and STATUS_TEMP placed at $70_{16}$ and $71_{16}$?</p>`, ['These registers are the same in every bank, and the bank is unknown when the ISR starts', 'They are faster registers', 'The datasheet forbids other addresses', 'They are cleared automatically'], 0, R`The interrupted code may be in any bank; the shared area $70_{16} \ldots 7F_{16}$ is reachable without changing RP0 and RP1.`, { hint: 'Which bank is selected when the interrupt arrives?' }),
        D.order('Restore the context', 'Put the instructions that end the ISR in the right order.', ['<code>SWAPF STATUS_TEMP, W</code>', '<code>MOVWF STATUS</code>', '<code>SWAPF W_TEMP, F</code>', '<code>SWAPF W_TEMP, W</code>', '<code>RETFIE</code>'], 'STATUS is restored first (through W), then W itself with two SWAPF that do not change the restored flags, and finally RETFIE.', { hint: 'W is needed to restore STATUS, so W must be restored last.' }),
        D.asm('Save the context', R`<p>The main code (given after your ISR) loads $7$ into W and checks it, and checks the Z flag, in an endless loop; it counts in ERRORS every time W or the flags were damaged. The ISR must count the button presses in PRESSES and show the count on PORTD, which uses W and changes Z. Complete the ISR so that it saves and restores <b>W and STATUS</b>. The simulator presses the button many times at different moments: at the end ERRORS must be $0$.</p>`, {
          pre: 'ZEROREG EQU 0x21\nERRORS EQU 0x22\nPRESSES EQU 0x23\nW_TEMP EQU 0x70\nSTATUS_TEMP EQU 0x71\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n',
          post: 'MAIN:\n    CALL SETUP\n    CLRF ZEROREG\n    CLRF ERRORS\n    CLRF PRESSES\n    BSF GIE\n    BSF INTE\nLOOP:\n    MOVLW 7\n    XORLW 7          ; W must still be 7: Z = 1\n    BTFSS STATUS, 2\n    INCF ERRORS, F   ; W or Z was damaged\n    MOVF ZEROREG, W  ; sets Z = 1\n    BTFSS STATUS, 2  ; Z must still be 1\n    INCF ERRORS, F\n    GOTO LOOP\n' + SETUP8,
          start: '    ; save W and STATUS\n\n    BCF INTF\n    INCF PRESSES, F\n    MOVF PRESSES, W\n    MOVWF PORTD\n    ; restore STATUS and W\n\n    RETFIE\n',
          tests: [{ name: 'Twelve presses', events: pressSteps([200, 214, 229, 245, 262, 280, 299, 319, 340, 362, 385, 409]), maxSteps: 1200, limitOk: true, expect: { ERRORS: 0, PRESSES: 12, 'OUT.D': 12 } },
            { name: 'Twelve other presses', events: pressSteps([203, 218, 231, 249, 264, 283, 301, 322, 343, 367, 388, 413]), maxSteps: 1200, limitOk: true, expect: { ERRORS: 0, PRESSES: 12 } }],
          solution: '    MOVWF W_TEMP\n    SWAPF STATUS, W\n    MOVWF STATUS_TEMP\n    BCF INTF\n    INCF PRESSES, F\n    MOVF PRESSES, W\n    MOVWF PORTD\n    SWAPF STATUS_TEMP, W\n    MOVWF STATUS\n    SWAPF W_TEMP, F\n    SWAPF W_TEMP, W\n    RETFIE\n'
        }, 'Without the saving, an interrupt just after MOVLW 7 leaves the ISR\'s value in W, and an interrupt just before a BTFSS changes the Z flag that it tests.', { hint: [R`At the start: <code>MOVWF W_TEMP</code>, <code>SWAPF STATUS, W</code>, <code>MOVWF STATUS_TEMP</code>.`, R`Before <code>RETFIE</code>: <code>SWAPF STATUS_TEMP, W</code>, <code>MOVWF STATUS</code>, <code>SWAPF W_TEMP, F</code>, <code>SWAPF W_TEMP, W</code>.`] })
      ]
    },
{
      title: 'Challenge: two interrupt sources',
      objectives: ['You will write an ISR that serves two interrupt sources'],
      blocks: [
        D.T(R`<p>The PIC16F887 has a single interrupt vector, $0004_{16}$, for all its interrupt sources. When several sources are enabled, the ISR must find out which one interrupted by testing their flags, serve every source whose flag is set, and clear each of those flags. If two events happen at the same time, both flags are set: an ISR that serves only one of them and returns is called again at once for the other.</p>`),
        D.asm('Two interrupt sources', R`<p>The main code (given after your ISR) enables the RB0 interrupt and the Timer0 interrupt, then checks W and the Z flag in an endless loop, as in the exercise <i>Save the context</i>, counting every damage in ERRORS. Timer0 counts the instruction cycles without prescaler, so it overflows every $256$ cycles. Write the ISR:</p>
<ul><li>save W and STATUS;</li><li>if INTF is set: clear it and add $1$ to PRESSES;</li><li>if T0IF is set: clear it, add $1$ to TICKS and toggle RD7;</li><li>restore STATUS and W, and return with <code>RETFIE</code>.</li></ul>
<p>The simulator presses the button at many different moments. At the end ERRORS must be $0$, and RD7 must have changed once per tick.</p>`, {
          pre: "ZEROREG EQU 0x21\nERRORS  EQU 0x22\nPRESSES EQU 0x23\nTICKS   EQU 0x24\nW_TEMP  EQU 0x70\nSTATUS_TEMP EQU 0x71\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n",
          post: "MAIN:\n    CALL SETUP\n    CLRF ZEROREG\n    CLRF ERRORS\n    CLRF PRESSES\n    CLRF TICKS\n    BSF  INTE           ; the RB0 interrupt\n    BSF  T0IE           ; the Timer0 interrupt\n    BSF  GIE\nLOOP:\n    MOVLW 7\n    XORLW 7             ; W must still be 7: Z = 1\n    BTFSS STATUS, 2\n    INCF ERRORS, F      ; W or Z was damaged\n    MOVF ZEROREG, W     ; sets Z = 1\n    BTFSS STATUS, 2     ; Z must still be 1\n    INCF ERRORS, F\n    GOTO LOOP\n\nSETUP:\n    CLRF PORTD\n    BSF  RP0\n    MOVLW 11001000B     ; RB0 rising edge, Timer0 from the instruction clock, no prescaler\n    MOVWF OPTION_REG\n    MOVLW 11111111B     ; RB0 is input\n    MOVWF TRISB\n    CLRF TRISD          ; PORTD is output\n    BSF  RP1\n    CLRF ANSELH         ; RB0 is digital\n    BCF  RP0\n    BCF  RP1\n    RETURN\n",
          start: '    ; save W and STATUS\n\n    ; the button: INTF\n\n    ; Timer0: T0IF\n\n    ; restore STATUS and W\n\n    RETFIE\n',
          tests: [['Timer0 alone', []], ['Five presses', [300, 520, 777, 1010, 1300]], ['Twenty presses', [200, 263, 331, 397, 466, 529, 601, 668, 734, 809, 871, 940, 1003, 1077, 1142, 1215, 1281, 1356, 1420, 1497]]].map(([name, steps]) => ({ name, events: pressSteps(steps), maxSteps: 2500, limitOk: true, expect: { ERRORS: 0, PRESSES: steps.length, TICKS: [11, 16] }, check: (r) => r.get('EDGES.D7') === r.get('TICKS') ? null : 'RD7 changed ' + r.get('EDGES.D7') + ' times but TICKS is ' + r.get('TICKS') + ': toggle RD7 once at every Timer0 overflow.' })),
          solution: "    MOVWF W_TEMP        ; save W\n    SWAPF STATUS, W     ; save STATUS\n    MOVWF STATUS_TEMP\n    BTFSS INTF          ; the button?\n    GOTO  NOT_BUTTON\n    BCF   INTF\n    INCF  PRESSES, F\nNOT_BUTTON:\n    BTFSS T0IF          ; Timer0?\n    GOTO  RESTORE\n    BCF   T0IF\n    INCF  TICKS, F\n    MOVLW 10000000B\n    XORWF PORTD, F      ; toggle RD7\nRESTORE:\n    SWAPF STATUS_TEMP, W\n    MOVWF STATUS\n    SWAPF W_TEMP, F\n    SWAPF W_TEMP, W\n    RETFIE\n"
        }, R`With two sources the ISR cannot assume which event called it: it tests INTF and T0IF and serves every flag that is set. A flag that is not cleared calls the ISR again at once, forever. Saving W and STATUS matters even more here: Timer0 interrupts the main loop every $256$ cycles, sooner or later at every possible place.`, { challenge: true, hint: [R`After saving the context: <code>BTFSS INTF</code> and a <code>GOTO</code> past the code of the button, which is <code>BCF INTF</code> and <code>INCF PRESSES, F</code>.`, R`Then the same for T0IF. Toggle RD7 with <code>MOVLW 10000000B</code> and <code>XORWF PORTD, F</code>. W is changed here, which is why it was saved.`] })
      ]
    }
  ]
});
})();
