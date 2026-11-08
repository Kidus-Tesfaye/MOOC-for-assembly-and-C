/* Part 12 - PWM and analog input (Lecture 13 Timer2/PWM and Activity 13; Lecture 15 A/D and Activity 14; Lecture 17 LM35) */
(function () {
const ADCON0_NAMES = ['ADCS1', 'ADCS0', 'CHS3', 'CHS2', 'CHS1', 'CHS0', 'GO', 'ADON'];
const PWM_SETUP = 'SETUP:\n    CLRF    PORTC\n    BANKSEL OSCCON\n    MOVLW   01100000B\n    MOVWF   OSCCON       ; 4 MHz\n    CLRF    TRISC        ; RC1 and RC2 outputs\n    MOVLW   255\n    MOVWF   PR2          ; the period\n    BANKSEL T2CON\n    MOVLW   00000111B\n    MOVWF   T2CON        ; prescaler 16, Timer2 on\n    MOVLW   00001100B\n    MOVWF   CCP1CON      ; CCP1 in PWM mode\n    MOVWF   CCP2CON      ; CCP2 in PWM mode\n    RETURN\n';
const DELAY10 = 'DELAY_10MS:\n    MOVLW 13\n    MOVWF B2\nD10_OUT:\n    MOVLW 255\n    MOVWF B1\nD10_IN:\n    DECFSZ B1, F\n    GOTO D10_IN\n    DECFSZ B2, F\n    GOTO D10_OUT\n    RETURN\n';
const READ_AN0 = 'READ_AN0:\n    MOVLW 01000001B     ; Fosc/8, AN0, ADON\n    MOVWF ADCON0\n    MOVLW 5\n    MOVWF A1\n    DECFSZ A1, F        ; acquisition time\n    GOTO $-1\n    BSF GO\n    BTFSC GO\n    GOTO $-1\n    MOVF ADRESH, W      ; 8 high bits\n    RETURN\n';
D.part({
  title: 'PWM and analog input',
  intro: R`<p>The pins of a microcontroller are digital: $0$ or $5\ \mathrm{V}$. In this part you learn the two tricks that connect a digital program to the analog world. <b>PWM</b> switches a pin on and off so fast that a motor or an LED only feels the average voltage. The <b>A/D converter</b> turns an input voltage, from a potentiometer or a temperature sensor, into a number that the program compares with a limit to make a decision.</p>`,
  sections: [
    {
      title: 'PWM with Timer2 and the CCP module (Activity 13)',
      objectives: [R`You will know what the duty cycle $\alpha$ of a PWM signal is and why $V_{\text{avg}} = \alpha\,V_{\text{in}}$`, 'You will be able to calculate PR2 and CCPR1L for a given frequency and duty cycle', 'You will be able to configure the PWM of the PIC in assembly'],
      blocks: [
        D.T(R`<p>A <b>PWM</b> signal (pulse width modulation) is a digital signal with a fixed period $T$ and a variable time $T_{\text{on}}$ at $1$. Its <b>duty cycle</b> is the fraction of the period spent at $1$:</p>
$$\alpha = \frac{T_{\text{on}}}{T}, \qquad 0 \leq \alpha \leq 1.$$
<p>A normal square wave has $\alpha = 50\%$. Applied at a high frequency to an LED or a motor, a PWM signal acts like its average value:</p>
$$V_{\text{avg}} = \frac{1}{T} \int_{0}^{T} v(t)\,dt = \frac{1}{T} \int_{0}^{\alpha T} V_{\text{in}}\,dt = \alpha\,V_{\text{in}}.$$
<p>So the brightness of an LED or the speed of a motor is controlled by the duty cycle. PWM is also used in power converters and in communication.</p>`),
        D.H('Timer2'),
        D.T(R`<p><b>Timer2</b> is an $8$-bit timer used mainly for PWM. Its clock is $\frac{F_{\text{osc}}}{4}$ through a prescaler of $1$, $4$ or $16$. TMR2 counts from $0$ up to the value of the register <b>PR2</b>; on the next increment it goes back to $0$ and a <b>postscaler</b> ($1$ to $16$) counts these matches before setting the flag TMR2IF. The control register is <b>T2CON</b>: TMR2ON (bit 2) switches it on, T2CKPS1:T2CKPS0 (bits 1–0) select the prescaler ($00 \to 1$, $01 \to 4$, $1x \to 16$) and TOUTPS3:TOUTPS0 the postscaler.</p>`),
        D.H('PWM by hardware: the CCP module'),
        D.T(R`<p>The PIC16F887 has two <b>CCP</b> modules (Capture/Compare/PWM) that generate PWM signals by hardware on the pins <b>RC2</b> (CCP1) and <b>RC1</b> (CCP2). In PWM mode a comparator sets the pin when TMR2 reaches PR2 (start of a period, TMR2 restarts from $0$), and a second comparator clears it when TMR2 reaches the duty value copied from <b>CCPR1L</b>. With $T_{\text{ins}} = \frac{4}{F_{\text{osc}}}$:</p>
$$T = (PR2 + 1) \times T_{\text{ins}} \times \text{prescaler}, \qquad T_{\text{on}} = CCPR1L \times T_{\text{ins}} \times \text{prescaler}, \qquad \alpha = \frac{CCPR1L}{PR2 + 1}.$$
<p>(CCPR1L is used here as an $8$-bit value; the module actually has $10$-bit resolution with two more bits in CCP1CON.) The two CCP modules share Timer2, so the two PWM signals always have the <b>same period</b>, but each has its own duty cycle. The postscaler is not used for PWM.</p>`),
        D.EX('Activity 13: the period', 'Fosc = 4 MHz, PR2 = 255, prescaler = 16', 'text', [], R`$T = (255 + 1) \times 1\ \mu\mathrm{s} \times 16 = 4096\ \mu\mathrm{s}$ and $f = \frac{1}{T} = \frac{1\,000\,000}{4096} \approx 244.14\ \mathrm{Hz}$. Changing CCPR1L from $0$ to $255$ changes $T_{\text{on}}$ from $0$ to $4080\ \mu\mathrm{s}$, almost $0\%$ to $100\%$.`, { lineNumbers: false }),
        D.T(R`<p>The SETUP of Activity 13 configures both CCP modules. PR2 and the TRIS registers are in bank 1, T2CON and the CCP registers in bank 0:</p>`),
        D.CODE(PWM_SETUP, 'asm'),
        D.T(R`<p>The main loop of Activity 13 then makes CCPR1L grow from $0$ and CCPR2L fall from $255$, one step every $10\ \mathrm{ms}$: the two duty cycles move in opposite directions. In Lab 6 the signal drives a DC motor through a transistor, and the motor speeds up and slows down with the duty cycle.</p>`),
        D.num('Average voltage', R`<p>A $5\ \mathrm{V}$ PWM signal has a frequency of $500\ \mathrm{Hz}$ and $T_{\text{on}} = 500\ \mu\mathrm{s}$. What is its average voltage, in volts?</p>`, 1.25, R`$T = \frac{1}{500} = 2\ \mathrm{ms}$, $\alpha = \frac{0.5}{2} = 0.25$, $V_{\text{avg}} = 0.25 \times 5 = 1.25\ \mathrm{V}$.`, { unit: 'V', tol: 0.001, hint: R`First the period, then $\alpha = \frac{T_{\text{on}}}{T}$.` }),
        D.num('PR2 for 500 Hz', R`<p>Calculate PR2 for a PWM frequency of $500\ \mathrm{Hz}$ with an $8\ \mathrm{MHz}$ crystal and a prescaler of $16$.</p>`, 249, R`$T = 2\ \mathrm{ms}$ and $T_{\text{ins}} = 0.5\ \mu\mathrm{s}$: $PR2 + 1 = \frac{2000\ \mu\mathrm{s}}{0.5\ \mu\mathrm{s} \times 16} = 250$, so $PR2 = 249$.`, { hint: R`Solve $T = (PR2 + 1) \times T_{\text{ins}} \times 16$.` }),
        D.num('Best frequency', R`<p>With a $10\ \mathrm{MHz}$ crystal, a prescaler of $1$ and $PR2 = 255$, what is the PWM frequency, in hertz (one decimal)?</p>`, 9765.6, R`$T = 256 \times 0.4\ \mu\mathrm{s} = 102.4\ \mu\mathrm{s}$, $f = \frac{1}{102.4\ \mu\mathrm{s}} \approx 9765.6\ \mathrm{Hz}$.`, { tol: 0.1, unit: 'Hz', hint: R`$T_{\text{ins}} = \frac{4}{10\ \mathrm{MHz}} = 0.4\ \mu\mathrm{s}$.` }),
        D.multi('3 V from 12 V', R`<p>A motor must receive an average of $3\ \mathrm{V}$ from a $12\ \mathrm{V}$ supply with a $1000\ \mathrm{Hz}$ PWM signal, on a PIC at $4\ \mathrm{MHz}$ with a prescaler of $4$. Give PR2 and CCPR1L (rounded down).</p>`, [{ label: 'PR2 =', ans: [249] }, { label: 'CCPR1L =', ans: [62] }], R`$T = 1000\ \mu\mathrm{s} = (PR2 + 1) \times 1\ \mu\mathrm{s} \times 4$, so $PR2 = 249$. $\alpha = \frac{3}{12} = 0.25$ and $CCPR1L = 0.25 \times 250 = 62.5 \to 62$.`, { hint: R`$\alpha = \frac{V_{\text{avg}}}{V_{\text{in}}}$ and $CCPR1L = \alpha\,(PR2 + 1)$.` }),
        D.num('A flag every half millisecond', R`<p>Which value of PR2 sets the flag TMR2IF every $500\ \mu\mathrm{s}$ on a PIC running at $1\ \mathrm{MHz}$, with a prescaler of $1$ and a postscaler of $5$?</p>`, 24, R`$T_{\text{ins}} = 4\ \mu\mathrm{s}$; the flag comes after $(PR2 + 1) \times 4\ \mu\mathrm{s} \times 1 \times 5 = 500\ \mu\mathrm{s}$, so $PR2 + 1 = 25$.`, { hint: 'For the flag (not for PWM) the postscaler counts too.' }),
        D.mc('Two PWM frequencies?', 'Can CCP1 and CCP2 produce two PWM signals with different frequencies?', ['No: both use Timer2, so they share the period; only the duty cycles differ', 'Yes, each has its own timer', 'Yes, with the postscaler', 'Only with Timer1'], 0, 'Timer2 and PR2 are common to both modules.', { hint: 'Which timer defines the period?' }),
        D.asm('A quarter duty cycle', R`<p>Generate on RC2 (CCP1) a PWM signal of about $244\ \mathrm{Hz}$ (PR2 $= 255$, prescaler $16$) with a duty cycle of $25\%$, then stop with <code>GOTO $</code> (the PWM keeps running by hardware).</p>`, {
          start: '; configure TRISC, PR2, T2CON, CCP1CON and CCPR1L\n\n    GOTO $\n',
          tests: [{ expect: { 'PWM1.ON': 1, 'PWM1.FREQ': [244, 244.3], 'PWM1.DUTY': 0.25, TRISC2: 0 } }],
          solution: '    BANKSEL TRISC\n    CLRF    TRISC        ; RC2 output\n    MOVLW   255\n    MOVWF   PR2\n    BANKSEL T2CON\n    MOVLW   00000111B    ; prescaler 16, Timer2 on\n    MOVWF   T2CON\n    MOVLW   00001100B    ; PWM mode\n    MOVWF   CCP1CON\n    MOVLW   64           ; 25 % of 256\n    MOVWF   CCPR1L\n    GOTO $\n'
        }, R`$\alpha = \frac{CCPR1L}{PR2 + 1} = \frac{64}{256} = 0.25$. Mind the banks: TRISC and PR2 are in bank 1, the other registers in bank 0.`, { hint: [R`Copy the CCP1 part of the SETUP shown above.`, R`$CCPR1L = 0.25 \times 256 = 64$.`] }),
        D.asm('Activity 13', R`<p>Complete the main loop of Activity 13: every $10\ \mathrm{ms}$ CCPR1L increases by one and CCPR2L decreases by one. The SETUP and a <code>DELAY_10MS</code> subroutine are given after your code.</p>`, {
          pre: 'B1 EQU 0x70\nB2 EQU 0x71\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    RETFIE\n', post: PWM_SETUP + DELAY10,
          start: 'MAIN:\n    CALL SETUP\n    CLRF CCPR1L          ; 0 %\n    MOVLW 255\n    MOVWF CCPR2L         ; 100 %\nLOOP:\n    ; change the two duty cycles, wait 10 ms\n\n    GOTO LOOP\n',
          tests: [{ name: 'After about 0.5 s', maxSteps: 340000, limitOk: true, check: (r) => { const a = r.get('CCPR1L'), b = r.get('CCPR2L'); return (a + b === 255 && a >= 45 && a <= 52) ? null : 'CCPR1L is ' + a + ' and CCPR2L is ' + b + ': after about 0.5 s CCPR1L should be about 50 and the sum should be 255.'; }, expect: { 'PWM1.FREQ': [244, 244.3], 'PWM2.ON': 1 } }],
          solution: 'MAIN:\n    CALL SETUP\n    CLRF CCPR1L\n    MOVLW 255\n    MOVWF CCPR2L\nLOOP:\n    INCF CCPR1L, F       ; duty cycle 1 up\n    DECF CCPR2L, F       ; duty cycle 2 down\n    CALL DELAY_10MS\n    GOTO LOOP\n'
        }, R`After $50$ rounds of $10\ \mathrm{ms}$, CCPR1L is about $50$ and CCPR2L about $205$: their sum stays $255$.`, { hint: R`<code>INCF CCPR1L, F</code>, <code>DECF CCPR2L, F</code>, <code>CALL DELAY_10MS</code>.` })
      ]
    },
    {
      title: 'The A/D converter (Activity 14)',
      objectives: [R`You will know what the resolution and the sampling rate of a converter are`, 'You will be able to configure ADCON0 and ADCON1 and start a conversion', 'You will be able to read a potentiometer in assembly, with 8 or 10 bits'],
      blocks: [
        D.T(R`<p>An <b>analog-to-digital converter</b> (ADC) turns a voltage that can take any value into a number with a limited set of values. Two things matter:</p>
<ul>
<li><b>Quantization</b>: how finely the voltage is measured. An $n$-bit converter distinguishes $2^{n}$ levels. The lecture imagines a child describing the height of a butterfly in a $5\ \mathrm{m}$ room: with $1$ bit the answer is just "high" or "low" (above or below $2.5\ \mathrm{m}$), with $2$ bits there are $4$ levels, and so on.</li>
<li><b>Sampling rate</b>: how many measurements are taken per second. By the <b>Nyquist</b> criterion, a signal must be sampled at more than twice its highest frequency: $F_{\text{sampling}} > 2 F_{\max}$.</li>
</ul>
<p>The converter of the PIC16F887 has <b>10 bits</b>: $2^{10} = 1024$ levels, from $0$ to $1023$. With the references $V_{\text{ref}-} = 0\ \mathrm{V}$ and $V_{\text{ref}+} = 5\ \mathrm{V}$, one step is $\frac{5\ \mathrm{V}}{1024} \approx 4.88\ \mathrm{mV}$. It has $14$ analog inputs (AN0–AN13) but only one converter, so the channels are read one after the other.</p>`),
        D.T(R`<p>A conversion has two phases. First the selected input charges a small holding capacitor: this <b>acquisition time</b> is about $20\ \mu\mathrm{s}$. Then the voltage is converted bit by bit: $1\ T_{\text{AD}}$ per bit plus $2\ T_{\text{AD}}$, $12\ T_{\text{AD}}$ in total, with $T_{\text{AD}} \geq 1.6\ \mu\mathrm{s}$ ($2\ \mu\mathrm{s}$ with $\frac{F_{\text{osc}}}{8}$ at $4\ \mathrm{MHz}$). One sample therefore takes about $20 + 12 \times 2 = 44\ \mu\mathrm{s}$: about $22\,700$ samples per second, enough for signals up to about $11\ \mathrm{kHz}$.</p>`),
        D.TABLE(['Register', 'Bits', 'Role'], [
          ['ADCON0', 'ADCS1:ADCS0 (7–6)', R`conversion clock: $00 \to \frac{F_{\text{osc}}}{2}$, $01 \to \frac{F_{\text{osc}}}{8}$, $10 \to \frac{F_{\text{osc}}}{32}$, $11 \to$ internal RC`],
          ['ADCON0', 'CHS3:CHS0 (5–2)', 'the channel AN0 … AN13'],
          ['ADCON0', 'GO/DONE (1)', 'set it to start; the hardware clears it when the result is ready'],
          ['ADCON0', 'ADON (0)', 'switches the converter on'],
          ['ADCON1', 'ADFM (7)', R`$0$: left justified (8 high bits in ADRESH); $1$: right justified`],
          ['ADCON1', 'VCFG1, VCFG0 (5, 4)', R`$1$: use the pins AN2 / AN3 as $V_{\text{ref}-}$ / $V_{\text{ref}+}$ instead of VSS / VDD`],
          ['ADRESH, ADRESL', '', 'the 10-bit result'],
          ['ANSEL, ANSELH', '', 'the pin must be analog ($1$) and an input (TRIS $= 1$)']
        ]),
        D.T(R`<p><b>Activity 14</b> reads a potentiometer on AN0 (RA0) and shows the result on PORTD. Only $8$ LEDs are available, so the result is left justified and only ADRESH, the $8$ high bits, is used:</p>`),
        D.CODE(R`READ_AN0:
    MOVLW   01000001B   ; FOSC/8, CH0, ADON
    MOVWF   ADCON0
    CALL    DELAY_20US
    BSF     GO          ; start conversion
    BTFSC   GO          ; is it done?
    GOTO    $-1         ; not yet, retest
    MOVF    ADRESH, W   ; done, ADRESH to W
    RETURN`, 'asm', { cap: R`In the SETUP: TRISA0 $= 1$ (input), ANS0 $= 1$ (analog) and ADCON1 $= 0$ (left justified, $V_{\text{ref}}$ from VDD and VSS).` }),
        D.T(R`<p>The converter gives a <b>ratiometric</b> value: the reading is the fraction of the reference range, multiplied by the largest code. For an $n$-bit converter with references $V^{+}$ and $V^{-}$:</p>
$$\text{reading} = \frac{V_{\text{in}} - V^{-}}{V^{+} - V^{-}} \times (2^{n} - 1), \qquad V_{\text{in}} = \frac{(V^{+} - V^{-}) \times \text{reading}}{2^{n} - 1} + V^{-}.$$
<p>For the usual $10$-bit converter with $0$ and $5\ \mathrm{V}$: $\text{reading} = 1023 \times \frac{V_{\text{in}}}{5}$.</p>`),
        D.num('Resolution', R`<p>How many different levels does the $10$-bit converter of the PIC distinguish?</p>`, 1024, R`$2^{10} = 1024$, from $0$ to $1023$.`, { hint: R`$2^{n}$ levels.` }),
        D.num('A 4-bit reading', R`<p>Calculate the reading of a $4$-bit converter for $V_{\text{in}} = 3\ \mathrm{V}$, with $V^{+} = 4\ \mathrm{V}$ and $V^{-} = 0\ \mathrm{V}$ (rounded down).</p>`, 11, R`$\frac{3 - 0}{4 - 0} \times (2^{4} - 1) = 0.75 \times 15 = 11.25 \to 11$.`, { hint: R`$2^{4} - 1 = 15$.` }),
        D.num('Above the reference', R`<p>The same $4$-bit converter now has $V^{+} = 2\ \mathrm{V}$ and $V^{-} = 0\ \mathrm{V}$. What is the reading for $3\ \mathrm{V}$?</p>`, 15, R`$V_{\text{in}} > V^{+}$: the converter saturates at its largest code, $15$.`, { hint: 'The reading cannot exceed the largest code.' }),
        D.num('Voltage from a reading', R`<p>A $10$-bit converter with $V^{+} = 4\ \mathrm{V}$ and $V^{-} = 1\ \mathrm{V}$ reads $230$. What is the input voltage, in volts (three decimals)?</p>`, 1.674, R`$V_{\text{in}} = \frac{(4 - 1) \times 230}{1023} + 1 \approx 0.674 + 1 = 1.674\ \mathrm{V}$.`, { tol: 0.002, unit: 'V', hint: R`$V_{\text{in}} = \frac{(V^{+} - V^{-}) \times \text{reading}}{2^{n} - 1} + V^{-}$.` }),
        D.num('Nyquist', R`<p>A converter takes $44\ \mu\mathrm{s}$ per sample. What is the highest signal frequency it can sample correctly, in kHz (one decimal)?</p>`, 11.4, R`$F_{\text{sampling}} = \frac{1}{44\ \mu\mathrm{s}} \approx 22.7\ \mathrm{kHz}$ and $F_{\max} < \frac{F_{\text{sampling}}}{2} \approx 11.4\ \mathrm{kHz}$.`, { tol: 0.1, unit: 'kHz', hint: R`$F_{\max} < \frac{F_{\text{sampling}}}{2}$.` }),
        D.bits('ADCON0 for AN0', R`<p>Configure ADCON0 as in Activity 14: conversion clock $\frac{F_{\text{osc}}}{8}$, channel AN0, converter on (do not start yet).</p>`, { reg: 'ADCON0', names: ADCON0_NAMES, want: '01000001', init: '00000000' }, R`ADCS $= 01$, CHS $= 0000$, GO $= 0$, ADON $= 1$: $0100\,0001_{2}$.`, { hint: 'ADCS1:ADCS0 are the two highest bits; ADON is bit 0.' }),
        D.asm('Activity 14', R`<p>Write the subroutine <code>READ_AN0</code> of Activity 14: configure ADCON0 ($\frac{F_{\text{osc}}}{8}$, AN0, ADON), wait the acquisition time with the given <code>DELAY_20US</code>, start the conversion, wait until GO is cleared and return ADRESH in W. The main code (which copies W to PORTD forever) and the SETUP are given. The simulator applies different voltages to AN0.</p>`, {
          pre: 'A1 EQU 0x70\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    RETFIE\nMAIN:\n    CALL SETUP\nREPEAT:\n    CALL READ_AN0\n    MOVWF PORTD\n    GOTO REPEAT\nDELAY_20US:\n    MOVLW 5\n    MOVWF A1\n    DECFSZ A1, F\n    GOTO $-1\n    RETURN\nSETUP:\n    CLRF PORTD\n    BSF RP0\n    MOVLW 01100000B\n    MOVWF OSCCON\n    CLRF TRISD\n    BSF TRISA0\n    BSF RP1\n    BSF ANS0\n    CLRF ADCON1\n    BCF RP1\n    BCF RP0\n    RETURN\n',
          start: 'READ_AN0:\n\n    RETURN\n',
          tests: [{ name: '2.5 V', init: { analog: { 0: 2.5 } }, maxSteps: 3000, limitOk: true, expect: { 'OUT.D': 128 } }, { name: '1 V', init: { analog: { 0: 1 } }, maxSteps: 3000, limitOk: true, expect: { 'OUT.D': 51 } }, { name: '5 V', init: { analog: { 0: 5 } }, maxSteps: 3000, limitOk: true, expect: { 'OUT.D': 255 } }],
          solution: 'READ_AN0:\n    MOVLW 01000001B\n    MOVWF ADCON0\n    CALL DELAY_20US\n    BSF GO\n    BTFSC GO\n    GOTO $-1\n    MOVF ADRESH, W\n    RETURN\n'
        }, R`$2.5\ \mathrm{V}$ gives $1023 \times 0.5 \approx 512$; left justified, ADRESH holds $\frac{512}{4} = 128$.`, { hint: 'Copy the assembly routine shown above.' }),
        D.asm('Read 10 bits', R`<p>Read the full $10$-bit result of AN0 into RESH:RESL. Use the <b>right justified</b> format (ADFM $= 1$ in ADCON1, bank 1): then ADRESH holds the $2$ high bits and ADRESL (bank 1) the $8$ low bits. RESH and RESL are in the shared area $70_{16} \ldots 7F_{16}$, so they can be written from any bank.</p>`, {
          start: 'RESH EQU 0x70\nRESL EQU 0x71\nWAIT EQU 0x72\n\n; write your code here\n\n    GOTO $\n',
          tests: [[2.5, 512], [0.2, 41], [5, 1023], [0, 0]].map(([v, n]) => ({ name: R`$` + v + R`\ \mathrm{V}$`, init: { analog: { 0: v }, RESH: 9, RESL: 9 }, expect: { RESH: n >> 8, RESL: n & 255 } })),
          reqs: [{ re: /\bADRESL\b/i, msg: 'Read ADRESL too.' }],
          solution: 'RESH EQU 0x70\nRESL EQU 0x71\nWAIT EQU 0x72\n\n    BANKSEL ADCON1\n    MOVLW   10000000B   ; ADFM = 1: right justified\n    MOVWF   ADCON1\n    BANKSEL ADCON0\n    MOVLW   01000001B   ; Fosc/8, AN0, ADON\n    MOVWF   ADCON0\n    MOVLW   5\n    MOVWF   WAIT\n    DECFSZ  WAIT, F     ; acquisition time\n    GOTO    $-1\n    BSF     GO\n    BTFSC   GO\n    GOTO    $-1\n    MOVF    ADRESH, W   ; 2 high bits\n    MOVWF   RESH\n    BANKSEL ADRESL\n    MOVF    ADRESL, W   ; 8 low bits\n    MOVWF   RESL\n    BANKSEL PORTA\n    GOTO $\n'
        }, R`With ADFM $= 1$ the result is $512 = 02\,00_{16}$ for $2.5\ \mathrm{V}$: RESH $= 2$ and RESL $= 0$. AN0 is an analog input after a reset, so only ADCON1 and ADCON0 need to be set.`, { hint: [R`<code>BANKSEL ADCON1</code>, <code>MOVLW 10000000B</code>, <code>MOVWF ADCON1</code>; then configure ADCON0 as in Activity 14.`, R`After the conversion: <code>MOVF ADRESH, W</code> into RESH, then <code>BANKSEL ADRESL</code> and <code>MOVF ADRESL, W</code> into RESL.`] })
      ]
    },
    {
      title: 'From a reading to a decision',
      objectives: ['You will be able to convert a reading into a physical value', 'You will understand why the reference voltage is lowered for the LM35', 'You will be able to switch an output when a reading passes a limit'],
      blocks: [
        D.T(R`<p><b>Activity 16C</b> measures the temperature with an <b>LM35</b>, a sensor whose output voltage grows by $10\ \mathrm{mV}$ per degree Celsius: $250\ \mathrm{mV}$ at $25\,^{\circ}\mathrm{C}$, $1\ \mathrm{V}$ at $100\,^{\circ}\mathrm{C}$:</p>
$$T\,(^{\circ}\mathrm{C}) = \frac{V_{\text{out}}\,(\mathrm{mV})}{10}.$$
<p>For $0 \ldots 100\,^{\circ}\mathrm{C}$ the sensor gives only $0 \ldots 1\ \mathrm{V}$. With the usual $5\ \mathrm{V}$ reference, $1\ \mathrm{V}$ is only $\frac{1023}{5} \approx 205$ steps: the resolution is $\frac{100}{205} \approx 0.5\,^{\circ}\mathrm{C}$. Lowering $V_{\text{ref}+}$ to $1\ \mathrm{V}$ (VCFG0 $= 1$, the reference on AN3) uses all $1024$ steps: $\frac{100}{1024} \approx 0.1\,^{\circ}\mathrm{C}$, five times better. The $1\ \mathrm{V}$ comes from a voltage divider on the $5\ \mathrm{V}$ supply:</p>
$$V_{\text{out}} = \frac{R_{2}}{R_{1} + R_{2}}\,V_{\text{in}} \quad\Rightarrow\quad R_{1} = R_{2}\left(\frac{V_{\text{in}}}{V_{\text{out}}} - 1\right) = 4 R_{2},$$
<p>for example $R_{2} = 1\ \mathrm{k}\Omega$ and $R_{1} = 4\ \mathrm{k}\Omega$.</p>`),
        D.T(R`<p>The program does not need to calculate the temperature itself to make a decision: it is enough to compare the reading with the reading of the limit. With $V_{\text{ref}+} = 1\ \mathrm{V}$, $40\,^{\circ}\mathrm{C}$ is $0.4\ \mathrm{V}$, which reads $1023 \times 0.4 \approx 409$. Left justified, ADRESH holds the $8$ high bits, $\frac{409}{4} \approx 102$. So "<i>hotter than $40\,^{\circ}\mathrm{C}$</i>" is simply "<i>ADRESH $> 102$</i>", a comparison from Part 4. In Lab 8 a <b>relay</b> on RD6, driven by a transistor, switches a fan or a heater in this way.</p>`),
        D.num('Temperature from a reading', R`<p>With $V_{\text{ref}+} = 1\ \mathrm{V}$, the converter reads $307$. What is the temperature, in degrees Celsius (integer part)?</p>`, 30, R`$T = \frac{307 \times 100}{1023} \approx 30.0\,^{\circ}\mathrm{C}$.`, { hint: R`The full range $1023$ corresponds to $100\,^{\circ}\mathrm{C}$.` }),
        D.multi('Voltage divider', R`<p>Design a voltage divider that gives $2.3\ \mathrm{V}$ from a $1000\ \mathrm{V}$ source, with $R_{2} = 1\ \mathrm{k}\Omega$. Give $R_{1}$ in kilohms (one decimal).</p>`, [{ label: R`$R_{1} =$`, ans: [433.8], tol: 0.1, unit: 'kΩ' }], R`$R_{1} = R_{2}\left(\frac{1000}{2.3} - 1\right) = 1\ \mathrm{k}\Omega \times 433.78 \approx 433.8\ \mathrm{k}\Omega$.`, { hint: R`$R_{1} = R_{2}\left(\frac{V_{\text{in}}}{V_{\text{out}}} - 1\right)$.` }),
        D.num('The limit as a reading', R`<p>A thermostat must react above $30\,^{\circ}\mathrm{C}$, with an LM35 and $V_{\text{ref}+} = 1\ \mathrm{V}$. Which value of ADRESH (left justified, $8$ high bits) corresponds to the limit? Round down.</p>`, 76, R`$30\,^{\circ}\mathrm{C}$ is $0.3\ \mathrm{V}$; the reading is $1023 \times 0.3 \approx 307$, and the $8$ high bits are $\frac{307}{4} \approx 76$.`, { hint: R`First the $10$-bit reading, then divide by $4$.` }),
        D.asm('Temperature alarm', R`<p>An LM35 is connected to AN0, with $V_{\text{ref}+} = 1\ \mathrm{V}$ on AN3 (SETUP is given). Write the main loop: read the temperature with the given <code>READ_AN0</code> (it returns ADRESH in W) and switch the relay on RD6 <b>on</b> when ADRESH $> 102$ (above $40\,^{\circ}\mathrm{C}$) and <b>off</b> otherwise, forever.</p>`, {
          pre: 'A1 EQU 0x70\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    RETFIE\n', post: 'SETUP:\n    CLRF PORTD\n    BANKSEL TRISD\n    CLRF TRISD\n    MOVLW 00010000B     ; VCFG0 = 1: Vref+ on AN3\n    MOVWF ADCON1\n    BANKSEL PORTD\n    RETURN\n' + READ_AN0,
          start: 'MAIN:\n    CALL SETUP\nLOOP:\n    CALL READ_AN0\n    ; relay on RD6 on if W > 102, off otherwise\n\n    GOTO LOOP\n',
          tests: [[0.5, 1], [0.25, 0], [0.41, 1], [0.40, 0]].map(([v, on]) => ({ name: R`$` + (v * 100).toFixed(0) + R`\,^{\circ}\mathrm{C}$`, init: { analog: { 0: v }, vrefP: 1 }, maxSteps: 400, limitOk: true, expect: { RD6: on } })),
          solution: 'MAIN:\n    CALL SETUP\nLOOP:\n    CALL READ_AN0\n    SUBLW 102           ; 102 - W: C = 0 if W > 102\n    BTFSS STATUS, 0\n    GOTO HOT\n    BCF  PORTD, 6       ; relay off\n    GOTO LOOP\nHOT:\n    BSF  PORTD, 6       ; relay on\n    GOTO LOOP\n'
        }, R`<code>SUBLW 102</code> calculates $102 - \text{ADRESH}$, with C $= 0$ exactly when ADRESH $> 102$. The tests $40\,^{\circ}\mathrm{C}$ (ADRESH $= 102$) and $41\,^{\circ}\mathrm{C}$ (ADRESH $= 104$) check the limit.`, { hint: [R`Compare W with $102$ using <code>SUBLW 102</code> (Part 4).`, R`C $= 0$ means hotter than the limit: <code>BSF PORTD, 6</code>; otherwise <code>BCF PORTD, 6</code>.`] })
      ]
    },
{
      title: 'Challenge: a dimmer with a minimum',
      objectives: ['You will connect the A/D converter and the PWM in one program'],
      blocks: [
        D.T(R`<p>A dimmer connects the two halves of this part: the A/D converter reads a potentiometer and the PWM sets the brightness of an LED. With PR2 $= 255$, the duty cycle is $\frac{\text{CCPR1L}}{256}$ (when the 2 low bits in CCP1CON are $0$), so the $8$ high bits of a left-justified conversion, ADRESH, can go straight into CCPR1L. Real dimmers often keep a minimum brightness, so that a lamp turned all the way down does not look broken.</p>`),
        D.asm('A dimmer with a minimum', R`<p>Write the whole program. Set up the PWM on CCP1 (RC2) with PR2 $= 255$ and the Timer2 prescaler $16$, as in Activity 13, and the A/D converter on AN0 (ADCON1 can stay $0$: left justified). Then loop forever: convert AN0 and copy ADRESH into CCPR1L, but never less than $26$ (about $10\,\%$): if ADRESH is below $26$, use $26$.</p>`, {
          start: 'LEVEL EQU 0x20\nA1    EQU 0x21\n\n; the setup\n\nLOOP:\n    ; read AN0, then set the brightness\n\n    GOTO LOOP\n',
          tests: [
            { name: R`$2.5\ \mathrm{V}$`, init: { analog: { 0: 2.5 } }, maxSteps: 3000, limitOk: true, expect: { CCPR1L: 128, 'PWM1.ON': 1, 'PWM1.FREQ': [244, 244.3], TRISC2: 0 } },
            { name: R`$1\ \mathrm{V}$`, init: { analog: { 0: 1 } }, maxSteps: 3000, limitOk: true, expect: { CCPR1L: 51, 'PWM1.ON': 1 } },
            { name: R`$5\ \mathrm{V}$`, init: { analog: { 0: 5 } }, maxSteps: 3000, limitOk: true, expect: { CCPR1L: 255 } },
            { name: R`$0.2\ \mathrm{V}$: the minimum`, init: { analog: { 0: 0.2 } }, maxSteps: 3000, limitOk: true, expect: { CCPR1L: 26, 'PWM1.ON': 1 } },
            { name: R`$1\ \mathrm{V}$, then $4\ \mathrm{V}$`, init: { analog: { 0: 1 } }, events: [{ step: 1500, analog: { 0: 4 } }], maxSteps: 3000, limitOk: true, expect: { CCPR1L: 204 } }],
          solution: "LEVEL EQU 0x20\nA1    EQU 0x21\n\n    BANKSEL PR2\n    MOVLW   255\n    MOVWF   PR2         ; PWM period: 256 x 16 cycles\n    BCF     TRISC, 2    ; RC2 (CCP1) output\n    BANKSEL T2CON\n    MOVLW   00000111B\n    MOVWF   T2CON       ; Timer2 on, prescaler 16\n    MOVLW   00001100B\n    MOVWF   CCP1CON     ; CCP1 in PWM mode\n    MOVLW   01000001B\n    MOVWF   ADCON0      ; Fosc/8, AN0, converter on (ADCON1 = 0: left justified)\nLOOP:\n    MOVLW   5\n    MOVWF   A1\n    DECFSZ  A1, F       ; acquisition time\n    GOTO    $-1\n    BSF     ADCON0, 1   ; GO: start the conversion\n    BTFSC   ADCON0, 1   ; wait until it is finished\n    GOTO    $-1\n    MOVF    ADRESH, W\n    MOVWF   LEVEL\n    MOVLW   26\n    SUBWF   LEVEL, W    ; LEVEL - 26: C = 0 if LEVEL < 26\n    MOVLW   26\n    BTFSC   STATUS, 0\n    MOVF    LEVEL, W    ; LEVEL >= 26: keep it\n    MOVWF   CCPR1L      ; the brightness\n    GOTO    LOOP\n"
        }, R`The setup comes from Activity 13 (PWM) and Activity 14 (A/D converter). In the loop, <code>SUBWF</code> compares the reading with $26$: C $= 0$ means it is smaller, and $26$ is used instead. $1\ \mathrm{V}$ gives about $\frac{1}{5} \times 1024 \approx 205$, so ADRESH $= 51$, a duty cycle of about $20\,\%$.`, { challenge: true, hint: [R`Setup: PR2 $= 255$ and TRISC2 $= 0$ (bank 1); T2CON $= 00000111_{2}$, CCP1CON $= 00001100_{2}$ and ADCON0 $= 01000001_{2}$ (bank 0).`, R`Loop: wait a few cycles (the acquisition time), <code>BSF ADCON0, 1</code> (GO), wait while it is $1$, then compare ADRESH with $26$ using <code>SUBWF</code> and copy the right value into CCPR1L.`] })
      ]
    }
  ]
});
})();
