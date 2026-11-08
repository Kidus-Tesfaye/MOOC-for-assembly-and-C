/* Part 11 - Timers (Lectures 11 and 12; Activities 10, 11 and 12; Lab 5) */
(function () {
const OPT_NAMES = ['RBPU', 'INTEDG', 'T0CS', 'T0SE', 'PSA', 'PS2', 'PS1', 'PS0'];
const T1_NAMES = ['T1GINV', 'TMR1GE', 'T1CKPS1', 'T1CKPS0', 'T1OSCEN', 'T1SYNC', 'TMR1CS', 'TMR1ON'];
const VEC = '    ORG 0\n    GOTO MAIN\n    ORG 0X4\n';
const SETUP10 = '\nSETUP:\n    CLRF PORTD\n    BSF RP0\n    MOVLW 01100000B\n    MOVWF OSCCON\n    CLRF TRISD\n    MOVLW 11011000B     ; Timer0: internal clock, no prescaler\n    MOVWF OPTION_REG\n    BCF RP0\n    RETURN\n';
const DELAY = '\nDELAY_500MS:\n    MOVLW 0X54\n    MOVWF A1\n    MOVLW 0X8a\n    MOVWF A2\n    MOVLW 0X03\n    MOVWF A3\n    DECFSZ A1, 1\n    GOTO $-1\n    DECFSZ A2, 1\n    GOTO $-3\n    DECFSZ A3, 1\n    GOTO $-5\n    NOP\n    RETURN\n';
const SETUP256 = '\nSETUP:\n    CLRF PORTD\n    BSF RP0\n    MOVLW 01100000B\n    MOVWF OSCCON\n    CLRF TRISD\n    MOVLW 11000111B     ; Timer0: internal clock, prescaler 256\n    MOVWF OPTION_REG\n    BCF RP0\n    RETURN\n';
D.part({
  title: 'Timers',
  intro: R`<p>A delay loop keeps the processor busy: while it counts, it can do nothing else. A <b>timer</b> is a counter in hardware that counts on its own, in parallel with the program, and raises a flag when it overflows. In this part you use Timer0 and Timer1 to generate exact signals, first by polling the flag and then with interrupts, which lets the PIC do several tasks at once. The timer calculations are classic exam questions.</p>`,
  sections: [
    {
      title: 'Timer0 and the prescaler',
      objectives: [R`You will know how Timer0 counts and when its flag T0IF is set`, 'You will be able to configure Timer0 with OPTION_REG', R`You will be able to calculate the value to load into TMR0: $t = T_{\text{ins}} \times \text{prescaler} \times (256 - \text{TMR0})$`],
      blocks: [
        D.T(R`<p>The PIC16F887 has three timers. You can imagine each one as a clock with a single hand: <b>Timer0</b> and <b>Timer2</b> count from $0$ to $255$ ($8$ bits), <b>Timer1</b> from $0$ to $65535$ ($16$ bits). Timer0 is simply the register <b>TMR0</b> in bank 0, which the hardware increments by itself. It counts the oscillator clock divided by $4$, so with a $4\ \mathrm{MHz}$ oscillator it is incremented every $T_{\text{ins}} = 1\ \mu\mathrm{s}$.</p>
<p>When TMR0 passes from $255$ to $0$ (the <b>overflow</b>, like an alarm clock reaching its alarm), the flag <b>T0IF</b> of INTCON is set. The program can poll this flag, or use it as an interrupt; either way the program must clear it. Timer0 cannot be stopped: it always runs.</p>`),
        D.T(R`<p>To measure a time of $n$ counts, load TMR0 with $256 - n$: after $n$ increments it overflows. Since $256$ is the same as $0$ for a byte, loading $-n$ gives the same value: the lecture writes <code>MOVLW -39</code>. To count longer times, a <b>prescaler</b> divides the clock before Timer0 by $2, 4, 8, \ldots, 256$. Altogether:</p>
$$t = T_{\text{ins}} \times \text{prescaler} \times (256 - \text{TMR0}).$$
<p>Without a prescaler, Timer0 counts at most $256$ cycles; with the prescaler of $256$, at most $256 \times 256 = 65536$ cycles, which is $65.536\ \mathrm{ms}$ at $4\ \mathrm{MHz}$. Timer0 has no control register of its own: it is configured by the bits 0 to 5 of <b>OPTION_REG</b> (bank 1):</p>`),
        D.TABLE(['Bit', 'Name', 'Meaning'], [
          ['5', 'T0CS', '$0$: timer (counts the instruction clock); $1$: counter of the pulses on the pin RA4/T0CKI'],
          ['4', 'T0SE', 'edge counted on T0CKI (only for the counter mode)'],
          ['3', 'PSA', '$1$: no prescaler for Timer0 (it is given to the watchdog timer); $0$: prescaler used by Timer0'],
          ['2–0', 'PS2:PS0', R`prescaler: $000 \to 2$, $001 \to 4$, $010 \to 8$, $011 \to 16$, $100 \to 32$, $101 \to 64$, $110 \to 128$, $111 \to 256$`]
        ]),
        D.EX('A 50 ms interval', 'prescaler = 256, Tins = 1 us', 'text', [], R`$1\ \mu\mathrm{s} \times 256 \times (256 - \text{TMR0}) = 50000\ \mu\mathrm{s}$ gives $256 - \text{TMR0} = \frac{50000}{256} \approx 195$, so TMR0 $= 61$, written <code>-195</code>. The flag is then set every $195 \times 256 = 49920\ \mu\mathrm{s}$.`, { lineNumbers: false }),
        D.bits('OPTION_REG for a 256 prescaler', R`<p>Configure OPTION_REG for Timer0 as a <b>timer</b> with the prescaler of <b>256</b>. The bits RBPU, INTEDG and T0SE do not matter.</p>`, { reg: 'OPTION_REG', names: OPT_NAMES, want: 'xx0x0111', init: '11111111', maskNote: 'Checked: T0CS, PSA and PS2:PS0.' }, R`T0CS $= 0$ (timer), PSA $= 0$ (prescaler for Timer0) and PS2:PS0 $= 111$ (divide by $256$).`, { hint: 'The prescaler is assigned to Timer0 when PSA = 0.' }),
        D.num('Fifty counts', R`<p>Without prescaler and at $4\ \mathrm{MHz}$, which value must be loaded into TMR0 so that T0IF is set after $50\ \mu\mathrm{s}$?</p>`, 206, R`$256 - 50 = 206$ (the same as <code>-50</code>).`, { hint: R`One count is $1\ \mu\mathrm{s}$.` }),
        D.multi('A 1 ms period at 8 MHz', R`<p>A signal with a period of $1\ \mathrm{ms}$ is generated with Timer0 on a PIC running at $8\ \mathrm{MHz}$: the pin is toggled every $0.5\ \mathrm{ms}$. Find the most accurate prescaler and TMR0 value.</p>`, [{ label: 'Prescaler:', ans: [4] }, { label: 'TMR0 =', ans: [6] }], R`$T_{\text{ins}} = \frac{4}{8\ \mathrm{MHz}} = 0.5\ \mu\mathrm{s}$, so $500\ \mu\mathrm{s}$ is $1000$ cycles. With a prescaler of $4$: $\frac{1000}{4} = 250$ counts, exactly, so TMR0 $= 256 - 250 = 6$.`, { hint: R`$1000$ cycles must be prescaler $\times$ counts with counts $\leq 256$.` }),
        D.mc('A very short time with prescaler 256', R`<p>Can Timer0 with a prescaler of $256$ at $4\ \mathrm{MHz}$ produce an interrupt after $100\ \mu\mathrm{s}$?</p>`, ['No: one count already lasts $256\\ \\mu\\mathrm{s}$; a smaller prescaler (or none, with TMR0 $= 156$) is needed', 'Yes, with TMR0 $= 156$', 'Yes, with TMR0 $= 0$', 'Yes, with TMR0 $= 100$'], 0, R`$\frac{100}{256} \approx 0.39$ counts is less than one count. Without prescaler, TMR0 $= 256 - 100 = 156$ works.`, { hint: R`How long is one count with the prescaler of $256$?` }),
        D.multi('500 Hz at 16 MHz', R`<p>A $500\ \mathrm{Hz}$ square wave is generated with the Timer0 interrupt on a PIC at $16\ \mathrm{MHz}$ (the pin toggles every half period). Find a prescaler and TMR0 value that give the exact time.</p>`, [{ label: 'Prescaler:', ans: [16] }, { label: 'TMR0 =', ans: [6] }], R`Half period $= 1\ \mathrm{ms}$; $T_{\text{ins}} = 0.25\ \mu\mathrm{s}$, so $4000$ cycles $= 16 \times 250$: prescaler $16$, TMR0 $= 256 - 250 = 6$.`, { hint: R`$\frac{1\ \mathrm{ms}}{0.25\ \mu\mathrm{s}} = 4000$ cycles.` }),
        D.tf('Timer only?', 'Timer0 can be used as a timer only.', false, 'With T0CS = 1 it counts external pulses on RA4/T0CKI: it is also a counter.', { hint: 'What does T0CS select?' }),
        D.num('Longest count', R`<p>How many instruction cycles can Timer0 count with its prescaler, at most?</p>`, 65536, R`$256 \times 256 = 65536$ cycles.`, { hint: R`$\text{prescaler} \times \text{counts}$.` }),
        D.num('Without prescaler', R`<p>Timer0 without prescaler counts from $0$ to which value?</p>`, 255, R`TMR0 is an $8$-bit register: $0 \ldots 255$, and the next increment overflows to $0$.`, { hint: 'How many bits does TMR0 have?' })
      ]
    },
    {
      title: 'Square waves by polling (Activity 10)',
      objectives: ['You will be able to generate a square wave by polling the Timer0 flag', 'You will know why the measured frequency differs from the calculated one'],
      blocks: [
        D.T(R`<p><b>Activity 10</b> generates a square wave of $10\ \mathrm{kHz}$ on RD0. The period is $T = \frac{1}{10\,000\ \mathrm{Hz}} = 100\ \mu\mathrm{s}$, so the pin must toggle every $50\ \mu\mathrm{s}$: $50$ counts without prescaler. The loop clears the flag, loads TMR0, waits for the flag and toggles RD0 with an XOR:</p>`),
        D.CODE(R`REPEAT:
    BCF     T0IF        ; clear the flag
    MOVLW   -39         ; load TMR0 to count 39 steps
    MOVWF   TMR0
    BTFSS   T0IF        ; wait for the flag
    GOTO    $-1
    MOVLW   00000001B   ; toggle RD0
    XORWF   PORTD, F    ; using XOR
    GOTO    REPEAT`, 'asm'),
        D.T(R`<p>Why $39$ and not $50$? The instructions of the loop take time too: the toggle, the jump back and the reload cost about $11\ \mu\mathrm{s}$ in every half period, and a write to TMR0 also stops it for two cycles. The lecture tuned the value experimentally to <code>-39</code>. (The LED itself does not seem to blink: the eye cannot see more than about $20$ changes per second.)</p>
<p>With the prescaler of $256$ the same loop produces much slower signals. With TMR0 $= -195$ the pin toggles every $49920\ \mu\mathrm{s}$, about $50\ \mathrm{ms}$: a $10\ \mathrm{Hz}$ signal. The few cycles of the loop hardly matter at this scale.</p>`),
        D.asm('Activity 10', R`<p>Write the main loop of Activity 10: a $10\ \mathrm{kHz}$ square wave on RD0 with Timer0 (no prescaler; SETUP is given and configures OPTION_REG and the port). The simulator measures the frequency of RD0; it must be between $9.5$ and $10.5\ \mathrm{kHz}$.</p>`, {
          pre: VEC + '    RETFIE\n', post: SETUP10, start: 'MAIN:\n    CALL SETUP\nREPEAT:\n    ; clear T0IF, load TMR0, wait for T0IF, toggle RD0\n\n    GOTO REPEAT\n',
          tests: [{ name: 'Frequency of RD0', maxSteps: 60000, limitOk: true, expect: { 'FREQ.D0': [9500, 10500] } }],
          solution: 'MAIN:\n    CALL SETUP\nREPEAT:\n    BCF T0IF\n    MOVLW -39\n    MOVWF TMR0\n    BTFSS T0IF\n    GOTO $-1\n    MOVLW 00000001B\n    XORWF PORTD, F\n    GOTO REPEAT\n'
        }, R`The loop takes about $50\ \mu\mathrm{s}$ per half period: $39$ counts of TMR0, the two-cycle write delay and about $9$ cycles of instructions.`, { hint: ['Copy the loop shown above.', 'If your frequency is too low, load a smaller count (closer to 0); if it is too high, a bigger one.'] }),
        D.asm('A 10 Hz wave with the prescaler', R`<p>Generate a $10\ \mathrm{Hz}$ square wave on RD0: SETUP (given) selects the prescaler $256$; in the loop clear T0IF, load TMR0 with <code>-195</code>, wait for T0IF and toggle RD0. The simulator measures the period of RD0: about $100\ \mathrm{ms}$.</p>`, {
          pre: VEC + '    RETFIE\n', post: SETUP256, start: 'MAIN:\n    CALL SETUP\nREPEAT:\n    ; clear T0IF, load TMR0, wait for T0IF, toggle RD0\n\n    GOTO REPEAT\n',
          tests: [{ name: 'Period of RD0', maxSteps: 450000, limitOk: true, expect: { 'PERIOD.D0': [98000, 103000] } }],
          solution: 'MAIN:\n    CALL SETUP\nREPEAT:\n    BCF   T0IF\n    MOVLW -195\n    MOVWF TMR0\n    BTFSS T0IF\n    GOTO  $-1\n    MOVLW 00000001B\n    XORWF PORTD, F\n    GOTO  REPEAT\n'
        }, R`Each half period is $195 \times 256 = 49920$ cycles plus a few cycles of the loop, so the period is about $100\ \mathrm{ms}$.`, { hint: 'The same loop as Activity 10, with -195 instead of -39.' })
      ]
    },
    {
      title: 'Timer interrupts and multitasking (Activity 11)',
      objectives: ['You will be able to use the Timer0 interrupt', 'You will understand how a timer interrupt lets the PIC do two tasks at once', 'You will be able to count interrupts to measure long times'],
      blocks: [
        D.T(R`<p>Polling the flag has the same weakness as a delay loop: the program waits and can do nothing else. With the <b>interrupt</b>, the flag calls the ISR every time Timer0 overflows, and the main code is free for another task. Three conditions are needed: GIE $= 1$, <b>T0IE</b> $= 1$, and the overflow, which sets T0IF.</p>
<p><b>Activity 11</b> runs two tasks: the main code blinks an LED on RD1 at $1\ \mathrm{Hz}$ with the usual delay, and the ISR, called every $50\ \mathrm{ms}$, toggles an LED on RD0 at $10\ \mathrm{Hz}$. This is the principle of <b>multitasking</b>: a computer schedules its programs with timer interrupts, so they seem to run at the same time although each one runs only in its own time slot.</p>`),
        D.CODE(R`    ORG     0X4
    BCF     T0IF
    MOVLW   -195        ; reload TMR0
    MOVWF   TMR0
    MOVLW   00000001B   ; toggle RD0
    XORWF   PORTD, F
    RETFIE

MAIN:
    CALL    SETUP       ; enables GIE, T0IE
    BCF     T0IF
    MOVLW   -195
    MOVWF   TMR0
REPEAT:
    MOVLW   00000010B   ; toggle RD1
    XORWF   PORTD
    CALL    DELAY_500MS
    GOTO    REPEAT`, 'asm', { cap: 'Activity 11. The ISR does not save the context because it is short and the main code does not depend on W or the flags at the moments it can be interrupted; in general, save it (Part 10).' }),
        D.asm('Activity 11', R`<p>Write the ISR of Activity 11 at address <code>0x04</code>: clear T0IF, reload TMR0 with <code>-195</code> and toggle RD0. The main code, the SETUP (prescaler $256$, GIE and T0IE enabled) and the delay are given after your code. RD0 must have a period of about $100\ \mathrm{ms}$ while RD1 blinks at $1\ \mathrm{Hz}$.</p>`, {
          pre: 'A1 EQU 0x70\nA2 EQU 0x71\nA3 EQU 0x72\n' + VEC,
          post: 'MAIN:\n    CALL SETUP\n    BCF T0IF\n    MOVLW -195\n    MOVWF TMR0\nREPEAT:\n    MOVLW 00000010B\n    XORWF PORTD\n    CALL DELAY_500MS\n    GOTO REPEAT\n\nSETUP:\n    CLRF PORTD\n    BSF RP0\n    MOVLW 01100000B\n    MOVWF OSCCON\n    CLRF TRISD\n    MOVLW 11010111B\n    MOVWF OPTION_REG\n    BCF RP0\n    BSF GIE\n    BSF T0IE\n    RETURN\n' + DELAY,
          start: '    ; the ISR\n\n    RETFIE\n',
          tests: [{ name: 'Two tasks', maxSteps: 800000, limitOk: true, expect: { 'PERIOD.D0': [99000, 101000], 'EDGES.D1': [2, 3] } }],
          solution: '    BCF T0IF\n    MOVLW -195\n    MOVWF TMR0\n    MOVLW 00000001B\n    XORWF PORTD, F\n    RETFIE\n'
        }, R`The ISR runs every $195 \times 256 = 49920$ cycles, about $50\ \mathrm{ms}$, and toggles RD0; the main code never waits for the timer.`, { hint: 'Copy the ISR shown above.' }),
        D.T(R`<p>A timer cannot count very long times by itself: Timer0 reaches at most $65.536\ \mathrm{ms}$ at $4\ \mathrm{MHz}$. Longer times are counted by the ISR: a variable counts the interrupts, and the action happens every $n$ interrupts. Ten interrupts of $50\ \mathrm{ms}$ make half a second.</p>`),
        D.asm('Half a second from ten interrupts', R`<p>Write the ISR so that it counts the $50\ \mathrm{ms}$ Timer0 interrupts in TICKS and, every $10$ interrupts ($10 \times 50\ \mathrm{ms} = 0.5\ \mathrm{s}$), toggles RD0 and resets TICKS. RD0 must then have a period of about $1\ \mathrm{s}$. The main code and SETUP are given after your code.</p>`, {
          pre: 'TICKS EQU 0x20\n' + VEC,
          post: 'MAIN:\n    CALL SETUP\n    CLRF TICKS\n    BCF T0IF\n    MOVLW -195\n    MOVWF TMR0\n    BSF GIE\n    BSF T0IE\n    GOTO $\n' + SETUP256,
          start: '    ; the ISR\n\n    RETFIE\n',
          tests: [{ name: 'Period of RD0 about 1 s', maxSteps: 1300000, limitOk: true, expect: { 'PERIOD.D0': [990000, 1010000] } }],
          solution: '    BCF   T0IF\n    MOVLW -195\n    MOVWF TMR0          ; next interrupt in 50 ms\n    INCF  TICKS, F\n    MOVF  TICKS, W\n    XORLW 10            ; tenth interrupt?\n    BTFSS STATUS, 2\n    RETFIE\n    CLRF  TICKS\n    MOVLW 00000001B\n    XORWF PORTD, F      ; toggle RD0\n    RETFIE\n'
        }, R`The ISR reloads TMR0 on every interrupt, counts it, and only every tenth interrupt toggles RD0: a half period of about $10 \times 49920$ cycles, a period of about $1\ \mathrm{s}$. An ISR may have more than one <code>RETFIE</code>.`, { hint: [R`Start like Activity 11: <code>BCF T0IF</code>, reload TMR0 with <code>-195</code>.`, R`<code>INCF TICKS, F</code>, compare TICKS with $10$ using <code>XORLW 10</code>; only when Z $= 1$ clear TICKS and toggle RD0.`] }),
        D.num('Ticks for one second', R`<p>The Timer0 interrupt comes every $50\ \mathrm{ms}$. How many interrupts make one second?</p>`, 20, R`$\frac{1\ \mathrm{s}}{50\ \mathrm{ms}} = 20$.`, { hint: R`$1\ \mathrm{s} = 1000\ \mathrm{ms}$.` }),
        D.mc('Why interrupts for multitasking?', 'What is the advantage of the Timer0 interrupt over polling T0IF?', ['The main code can do another task instead of waiting for the flag', 'The timer counts faster', 'No flag needs to be cleared', 'It uses less RAM'], 0, 'The timer runs in hardware; the interrupt calls the ISR only when needed.', { hint: 'What does the main code do while polling?' })
      ]
    },
    {
      title: 'Timer1 (Activity 12)',
      objectives: ['You will be able to configure Timer1 with T1CON', 'You will be able to calculate the 16-bit preload and split it into TMR1H and TMR1L', R`You will be able to generate a $1\ \mathrm{Hz}$ signal with Timer1`],
      blocks: [
        D.T(R`<p><b>Timer1</b> is a $16$-bit timer: it counts from $0$ to $65535$ and its value is split into two registers, <b>TMR1H</b> and <b>TMR1L</b>. Its prescaler divides by $1$, $2$, $4$ or $8$, and it has its own control register <b>T1CON</b>: <b>TMR1ON</b> (bit 0) switches it on, <b>TMR1CS</b> (bit 1) selects the clock ($0$: instruction clock, timer mode) and <b>T1CKPS1:T1CKPS0</b> (bits 5–4) select the prescaler. Its overflow flag <b>TMR1IF</b> is in PIR1. The time formula is the same as for Timer0 with $65536$ instead of $256$:</p>
$$t = T_{\text{ins}} \times \text{prescaler} \times (65536 - \text{TMR1}).$$
<p>Timer0 with its prescaler can count up to $65536$ cycles; Timer1 up to $65536 \times 8 = 524288$ cycles, about half a second at $4\ \mathrm{MHz}$.</p>`),
        D.EX('Activity 12: 500 ms with Timer1', 'prescaler = 8, Tins = 1 us', 'text', [], R`$65536 - \text{TMR1} = \frac{500000\ \mu\mathrm{s}}{8 \times 1\ \mu\mathrm{s}} = 62500$, so TMR1 $= 3036 = 0BDC_{16}$: load TMR1H with $0B_{16}$ and TMR1L with $DC_{16}$. Toggling the pin every $500\ \mathrm{ms}$ gives $1\ \mathrm{Hz}$.`, { lineNumbers: false }),
        D.bits('T1CON for Activity 12', R`<p>Configure T1CON: Timer1 <b>on</b>, in <b>timer mode</b> (internal clock) with a prescaler of <b>8</b>. The other bits must be $0$.</p>`, { reg: 'T1CON', names: T1_NAMES, want: '00110001', init: '00000000' }, R`T1CKPS1:T1CKPS0 $= 11$ (prescaler $8$), TMR1CS $= 0$, TMR1ON $= 1$: $0011\,0001_{2}$.`, { hint: 'The prescaler bits are 5 and 4; TMR1ON is bit 0.' }),
        D.multi('Split the preload', R`<p>Timer1 must be loaded with $63036$. Give TMR1H and TMR1L in hexadecimal.</p>`, [{ label: 'TMR1H =', ans: ['F6'], kind: 'hex' }, { label: 'TMR1L =', ans: ['3C'], kind: 'hex' }], R`$63036 = 246 \times 256 + 60 = F63C_{16}$: TMR1H $= F6_{16}$ and TMR1L $= 3C_{16}$.`, { hint: R`The high byte is $\lfloor \frac{63036}{256} \rfloor$, the low byte the remainder.` }),
        D.num('A 1 ms period at 20 MHz', R`<p>A $1\ \mathrm{ms}$ period is generated with Timer1 at $20\ \mathrm{MHz}$ (toggle every $0.5\ \mathrm{ms}$, prescaler $1$). Which value must be loaded into Timer1 (decimal)?</p>`, 63036, R`$T_{\text{ins}} = 0.2\ \mu\mathrm{s}$, so $500\ \mu\mathrm{s}$ is $2500$ counts: $65536 - 2500 = 63036$.`, { hint: R`$\frac{500\ \mu\mathrm{s}}{0.2\ \mu\mathrm{s}}$ counts.` }),
        D.mc('One second with Timer1', R`<p>At $4\ \mathrm{MHz}$, can Timer1 produce a delay of $1\ \mathrm{s}$ in one overflow?</p>`, ['No: the maximum is $524288\\ \\mu\\mathrm{s}$; count two overflows of $500\\ \\mathrm{ms}$, or clock Timer1 from a slower source such as a $32.768\\ \\mathrm{kHz}$ crystal', 'Yes, with the prescaler of 8', R`Yes, with TMR1 $= 0$`, 'Only with Timer0'], 0, R`$65536 \times 8 \times 1\ \mu\mathrm{s} = 524\,288\ \mu\mathrm{s} < 1\ \mathrm{s}$.`, { hint: R`Calculate the longest time: $65536 \times 8$ cycles.` }),
        D.multi('Timer1 limits', R`<p>Questions from the lecture about Timer1 at $4\ \mathrm{MHz}$.</p>`, [{ label: 'Without prescaler it counts from 0 to:', ans: [65535] }, { label: 'With its prescaler it counts at most (cycles):', ans: [524288] }], R`$16$ bits: $0 \ldots 65535$. With the prescaler of $8$: $65536 \times 8 = 524288$ cycles.`, { hint: 'Timer1 has 16 bits and a prescaler of at most 8.' }),
        D.tf('Timer1 as a counter', 'Timer1 can be used as a timer only.', false, 'With TMR1CS = 1 Timer1 counts an external clock, for example a 32.768 kHz watch crystal: it is also a counter.', { hint: 'What does TMR1CS select?' }),
        D.asm('Activity 12', R`<p>Write Activity 12: configure Timer1 (prescaler $8$, on) in SETUP, then in the main loop load TMR1 with $0BDC_{16}$, wait for TMR1IF, clear it and toggle RD0. RD0 must have a period of about $1\ \mathrm{s}$.</p>`, {
          pre: VEC + '    RETFIE\n',
          start: 'MAIN:\n    CALL SETUP\nREPEAT:\n    ; load TMR1H and TMR1L, wait for TMR1IF, clear it, toggle RD0\n\n    GOTO REPEAT\n\nSETUP:\n    CLRF PORTD\n    BSF RP0\n    MOVLW 01100000B\n    MOVWF OSCCON\n    CLRF TRISD\n    BCF RP0\n    ; configure T1CON\n\n    RETURN\n',
          tests: [{ name: 'Period of RD0', maxSteps: 2100000, limitOk: true, expect: { 'PERIOD.D0': [995000, 1005000], T1CON: 0x31 } }],
          solution: 'MAIN:\n    CALL SETUP\nREPEAT:\n    MOVLW 0x0B\n    MOVWF TMR1H\n    MOVLW 0xDC\n    MOVWF TMR1L\n    BTFSS TMR1IF\n    GOTO $-1\n    BCF TMR1IF\n    MOVLW 00000001B\n    XORWF PORTD, F\n    GOTO REPEAT\n\nSETUP:\n    CLRF PORTD\n    BSF RP0\n    MOVLW 01100000B\n    MOVWF OSCCON\n    CLRF TRISD\n    BCF RP0\n    MOVLW 00110001B\n    MOVWF T1CON\n    RETURN\n'
        }, R`Every $62500 \times 8$ cycles $= 500\ \mathrm{ms}$ the flag is set and RD0 toggles: a $1\ \mathrm{Hz}$ signal.`, { hint: [R`T1CON $= 00110001B$ (in bank 0).`, R`The loop: <code>MOVLW 0x0B</code>, <code>MOVWF TMR1H</code>, <code>MOVLW 0xDC</code>, <code>MOVWF TMR1L</code>, <code>BTFSS TMR1IF</code>, <code>GOTO $-1</code>, <code>BCF TMR1IF</code> and the XOR toggle.`] })
      ]
    },
{
      title: 'Challenge: measure a pulse',
      objectives: ['You will use Timer1 as a stopwatch to measure the length of a pulse'],
      blocks: [
        D.T(R`<p>Timer1 can also work as a stopwatch: switched on at the start of an event and off at its end, it holds the duration in instruction cycles, up to $65535$. Many sensors answer with a pulse whose length is the measurement; an ultrasonic distance sensor, for example, makes a pulse as long as the echo takes to come back. With a $4\ \mathrm{MHz}$ clock, one count of Timer1 without prescaler is $1\ \mu\mathrm{s}$.</p>`),
        D.asm('Measure a pulse', R`<p>A pulse arrives on RD0, which is an input after a reset: the pin goes to $1$, stays there for a while, and goes back to $0$. Measure its length in instruction cycles with Timer1 (internal clock, prescaler $1$) and store it in WH:WL. Start counting from $0$: the timer holds an unknown value after a reset. The pulse lasts at most $65535$ cycles; a difference of a few cycles is accepted.</p>`, {
          start: 'WH EQU 0x20\nWL EQU 0x21\n\n; write your code here\n\n    GOTO $\n',
          tests: [1000, 300, 20000, 50000].map(w => ({ name: R`Pulse of $` + w + R`$ cycles`, init: { TMR1H: 0x12, TMR1L: 0x34, WH: 9, WL: 9 }, events: [{ at: 5000, pins: { D: 1 } }, { at: 5000 + w, pins: { D: 0 } }], maxSteps: 60000, limitOk: true, check: (r) => { const got = r.get('WH') * 256 + r.get('WL'); return Math.abs(got - w) <= 12 ? null : 'WH:WL is ' + got + ', but the pulse lasted ' + w + ' cycles.'; } })),
          solution: "WH EQU 0x20\nWL EQU 0x21\n\n    CLRF  T1CON         ; Timer1 off: internal clock, prescaler 1\n    CLRF  TMR1H\n    CLRF  TMR1L\nWAIT_HIGH:\n    BTFSS PORTD, 0      ; wait for the start of the pulse\n    GOTO  WAIT_HIGH\n    BSF   T1CON, 0      ; TMR1ON: start counting\nWAIT_LOW:\n    BTFSC PORTD, 0      ; wait for the end of the pulse\n    GOTO  WAIT_LOW\n    BCF   T1CON, 0      ; stop\n    MOVF  TMR1H, W\n    MOVWF WH\n    MOVF  TMR1L, W\n    MOVWF WL\n    GOTO  $\n"
        }, R`T1CON $= 0$ selects the instruction clock and prescaler $1$, and keeps the timer stopped while TMR1H and TMR1L are cleared. Each polling loop reacts within $3$ cycles, so the result differs from the real length by only a few cycles. Stopping the timer before reading it keeps the two bytes consistent: reading a running timer could give a high byte and a low byte from different moments.`, { challenge: true, hint: [R`Clear T1CON (Timer1 off, prescaler $1$, internal clock), TMR1H and TMR1L. Then wait for the pulse with <code>BTFSS PORTD, 0</code> and <code>GOTO $-1</code>.`, R`<code>BSF T1CON, 0</code> (TMR1ON) starts the timer. Wait for RD0 $= 0$, stop the timer with <code>BCF T1CON, 0</code>, and copy TMR1H into WH and TMR1L into WL.`] })
      ]
    }
  ]
});
})();
