/* Part 7 - Memory, ports and buttons (Lecture 5 RAM banks, Lecture 6 ports and Activity 2, Lecture 7 buttons and Activities 3-5) */
(function () {
const b8 = H.b8;
const ASTART = '; write your code here\n\n    GOTO $\n';
const pre = (tris, defs) => defs + '\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    RETFIE\n\nSETUP:                 ; by default we are in BANK0\n    CLRF  PORTD        ; clear port at the beginning\n    BSF   RP0          ; RP1 IS BY DEFAULT 0\n    MOVLW 01100000B    ; configuring OSCCON\n    MOVWF OSCCON       ; register to select 4Mhz oscillator\n    MOVLW ' + tris + '\n    MOVWF TRISD\n    BCF   RP0          ; access to BANK 0\n    RETURN\n';
const A3 = pre('00000010B', '#define LED RD0\n#define PB  RD1\n');
const A5 = pre('00000110B', '#define LED     RD0\n#define PB_ON   RD1\n#define PB_OFF  RD2\n');
const PORT_NAMES = (p) => [7, 6, 5, 4, 3, 2, 1, 0].map(i => 'TRIS' + p + i);
D.part({
  title: 'Memory, ports and buttons',
  intro: R`<p>A microcontroller program talks to the outside world through its pins, and every pin is controlled by a bit of a register. In this part you learn how the RAM is organised in banks, how to configure a pin as an input or an output, how to read push buttons (Activities 2 to 5), and how to set, clear, toggle and test single pins without disturbing the others.</p>`,
  sections: [
    {
      title: 'The RAM banks',
      objectives: ['You will understand why the RAM is divided into four banks', 'You will be able to select a bank with RP1 and RP0 or with BANKSEL', 'You will know which registers can be reached from every bank'],
      blocks: [
        D.T(R`<p>The instructions of the PIC16 are $14$ bits wide. An instruction that works with a register, such as <code>MOVWF f</code> or <code>ADDWF f, d</code>, uses $6$ bits for the operation, $1$ bit for the destination d and only <b>$7$ bits for the address</b> of the register:</p>
$$\underbrace{00\,0111}_{\text{ADDWF}}\;\underbrace{d}_{\text{1 bit}}\;\underbrace{fff\,ffff}_{\text{7 bits}}$$
<p>With $7$ bits the instruction can name only $2^{7} = 128$ registers, but the RAM has $512$ addresses ($0$ to $1FF_{16}$, which needs $9$ bits). The RAM is therefore divided into four <b>banks</b> of $128$ registers, and the two missing high bits of the address are taken from two bits of the STATUS register, called <b>RP1</b> and <b>RP0</b>:</p>`),
        D.TABLE(['Bank', 'RP1', 'RP0', 'Addresses'], [['0', '0', '0', R`$000_{16} \ldots 07F_{16}$`], ['1', '0', '1', R`$080_{16} \ldots 0FF_{16}$`], ['2', '1', '0', R`$100_{16} \ldots 17F_{16}$`], ['3', '1', '1', R`$180_{16} \ldots 1FF_{16}$`]], { mono: [1, 2] }),
        D.T(R`<p>Registers in the same row of the RAM map have the same lowest $7$ bits: <code>PORTD</code> is at $08_{16} = 0\,0000\,1000_{2}$, <code>TRISD</code> at $88_{16} = 0\,1000\,1000_{2}$, <code>CM2CON0</code> at $108_{16}$ and <code>ANSEL</code> at $188_{16}$. So <code>MOVWF TRISD</code> really means "register $000\,1000_{2}$ of the current bank". If the program is in bank $0$, the value goes into <b>PORTD</b>, not into TRISD! The bank must be selected first:</p>`),
        D.CODE(R`    BSF     STATUS, 5   ; RP0 = 1: bank 1
    CLRF    TRISD       ; TRISD is in bank 1
    BCF     STATUS, 5   ; RP0 = 0: back to bank 0`, 'asm', { cap: R`RP0 is bit 5 and RP1 bit 6 of STATUS; the lecture code writes <code>BSF RP0</code> and <code>BCF RP1</code>. The pic-as directive <code>BANKSEL TRISD</code> generates the right instructions automatically: it sets or clears RP0 and RP1 for the bank of TRISD.` }),
        D.T(R`<p>But STATUS itself is in the RAM: how can it be reached when the wrong bank is selected? STATUS (and a few other registers such as INTCON and PCL) appears at the same place in all four banks. The $16$ registers $70_{16} \ldots 7F_{16}$ are also shared by all banks: this is why delay loops (Part 5) and interrupt routines (Part 10) keep their variables there. The free registers (GPR) are: $96$ in bank 0 from $20_{16}$, $80$ in bank 1 from $A0_{16}$, $96$ in bank 2 from $110_{16}$ and $96$ in bank 3 from $190_{16}$, in total $96 + 80 + 96 + 96 = 368$ bytes.</p>`),
        D.multi('Bank 2', R`<p>Which values must RP1 and RP0 have to access bank $2$?</p>`, [{ label: 'RP1 =', ans: [1] }, { label: 'RP0 =', ans: [0] }], R`Bank $2 = 10_{2}$: RP1 $= 1$ and RP0 $= 0$.`, { hint: 'Write the bank number in binary with two bits: RP1 RP0.' }),
        D.num('Address lines of the RAM', R`<p>How many address lines are needed to access the $512$ bytes of the RAM?</p>`, 9, R`$2^{9} = 512$.`, { hint: R`Find $n$ with $2^{n} = 512$.` }),
        D.num('Bits for the address', R`<p>How many bits of a file-register instruction hold the address of the register?</p>`, 7, R`$7$ bits, so an instruction reaches $2^{7} = 128$ registers: one bank.`, { hint: '14 bits = 6 (operation) + 1 (destination) + ...' }),
        D.mc('RP0 and RP1', 'Which bits of which register select the RAM bank?', ['Bits 5 (RP0) and 6 (RP1) of STATUS', 'Bits 0 and 1 of STATUS', 'Bits 5 and 6 of INTCON', 'The two highest bits of W'], 0, 'RP0 is bit 5 and RP1 is bit 6 of STATUS, which is present in every bank.', { hint: 'The flags Z, DC and C are bits 2, 1 and 0 of the same register.' }),
        D.num('Free RAM', R`<p>How many general purpose registers (bytes free for variables) does the PIC16F887 have in total?</p>`, 368, R`$96 + 80 + 96 + 96 = 368$ bytes.`, { hint: 'Add the free registers of the four banks.' }),
        D.mc('Wrong bank', 'The program is in bank 0 and executes <code>MOVLW 0</code> and <code>MOVWF TRISD</code>. What happens?', ['The 0 is written into PORTD (address 08h) and TRISD does not change', 'TRISD becomes 0', 'The assembler refuses the program', 'Both PORTD and TRISD become 0'], 0, R`Only the lowest $7$ bits of the address are in the instruction; in bank $0$ the bits $000\,1000_{2}$ select PORTD.`, { hint: 'Which register of bank 0 has the same lowest 7 bits as TRISD?' }),
        D.asm('Fix the missing bank', R`<p>This program should make PORTD an output port (TRISD $= 0$) and then put <code>0xAA</code> on it, but the pins stay inputs. Fix it by selecting the right bank before TRISD and returning to bank $0$ afterwards.</p>`, {
          start: '    MOVLW 0\n    MOVWF TRISD\n    MOVLW 0xAA\n    MOVWF PORTD\n    GOTO $\n',
          tests: [{ expect: { TRISD: 0, 'OUT.D': 0xAA, BANK: 0 } }], solution: '    BSF STATUS, 5\n    MOVLW 0\n    MOVWF TRISD\n    BCF STATUS, 5\n    MOVLW 0xAA\n    MOVWF PORTD\n    GOTO $\n'
        }, R`TRISD is in bank 1: set RP0 before writing it, and clear RP0 again before writing PORTD in bank 0.`, { hint: R`<code>BSF STATUS, 5</code> (RP0) before <code>MOVWF TRISD</code>, <code>BCF STATUS, 5</code> after it.` }),
        D.asm('Digital pins', R`<p>Clear <b>ANSEL</b> and <b>ANSELH</b> (both in bank 3) so that the pins of PORTA, PORTB and PORTE become digital, and finish in bank 0.</p>`, {
          start: ASTART, tests: [{ expect: { ANSEL: 0, ANSELH: 0, BANK: 0 } }], solution: '    BSF STATUS, 5\n    BSF STATUS, 6\n    CLRF ANSEL\n    CLRF ANSELH\n    BCF STATUS, 5\n    BCF STATUS, 6\n    GOTO $\n'
        }, R`Bank $3$ is RP1 $= 1$ and RP0 $= 1$; clear both bits afterwards to return to bank $0$.`, { hint: 'Set RP0 and RP1, clear the two registers, then clear RP0 and RP1.' }),
        D.asm('Use BANKSEL', R`<p>Make PORTB an output port (TRISB $= 0$) and write <code>0x3C</code> to it, using the directive <code>BANKSEL</code> to select the banks instead of setting RP0 and RP1 yourself. Finish in bank $0$.</p>`, {
          start: ASTART, tests: [{ expect: { TRISB: 0, 'OUT.B': 0x3C, BANK: 0 } }], reqs: [{ re: /\bBANKSEL\b/i, msg: 'Use BANKSEL.' }],
          solution: '    BANKSEL TRISB\n    CLRF    TRISB\n    BANKSEL PORTB\n    MOVLW   0x3C\n    MOVWF   PORTB\n    GOTO $\n'
        }, R`<code>BANKSEL TRISB</code> selects bank $1$ and <code>BANKSEL PORTB</code> bank $0$; the assembler writes the BSF and BCF instructions for you.`, { hint: R`<code>BANKSEL TRISB</code>, <code>CLRF TRISB</code>, <code>BANKSEL PORTB</code>, then write the value.` })
      ]
    },
    {
      title: 'Output pins: PORT, TRIS and ANSEL (Activity 2)',
      objectives: ['You will be able to configure a pin as an input or an output', 'You will know why some pins must be made digital with ANSEL and ANSELH', 'You will be able to write values on a port'],
      blocks: [
        D.T(R`<p>The PIC16F887 has $40$ pins; $35$ of them are input/output pins grouped in <b>ports</b>: PORTA, PORTB, PORTC and PORTD with $8$ pins each, and PORTE with $3$ pins plus RE3, which can only be an input (it is shared with the reset pin MCLR). The pins are named after their port and bit: RD0 is bit 0 of PORTD.</p>
<p>The ports are <b>mapped</b> in the RAM: each port is a register, and writing the register sets the voltage on the pins ($0 \to 0\ \mathrm{V}$, $1 \to 5\ \mathrm{V}$). A pin cannot be an input and an output at the same time, so each port also has a <b>TRIS</b> register in bank 1, which works like a sticker on each pin:</p>`),
        D.KEY('TRIS: 0 for Output, 1 for Input', R`<p>A $0$ in a bit of TRISx makes the pin an <b>output</b> (think "0 = O"), a $1$ makes it an <b>input</b> ("1 = I"). After a reset all TRIS bits are $1$: every pin starts as an input, which is the safe choice.</p>`),
        D.T(R`<p>Some pins of PORTA, PORTB and PORTE can also be <b>analog inputs</b> for the A/D converter (Part 12). The registers <b>ANSEL</b> and <b>ANSELH</b> in bank 3 choose analog ($1$) or digital ($0$) for these pins, and after a reset they are analog. A pin that is configured as analog always reads as $0$ when it is used as a digital input, so a program that reads buttons on PORTB must first clear ANSELH.</p>
<p>The SETUP of <b>Activity 2</b> configures everything for output and the main code sends <code>1111,1111</code> to every port:</p>`),
        D.CODE(R`SETUP:              ; by default in BANK0
    CLRF    PORTA       ; clear the ports
    CLRF    PORTB
    ; ... PORTC, PORTD, PORTE
    BSF     RP0
    BCF     RP1         ; BANK 1
    MOVLW   01100000B
    MOVWF   OSCCON      ; 4 MHz
    CLRF    TRISA       ; outputs
    ; ... TRISB to TRISE
    BSF     RP0
    BSF     RP1         ; BANK 3
    CLRF    ANSEL       ; digital
    CLRF    ANSELH
    BCF     RP0
    BCF     RP1         ; BANK 0
    RETURN`, 'asm', { cap: R`The SETUP of Activity 2. In the simulation of the lecture all the pins are high except RE3, the input-only pin.` }),
        D.H('Connecting an LED'),
        D.T(R`<p>To see a logic level, connect an LED with a resistor in series to the pin. A red LED drops about $2.2\ \mathrm{V}$ and is bright at $10\ \mathrm{mA}$. With Kirchhoff's voltage law and Ohm's law:</p>
$$V_{R} = V_{\text{pin}} - V_{\text{LED}} = 5 - 2.2 = 2.8\ \mathrm{V}, \qquad R = \frac{V_{R}}{I} = \frac{2.8\ \mathrm{V}}{10\ \mathrm{mA}} = 280\ \Omega.$$
<p>A pin of the PIC can deliver at most $20\ \mathrm{mA}$, so a device that needs more current must be driven through a transistor.</p>`),
        D.bits('TRISB for a button and an LED', R`<p>Configure TRISB so that <b>RB0 is an input</b> and <b>RB4 is an output</b>. The other bits do not matter.</p>`, { reg: 'TRISB', names: PORT_NAMES('B'), want: 'xxx0xxx1', init: '11111111', maskNote: 'Only TRISB4 and TRISB0 are checked.' }, R`Input $= 1$, output $= 0$: TRISB0 $= 1$ and TRISB4 $= 0$.`, { hint: '1 = Input, 0 = Output.' }),
        D.num('Resistor for a bright LED', R`<p>An ultra-bright LED needs $3\ \mathrm{V}$ and $30\ \mathrm{mA}$. Which series resistor would it need on a $5\ \mathrm{V}$ pin, in ohms? (Then think whether the pin can deliver $30\ \mathrm{mA}$.)</p>`, 66.67, R`$R = \frac{5 - 3}{0.03} \approx 66.7\ \Omega$. But $30\ \mathrm{mA}$ is more than the $20\ \mathrm{mA}$ a pin can give: this LED needs a transistor.`, { tol: 0.5, unit: 'Ω', unitAlt: ['ohm', 'ohms', 'Ω'], hint: R`$R = \frac{V_{\text{pin}} - V_{\text{LED}}}{I}$ with $I = 0.03\ \mathrm{A}$.` }),
        D.mc('Reading an analog pin', 'A push button is connected to RB0 (configured as an input) but the program always reads RB0 $= 0$, even when the button is pressed. What is the most likely reason?', ['ANSELH was not cleared, so RB0 is still an analog pin and reads as 0', 'TRISB0 is 1', 'The LED is missing', 'RB0 can only be an output'], 0, 'After a reset the analog-capable pins are analog; clear ANSEL/ANSELH to use them as digital inputs.', { hint: 'Which register selects analog or digital?' }),
        D.num('Output pins', R`<p>How many pins of the PIC16F887 can be used as outputs?</p>`, 34, R`$35$ I/O pins, but RE3 is input-only: $35 - 1 = 34$.`, { hint: 'One I/O pin can only be an input.' }),
        D.multi('TRIS for inputs', R`<p>What must be written into a TRIS register to make the whole port <b>inputs</b>, and to make only its four lowest pins outputs? (binary, $8$ bits)</p>`, [{ label: 'All inputs:', ans: ['11111111'], kind: 'bin', exact: true, width: 10 }, { label: 'Pins 0 to 3 outputs:', ans: ['11110000'], kind: 'bin', exact: true, width: 10 }], R`$1$ for input, $0$ for output: all inputs is $1111\,1111_{2}$; the four lowest pins as outputs is $1111\,0000_{2}$.`, { hint: '1 = Input, 0 = Output.' }),
        D.asm('Activity 2', R`<p>Write the complete program of Activity 2 without the configuration lines: a SETUP subroutine that clears the ports, selects the $4\ \mathrm{MHz}$ oscillator, makes all ports outputs and all pins digital, and a main code that writes <code>11111111B</code> to all five ports and stops.</p>`, {
          start: '    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    RETFIE\n\nMAIN:\n    CALL SETUP\n    ; write 11111111B to all ports\n\n    GOTO $\n\nSETUP:\n    ; clear the ports, OSCCON, TRIS, ANSEL\n\n    RETURN\n',
          tests: [{ expect: { 'OUT.A': 255, 'OUT.B': 255, 'OUT.C': 255, 'OUT.D': 255, 'OUT.E': 7, OSCCON: 0x60, ANSEL: 0, ANSELH: 0, BANK: 0 } }],
          solution: '    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    RETFIE\n\nMAIN:\n    CALL SETUP\n    MOVLW 11111111B\n    MOVWF PORTA\n    MOVWF PORTB\n    MOVWF PORTC\n    MOVWF PORTD\n    MOVWF PORTE\n    GOTO $\n\nSETUP:\n    CLRF PORTA\n    CLRF PORTB\n    CLRF PORTC\n    CLRF PORTD\n    CLRF PORTE\n    BSF RP0\n    BCF RP1\n    MOVLW 01100000B\n    MOVWF OSCCON\n    CLRF TRISA\n    CLRF TRISB\n    CLRF TRISC\n    CLRF TRISD\n    CLRF TRISE\n    BSF RP0\n    BSF RP1\n    CLRF ANSEL\n    CLRF ANSELH\n    BCF RP0\n    BCF RP1\n    RETURN\n'
        }, 'The TRIS registers and OSCCON are in bank 1, ANSEL and ANSELH in bank 3; the ports are written from bank 0.', { hint: ['Follow the SETUP shown above: bank 1 for OSCCON and TRIS, bank 3 for ANSEL and ANSELH, then back to bank 0.', 'In MAIN: MOVLW 11111111B, then MOVWF to each port.'] }),
        D.asm('Mixed directions', R`<p>On PORTD, RD0 to RD3 drive four LEDs and RD4 to RD7 are inputs. Configure TRISD accordingly and light the LEDs on RD0 and RD2 (the other two LEDs off). Finish in bank $0$.</p>`, {
          start: ASTART, tests: [{ expect: { TRISD: 0xF0, 'OUT.D': 0x05, BANK: 0 } }],
          solution: '    BANKSEL TRISD\n    MOVLW   11110000B   ; RD4-RD7 inputs, RD0-RD3 outputs\n    MOVWF   TRISD\n    BANKSEL PORTD\n    MOVLW   00000101B   ; LEDs on RD0 and RD2\n    MOVWF   PORTD\n    GOTO $\n'
        }, R`TRISD $= 1111\,0000_{2}$ makes the low nibble outputs; then <code>00000101B</code> lights RD0 and RD2.`, { hint: R`TRISD gets $1$ for every input and $0$ for every output.` })
      ]
    },
    {
      title: 'Reading push buttons (Activities 3 to 5)',
      objectives: ['You will know why an input pin needs a pull-up or pull-down resistor', 'You will be able to wait for a button with BTFSS and BTFSC', 'You will be able to handle active-high and active-low buttons'],
      blocks: [
        D.T(R`<p>A push button sends a command to the program. A <b>normally open</b> (NO) button closes the circuit when pressed; a normally closed (NC) one opens it. The PIC reads the pin as logic $0$ or $1$.</p>
<p>When the button is open, the pin is connected to nothing: it is <b>floating</b>. An input has a very high resistance, about $10\ \mathrm{M}\Omega$, so even a noise current of $1\ \mu\mathrm{A}$ produces $V = R\,I = 10 \times 10^{6} \times 1 \times 10^{-6} = 10\ \mathrm{V}$ and the pin may read $1$ as if the button were pressed. An input must never float: a resistor <b>pulls</b> it to a known level. A button to $5\ \mathrm{V}$ needs a <b>pull-down</b> resistor to ground (the button is <b>active high</b>: pressed $= 1$); a button to ground needs a <b>pull-up</b> resistor to $5\ \mathrm{V}$ (the button is <b>active low</b>: pressed $= 0$). Values between $1\ \mathrm{k}\Omega$ and $47\ \mathrm{k}\Omega$ are good: much smaller values waste current at every press.</p>`),
        D.H('Activity 3: wait for the button'),
        D.T(R`<p>In Activity 3 an LED is connected to RD0 (output) and an active-high button to RD1 (input), so TRISD $= 0000\,0010_{2}$. The main code waits until the button is pressed, then switches the LED on:</p>`),
        D.CODE(R`  #define LED RD0
  #define PB  RD1

REPEAT:
    BTFSS   PB          ; test if PB is pressed
    GOTO    $-1         ; no, recheck
    BSF     LED         ; yes, turn on LED
    GOTO    REPEAT      ; repeat code`, 'asm'),
        D.T(R`<p><code>BTFSS PB</code> skips the next instruction when RD1 is $1$. While the button is not pressed, <code>GOTO $-1</code> jumps back to the test: the program waits in a two-instruction loop. The <code>#define</code> lines give the pins meaningful names; the assembler replaces <code>PB</code> by <code>RD1</code> before assembling.</p>
<p><b>Activity 4</b> also switches the LED off when the button is released: after <code>BSF LED</code> a second waiting loop with <code>BTFSC PB</code> waits for RD1 $= 0$, then <code>BCF LED</code>. <b>Activity 5</b> uses two buttons, PB_ON on RD1 and PB_OFF on RD2 (TRISD $= 0000\,0110_{2}$).</p>`),
        D.mc('Floating input', 'Why must an input pin never be left floating?', ['Noise can produce enough voltage on the high-resistance input to read a false 1', 'The pin would burn', 'The PIC would reset', 'It would become an output'], 0, R`With about $10\ \mathrm{M}\Omega$ of input resistance, a tiny noise current gives a large voltage.`, { hint: R`$V = R \times I$ with a very large $R$.` }),
        D.match('Pull resistors', 'Match each button wiring with its resistor and its logic.', [['Button connected to 5 V', 'Pull-down resistor, active high (pressed = 1)'], ['Button connected to ground', 'Pull-up resistor, active low (pressed = 0)']], 'The resistor pulls the pin to the level opposite to the one the button gives.', { hint: 'The resistor holds the pin while the button is open.' }),
        D.num('A tiny pull-down resistor', R`<p>An active-high button with a $1\ \Omega$ pull-down resistor is pressed ($5\ \mathrm{V}$ supply). What current flows in the resistor, in amperes?</p>`, 5, R`$I = \frac{V}{R} = \frac{5\ \mathrm{V}}{1\ \Omega} = 5\ \mathrm{A}$: far too much. That is why the pull resistor must not be small.`, { unit: 'A', hint: 'Ohm\'s law.' }),
        D.asm('Activity 3', R`<p>Write the main code of Activity 3: wait until the button is pressed, then turn the LED on. The <code>#define</code> lines and the SETUP subroutine are already written for you. Press Run to see the simulator with the button pressed (RD1 $= 1$).</p>`, {
          pre: A3, start: 'MAIN:\n    CALL SETUP\nREPEAT:\n    ; test the push button and turn the LED on\n',
          tests: [{ name: 'Button pressed', init: { pins: { D: 2 } }, maxSteps: 80, limitOk: true, expect: { 'OUT.D': 1 } }, { name: 'Button not pressed', init: { pins: { D: 0 } }, maxSteps: 80, limitOk: true, expect: { 'OUT.D': 0 } }],
          solution: 'MAIN:\n    CALL SETUP\nREPEAT:\n    BTFSS PB\n    GOTO $-1\n    BSF LED\n    GOTO REPEAT'
        }, R`<code>BTFSS PB</code> / <code>GOTO $-1</code> waits for RD1 $= 1$; then <code>BSF LED</code> switches the LED on.`, { hint: 'Copy the main loop shown above.' }),
        D.asm('Activity 4', R`<p>Write the main code of Activity 4: the LED (RD0) is ON while the push button (RD1) is pressed and OFF after it is released. The simulator presses the button and releases it again.</p>`, {
          pre: A3, start: 'MAIN:\n    CALL SETUP\nREPEAT:\n    ; LED on when pressed, off when released\n',
          tests: [{ name: 'Press then release', init: { pins: { D: 0 } }, events: [{ step: 40, pins: { D: 2 } }, { step: 90, pins: { D: 0 } }], maxSteps: 160, limitOk: true, at: [{ step: 35, expect: { 'OUT.D': 0 }, label: 'before the press' }, { step: 80, expect: { 'OUT.D': 1 }, label: 'while pressed' }, { step: 150, expect: { 'OUT.D': 0 }, label: 'after the release' }] }],
          solution: 'MAIN:\n    CALL SETUP\nREPEAT:\n    BTFSS PB\n    GOTO $-1\n    BSF LED\n    BTFSC PB\n    GOTO $-1\n    BCF LED\n    GOTO REPEAT'
        }, 'Wait for the press (BTFSS), LED on, wait for the release (BTFSC), LED off.', { hint: 'The two waiting loops use BTFSS and BTFSC.' }),
        D.asm('Activity 5', R`<p>Write the main code of Activity 5: <code>PB_ON</code> (RD1) turns the LED on and it stays on until <code>PB_OFF</code> (RD2) is pressed.</p>`, {
          pre: A5, start: 'MAIN:\n    CALL SETUP\nREPEAT:\n    ; wait for PB_ON, LED on, wait for PB_OFF, LED off\n',
          tests: [{ name: 'ON then OFF', init: { pins: { D: 0 } }, events: [{ step: 40, pins: { D: 2 } }, { step: 70, pins: { D: 0 } }, { step: 100, pins: { D: 4 } }, { step: 130, pins: { D: 0 } }], maxSteps: 200, limitOk: true, at: [{ step: 35, expect: { 'OUT.D': 0 }, label: 'before any press' }, { step: 90, expect: { 'OUT.D': 1 }, label: 'after PB_ON was released' }, { step: 190, expect: { 'OUT.D': 0 }, label: 'after PB_OFF' }] }],
          solution: 'MAIN:\n    CALL SETUP\nREPEAT:\n    BTFSS PB_ON\n    GOTO $-1\n    BSF LED\n    BTFSS PB_OFF\n    GOTO $-1\n    BCF LED\n    GOTO REPEAT'
        }, 'Both buttons are active high, so both waits use BTFSS.', { hint: 'Both waits use BTFSS, with different button names.' }),
        D.asm('An active-low button', R`<p>Now the button on RD1 is connected to ground with a pull-up resistor: it reads $0$ when it is pressed (active low). Write the main code so that the LED on RD0 is ON while the button is pressed and OFF after it is released.</p>`, {
          pre: A3, start: 'MAIN:\n    CALL SETUP\nREPEAT:\n    ; active low: pressed = 0\n',
          tests: [{ name: 'Press then release', init: { pins: { D: 2 } }, events: [{ step: 40, pins: { D: 0 } }, { step: 90, pins: { D: 2 } }], maxSteps: 160, limitOk: true, at: [{ step: 35, expect: { 'OUT.D': 0 }, label: 'before the press' }, { step: 80, expect: { 'OUT.D': 1 }, label: 'while pressed' }, { step: 150, expect: { 'OUT.D': 0 }, label: 'after the release' }] }],
          solution: 'MAIN:\n    CALL SETUP\nREPEAT:\n    BTFSC PB        ; pressed = 0\n    GOTO $-1\n    BSF LED\n    BTFSS PB        ; released = 1\n    GOTO $-1\n    BCF LED\n    GOTO REPEAT'
        }, R`The logic of Activity 4 is inverted: wait with <code>BTFSC PB</code> until the pin is $0$ (pressed), then with <code>BTFSS PB</code> until it is $1$ again.`, { hint: 'Exchange BTFSS and BTFSC in the code of Activity 4.' }),
        D.asm('Copy the switches', R`<p>Four switches are connected to RD0–RD3 (inputs) and four LEDs to RC0–RC3. Make PORTC an output port, then copy the four switches to the four LEDs again and again in an endless loop. The four high bits of PORTC must stay $0$.</p>`, {
          start: '    ; make PORTC an output port\n\nLOOP:\n    ; copy RD0-RD3 to RC0-RC3\n\n    GOTO LOOP\n',
          tests: [{ name: 'switches 1010', init: { pins: { D: 0b1010 } }, maxSteps: 300, limitOk: true, expect: { 'OUT.C': 0b1010, TRISC: 0 } }, { name: 'switches change to 0111', init: { pins: { D: 0xF0 } }, events: [{ step: 100, pins: { D: 0b10110111 } }], maxSteps: 300, limitOk: true, expect: { 'OUT.C': 0b0111 } }],
          solution: '    BANKSEL TRISC\n    CLRF    TRISC\n    BANKSEL PORTC\nLOOP:\n    MOVF    PORTD, W\n    ANDLW   00001111B   ; keep the four switches\n    MOVWF   PORTC\n    GOTO LOOP\n'
        }, R`PORTD is an input port after reset (TRISD is all ones). The mask clears the high bits, and the endless loop keeps copying, so the LEDs follow the switches.`, { hint: [R`<code>BANKSEL TRISC</code>, <code>CLRF TRISC</code>, <code>BANKSEL PORTC</code>.`, R`In the loop: <code>MOVF PORTD, W</code>, <code>ANDLW 00001111B</code>, <code>MOVWF PORTC</code>.`] })
      ]
    },
    {
      title: 'Bit operations on ports',
      objectives: ['You will be able to set, clear, toggle and test a single pin', 'You will be able to change a group of pins without disturbing the others', 'You will know the read-modify-write behaviour of the bit instructions'],
      blocks: [
        D.T(R`<p>Each pin is one bit of its port register, so the bit instructions of Part 4 work directly on pins:</p>`),
        D.TABLE(['Task', 'Instruction(s)', 'Example'], [
          ['set one pin', '<code>BSF f, b</code>', '<code>BSF PORTD, 3</code> sets RD3'],
          ['clear one pin', '<code>BCF f, b</code>', '<code>BCF PORTD, 3</code> clears RD3'],
          ['toggle pins', '<code>MOVLW</code> mask, <code>XORWF f, F</code>', R`mask $0000\,1001_{2}$ toggles RD3 and RD0`],
          ['test one pin', '<code>BTFSS f, b</code> / <code>BTFSC f, b</code>', '<code>BTFSS PORTB, 0</code> skips if RB0 is high'],
          ['set a group', '<code>MOVLW</code> mask, <code>IORWF f, F</code>', R`mask $1111\,0000_{2}$ sets RD4 to RD7`],
          ['clear a group', '<code>MOVLW</code> mask, <code>ANDWF f, F</code>', R`mask $1111\,0000_{2}$ clears RD0 to RD3`]
        ]),
        D.T(R`<p>Activity 10 toggles RD0 with exactly this pattern: <code>MOVLW 00000001B</code> and <code>XORWF PORTD, F</code>. To write a value into only part of a port, clear the group with an AND mask and then OR in the new bits; the other pins keep their values.</p>`),
        D.WARN('Read-modify-write', R`<p><code>BSF</code>, <code>BCF</code> and <code>XORWF PORTD, F</code> do not change just one bit: the processor <b>reads</b> the whole port, <b>modifies</b> the bit and <b>writes</b> the whole byte back. For output pins this is harmless. A pin that is an input is read from the outside world, so its value is written into the output latch; if that pin later becomes an output, it starts with that value. Clear or set the port with <code>CLRF</code> or <code>MOVWF</code> in SETUP to start from a known state.</p>`),
        D.mc('Set one pin', 'Which instruction switches on the LED on RD3 without changing the other pins of PORTD?', ['<code>BSF PORTD, 3</code>', '<code>MOVLW 3</code> then <code>MOVWF PORTD</code>', '<code>BSF PORTD, 8</code>', '<code>IORLW 3</code>'], 0, R`<code>BSF PORTD, 3</code> sets only bit 3. <code>MOVWF PORTD</code> with $3$ would write $0000\,0011_{2}$ to all eight pins.`, { hint: 'One instruction changes one bit.' }),
        D.num('Toggle mask', R`<p>Which mask (decimal) must be XORed with PORTD to toggle RD2 and RD5 at the same time?</p>`, 36, R`Bits $2$ and $5$: $0010\,0100_{2} = 32 + 4 = 36$.`, { hint: 'Put a 1 at bit 2 and at bit 5.' }),
        D.trace('Bits of a register', R`<p>REG1 $= 0101\,0101_{2} = 85$ at the start. Follow REG1 and W.</p>`, { pre: 'REG1 EQU 0x20', init: { REG1: 85 }, code: 'BSF REG1, 1\nBCF REG1, 6\nMOVLW 0x0F\nXORWF REG1, F\nBTFSC REG1, 7\nCLRF REG1\nMOVLW 0xF0\nIORWF REG1, F', watch: ['W', 'REG1'] }, R`BSF bit 1: $0101\,0111_{2} = 87$. BCF bit 6: $0001\,0111_{2} = 23$. XOR with $0F_{16}$ toggles the low nibble: $0001\,1000_{2} = 24$. Bit 7 is $0$, so <code>CLRF</code> is skipped. OR with $F0_{16}$ sets the high nibble: $1111\,1000_{2} = 248$.`, { hint: 'Work in binary; BTFSC skips when the bit is 0.', note: R`Start: REG1 $= 0101\,0101_{2}$.` }),
        D.asm('Make RC0 an output', R`<p>Make only the pin RC0 an output (TRISC0 $= 0$) without changing the other bits of TRISC, using a bit instruction, and then set RC0 to $1$. Finish in bank 0.</p>`, {
          start: ASTART, tests: [{ expect: { TRISC: 0xFE, 'OUT.C': 1, BANK: 0 } }],
          solution: '    BSF STATUS, 5\n    BCF TRISC, 0\n    BCF STATUS, 5\n    BSF PORTC, 0\n    GOTO $\n'
        }, 'BCF TRISC, 0 clears only bit 0; the other pins stay inputs.', { hint: 'BCF works on one bit only. Remember the bank of TRISC.' }),
        D.asm('Toggle six times', R`<p>Make RD0 an output, then toggle it $6$ times with <code>MOVLW 00000001B</code> and <code>XORWF PORTD, F</code>, using a counter and <code>DECFSZ</code>. Between two toggles wait with a short loop (any length). Then stop with <code>GOTO $</code>. The test counts the edges on RD0.</p>`, {
          start: 'COUNT EQU 0x70\nWAIT  EQU 0x71\n\n; write your code here\n\n    GOTO $\n',
          tests: [{ expect: { 'EDGES.D0': 6, TRISD0: 0, BANK: 0 } }],
          reqs: [{ re: /\bXORWF\b/i, msg: 'Toggle with XORWF.' }, { re: /\bDECFSZ\b/i, msg: 'Count with DECFSZ.' }],
          solution: 'COUNT EQU 0x70\nWAIT  EQU 0x71\n\n    BANKSEL TRISD\n    BCF     TRISD, 0    ; RD0 output\n    BANKSEL PORTD\n    CLRF    PORTD\n    MOVLW   6\n    MOVWF   COUNT\nAGAIN:\n    MOVLW   00000001B\n    XORWF   PORTD, F    ; toggle RD0\n    MOVLW   50\n    MOVWF   WAIT\n    DECFSZ  WAIT, F     ; short wait\n    GOTO    $-1\n    DECFSZ  COUNT, F\n    GOTO    AGAIN\n    GOTO $\n'
        }, R`A counter of $6$ repeats the toggle; each toggle is one edge on RD0 (rising, falling, rising...). The inner DECFSZ loop only spaces the edges out.`, { hint: [R`Make RD0 an output (bank 1), go back to bank 0 and clear PORTD.`, R`Loop: <code>MOVLW 00000001B</code>, <code>XORWF PORTD, F</code>, a short wait, <code>DECFSZ COUNT, F</code>, <code>GOTO</code> back.`] }),
        D.asm('Write the high nibble', R`<p>LEDs on RD4–RD7 must show the value of NIBBLE ($0 \ldots 15$, RD4 is its bit 0), while RD0–RD3 are used by another device and <b>must keep their values</b>. PORTD is already an output port holding some value. Use SWAPF, an AND mask and an OR.</p>`, {
          start: 'NIBBLE EQU 0x20\nTEMP   EQU 0x21\n\n    BANKSEL TRISD\n    CLRF    TRISD\n    BANKSEL PORTD\n    ; write NIBBLE on RD4-RD7, keep RD0-RD3\n\n    GOTO $\n',
          tests: [[9, 0x05], [15, 0x0A], [0, 0x0F], [6, 0x00]].map(([n, low]) => ({ name: R`$\text{NIBBLE} = ` + n + R`$, low pins $` + H.b4(low) + R`_{2}$`, init: { NIBBLE: n, PORTD: 0x30 | low }, expect: { 'OUT.D': (n << 4) | low } })),
          reqs: [{ re: /\bSWAPF\b/i, msg: 'Use SWAPF to move NIBBLE to the high nibble.' }],
          solution: 'NIBBLE EQU 0x20\nTEMP   EQU 0x21\n\n    BANKSEL TRISD\n    CLRF    TRISD\n    BANKSEL PORTD\n    SWAPF   NIBBLE, W   ; value in the high nibble\n    ANDLW   0xF0\n    MOVWF   TEMP\n    MOVF    PORTD, W\n    ANDLW   0x0F        ; keep RD0-RD3\n    IORWF   TEMP, W     ; add the new high nibble\n    MOVWF   PORTD\n    GOTO $\n'
        }, R`<code>SWAPF NIBBLE, W</code> moves the value to bits 4 to 7; the AND masks keep only the wanted part of each byte, and the OR combines them before one write to PORTD.`, { hint: [R`<code>SWAPF NIBBLE, W</code>, <code>ANDLW 0xF0</code>, store in TEMP.`, R`<code>MOVF PORTD, W</code>, <code>ANDLW 0x0F</code>, <code>IORWF TEMP, W</code>, <code>MOVWF PORTD</code>.`] })
      ]
    },
{
      title: 'Challenge: three buttons and a counter',
      objectives: ['You will detect the moment a button is pressed by comparing the port with its previous value'],
      blocks: [
        D.T(R`<p>Activity 4 waits for a press, then for the release. With several buttons that no longer works: while the program waits for one button, it misses the others. The usual solution is <b>edge detection</b>. Read the whole port in every round, and compare it with the value of the previous round:</p>
$$\text{pressed now} = \text{NOW AND NOT OLD}.$$
<p>A bit is $1$ only in the round in which that button went from released to pressed, so a button held down for a long time counts only once. Then copy NOW into OLD for the next round.</p>`),
        D.asm('Three buttons and a counter', R`<p>Three active-high buttons are connected to RB1, RB2 and RB3, and eight LEDs to PORTD, which shows COUNT. Each <b>press</b> (not each round while held) of RB1 adds $1$ to COUNT, of RB2 subtracts $1$ (but never below $0$), and of RB3 resets COUNT to $0$. Configure the pins yourself: PORTD outputs, and the PORTB pins digital (they are analog after a reset). Then loop forever.</p>`, {
          start: 'COUNT EQU 0x20\nOLD   EQU 0x21\nNOW   EQU 0x22\nEDGES EQU 0x23\n\n; configure the pins, then loop forever\n\nLOOP:\n\n    GOTO LOOP\n',
          tests: [
            { name: 'Three presses of RB1, held down', events: [[100, 2], [180, 0], [260, 2], [340, 0], [420, 2], [500, 0]].map(([s, v]) => ({ step: s, pins: { B: v } })), maxSteps: 700, limitOk: true, expect: { COUNT: 3, 'OUT.D': 3 } },
            { name: 'Up three times, down once', events: [[100, 2], [140, 0], [200, 2], [240, 0], [300, 2], [340, 0], [400, 4], [480, 0]].map(([s, v]) => ({ step: s, pins: { B: v } })), maxSteps: 700, limitOk: true, expect: { COUNT: 2, 'OUT.D': 2 } },
            { name: 'Down at zero, up twice, reset, up', events: [[100, 4], [140, 0], [200, 2], [240, 0], [300, 2], [340, 0], [400, 8], [440, 0], [500, 2], [540, 0]].map(([s, v]) => ({ step: s, pins: { B: v } })), maxSteps: 800, limitOk: true, expect: { COUNT: 1, 'OUT.D': 1 } }],
          solution: 'COUNT EQU 0x20\nOLD   EQU 0x21\nNOW   EQU 0x22\nEDGES EQU 0x23\n\n    BANKSEL ANSELH\n    CLRF    ANSELH        ; PORTB digital\n    BANKSEL TRISD\n    CLRF    TRISD         ; PORTD outputs\n    BANKSEL PORTD\n    CLRF    COUNT\n    CLRF    OLD\nLOOP:\n    MOVF    PORTB, W\n    MOVWF   NOW\n    COMF    OLD, W        ; NOT OLD\n    ANDWF   NOW, W        ; buttons pressed in this round\n    MOVWF   EDGES\n    MOVF    NOW, W\n    MOVWF   OLD           ; remember for the next round\n    BTFSC   EDGES, 1      ; RB1: plus one\n    INCF    COUNT, F\n    BTFSS   EDGES, 2      ; RB2: minus one, not below 0\n    GOTO    NO_DOWN\n    MOVF    COUNT, F\n    BTFSS   STATUS, 2\n    DECF    COUNT, F\nNO_DOWN:\n    BTFSC   EDGES, 3      ; RB3: reset\n    CLRF    COUNT\n    MOVF    COUNT, W\n    MOVWF   PORTD\n    GOTO    LOOP\n'
        }, R`$\text{NOW AND NOT OLD}$ has a $1$ only for a button that is pressed now and was released in the previous round, so holding a button counts once. <code>MOVF COUNT, F</code> tests COUNT for zero before the decrement.`, { challenge: true, hint: [R`Clear ANSELH (bank 3) and TRISD (bank 1) first, then go back to bank 0.`, R`In the loop: NOW $=$ PORTB; EDGES $=$ NOW AND NOT OLD (<code>COMF OLD, W</code> then <code>ANDWF NOW, W</code>); OLD $=$ NOW; then test the bits 1, 2 and 3 of EDGES.`] })
      ]
    }
  ]
});
})();
