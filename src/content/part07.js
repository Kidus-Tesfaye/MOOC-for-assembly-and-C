/* Part 7 - Bits and registers: input and output (Lecture 5 RAM banks, Lecture 6 ports and Activity 2, Lecture 7 buttons and Activities 3-5C) */
(function () {
const b8 = H.b8;
const ASTART = '; write your code here\n\n    GOTO $\n';
const pre = (tris, defs) => defs + '\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    RETFIE\n\nSETUP:                 ; by default we are in BANK0\n    CLRF  PORTD        ; clear port at the beginning\n    BSF   RP0          ; RP1 IS BY DEFAULT 0\n    MOVLW 01100000B    ; configuring OSCCON\n    MOVWF OSCCON       ; register to select 4Mhz oscillator\n    MOVLW ' + tris + '\n    MOVWF TRISD\n    BCF   RP0          ; access to BANK 0\n    RETURN\n';
const A3 = pre('00000010B', '#define LED RD0\n#define PB  RD1\n');
const A5 = pre('00000110B', '#define LED     RD0\n#define PB_ON   RD1\n#define PB_OFF  RD2\n');
const PORT_NAMES = (p) => [7, 6, 5, 4, 3, 2, 1, 0].map(i => 'TRIS' + p + i);
D.part({
  title: 'Bits and registers: input and output',
  intro: R`<p>A microcontroller program talks to the outside world through its pins, and every pin is controlled by a bit of a register. In this part you learn how the RAM is organised in banks, how to configure a pin as an input or an output, how to read push buttons, and how to set, clear, toggle and test single bits in C and in assembly.</p>`,
  sections: [
    {
      title: 'The RAM banks',
      objectives: ['You will understand why the RAM is divided into four banks', 'You will be able to select a bank with RP1 and RP0', 'You will know which registers can be reached from every bank'],
      blocks: [
        D.T(R`<p>The instructions of the PIC16 are $14$ bits wide. An instruction that works with a register, such as <code>MOVWF f</code> or <code>ADDWF f, d</code>, uses $6$ bits for the operation, $1$ bit for the destination d and only <b>$7$ bits for the address</b> of the register:</p>
$$\underbrace{00\,0111}_{\text{ADDWF}}\;\underbrace{d}_{\text{1 bit}}\;\underbrace{fff\,ffff}_{\text{7 bits}}$$
<p>With $7$ bits the instruction can name only $2^{7} = 128$ registers, but the RAM has $512$ addresses ($0$ to $1FF_{16}$, which needs $9$ bits). The RAM is therefore divided into four <b>banks</b> of $128$ registers, and the two missing high bits of the address are taken from two bits of the STATUS register, called <b>RP1</b> and <b>RP0</b>:</p>`),
        D.TABLE(['Bank', 'RP1', 'RP0', 'Addresses'], [['0', '0', '0', R`$000_{16} \ldots 07F_{16}$`], ['1', '0', '1', R`$080_{16} \ldots 0FF_{16}$`], ['2', '1', '0', R`$100_{16} \ldots 17F_{16}$`], ['3', '1', '1', R`$180_{16} \ldots 1FF_{16}$`]], { mono: [1, 2] }),
        D.T(R`<p>Registers in the same row of the RAM map have the same lowest $7$ bits: <code>PORTD</code> is at $08_{16} = 0\,0000\,1000_{2}$, <code>TRISD</code> at $88_{16} = 0\,1000\,1000_{2}$, <code>CM2CON0</code> at $108_{16}$ and <code>ANSEL</code> at $188_{16}$. So <code>MOVWF TRISD</code> really means "register $000\,1000_{2}$ of the current bank". If the program is in bank $0$, the value goes into <b>PORTD</b>, not into TRISD! The bank must be selected first:</p>`),
        D.SIDE(R`TRISD = 0;      // the compiler
                // selects the bank`, R`    BSF     STATUS, 5   ; RP0 = 1: bank 1
    CLRF    TRISD
    BCF     STATUS, 5   ; RP0 = 0: back to bank 0`, { cap: R`RP0 is bit 5 and RP1 bit 6 of STATUS; the lecture code writes <code>BSF RP0</code> and <code>BCF RP1</code>. The pic-as directive <code>BANKSEL TRISD</code> generates the right instructions automatically.` }),
        D.T(R`<p>But STATUS itself is in the RAM: how can it be reached when the wrong bank is selected? STATUS (and a few other registers such as INTCON and PCL) appears at the same place in all four banks. The $16$ registers $70_{16} \ldots 7F_{16}$ are also shared by all banks: this is why the XC8 compiler puts the counters of its delay loops there. The free registers (GPR) are: $96$ in bank 0 from $20_{16}$, $80$ in bank 1 from $A0_{16}$, $96$ in bank 2 from $110_{16}$ and $96$ in bank 3 from $190_{16}$, in total $96 + 80 + 96 + 96 = 368$ bytes.</p>`),
        D.multi('Bank 2', R`<p>Which values must RP1 and RP0 have to access bank $2$?</p>`, [{ label: 'RP1 =', ans: [1] }, { label: 'RP0 =', ans: [0] }], R`Bank $2 = 10_{2}$: RP1 $= 1$ and RP0 $= 0$.`, { hint: 'Write the bank number in binary with two bits: RP1 RP0.' }),
        D.num('Address lines of the RAM', R`<p>How many address lines are needed to access the $512$ bytes of the RAM?</p>`, 9, R`$2^{9} = 512$.`, { hint: R`Find $n$ with $2^{n} = 512$.` }),
        D.num('Bits for the address', R`<p>How many bits of a file-register instruction hold the address of the register?</p>`, 7, R`$7$ bits, so an instruction reaches $2^{7} = 128$ registers: one bank.`, { hint: '14 bits = 6 (operation) + 1 (destination) + ...' }),
        D.mc('Wrong bank', 'The program is in bank 0 and executes <code>MOVLW 0</code> and <code>MOVWF TRISD</code>. What happens?', ['The 0 is written into PORTD (address 08h) and TRISD does not change', 'TRISD becomes 0', 'The assembler refuses the program', 'Both PORTD and TRISD become 0'], 0, R`Only the lowest $7$ bits of the address are in the instruction; in bank $0$ the bits $000\,1000_{2}$ select PORTD.`, { hint: 'Which register of bank 0 has the same lowest 7 bits as TRISD?' }),
        D.multi('Machine code', R`<p>The instruction <code>BTFSS f, b</code> is coded as $01\,11bb\,bfff\,ffff$ ($3$ bits for the bit number b, $7$ for the address f). Write the $14$-bit code of <code>BTFSS 0x3A, 5</code> in binary and in hexadecimal.</p>`, [{ label: 'Binary (14 bits):', ans: ['01111010111010'], kind: 'bin', exact: true, width: 13 }, { label: 'Hexadecimal:', ans: ['1EBA'], kind: 'hex' }], R`$b = 5 = 101_{2}$ and $f = 3A_{16} = 011\,1010_{2}$: $01\,11\,101\,0111010 = 01\,1110\,1011\,1010_{2} = 1EBA_{16}$.`, { hint: [R`Write $5$ with $3$ bits and $3A_{16}$ with $7$ bits.`, R`Group the $14$ bits in nibbles from the right to get the hexadecimal digits.`] }),
        D.asm('Fix the missing bank', R`<p>This program should make PORTD an output port (TRISD $= 0$) and then put <code>0xAA</code> on it, but the pins stay inputs. Fix it by selecting the right bank before TRISD and returning to bank $0$ afterwards.</p>`, {
          start: '    MOVLW 0\n    MOVWF TRISD\n    MOVLW 0xAA\n    MOVWF PORTD\n    GOTO $\n',
          tests: [{ expect: { TRISD: 0, 'OUT.D': 0xAA, BANK: 0 } }], solution: '    BSF STATUS, 5\n    MOVLW 0\n    MOVWF TRISD\n    BCF STATUS, 5\n    MOVLW 0xAA\n    MOVWF PORTD\n    GOTO $\n'
        }, R`TRISD is in bank 1: set RP0 before writing it, and clear RP0 again before writing PORTD in bank 0.`, { hint: R`<code>BSF STATUS, 5</code> (RP0) before <code>MOVWF TRISD</code>, <code>BCF STATUS, 5</code> after it.` }),
        D.asm('Digital pins', R`<p>Clear <b>ANSEL</b> and <b>ANSELH</b> (both in bank 3) so that the pins of PORTA, PORTB and PORTE become digital, and finish in bank 0.</p>`, {
          start: ASTART, tests: [{ expect: { ANSEL: 0, ANSELH: 0, BANK: 0 } }], solution: '    BSF STATUS, 5\n    BSF STATUS, 6\n    CLRF ANSEL\n    CLRF ANSELH\n    BCF STATUS, 5\n    BCF STATUS, 6\n    GOTO $\n'
        }, R`Bank $3$ is RP1 $= 1$ and RP0 $= 1$; clear both bits afterwards to return to bank $0$.`, { hint: 'Set RP0 and RP1, clear the two registers, then clear RP0 and RP1.' })
      ]
    },
    {
      title: 'Output pins: PORT, TRIS and ANSEL (Activity 2)',
      objectives: ['You will be able to configure a pin as an input or an output', 'You will know why some pins must be made digital with ANSEL and ANSELH', 'You will be able to write values on a port in C and in assembly'],
      blocks: [
        D.T(R`<p>The PIC16F887 has $40$ pins; $35$ of them are input/output pins grouped in <b>ports</b>: PORTA, PORTB, PORTC and PORTD with $8$ pins each, and PORTE with $3$ pins plus RE3, which can only be an input (it is shared with the reset pin MCLR). The pins are named after their port and bit: RD0 is bit 0 of PORTD.</p>
<p>The ports are <b>mapped</b> in the RAM: each port is a register, and writing the register sets the voltage on the pins ($0 \to 0\ \mathrm{V}$, $1 \to 5\ \mathrm{V}$). A pin cannot be an input and an output at the same time, so each port also has a <b>TRIS</b> register in bank 1, which works like a sticker on each pin:</p>`),
        D.KEY('TRIS: 0 for Output, 1 for Input', R`<p>A $0$ in a bit of TRISx makes the pin an <b>output</b> (think "0 = O"), a $1$ makes it an <b>input</b> ("1 = I"). After a reset all TRIS bits are $1$: every pin starts as an input, which is the safe choice.</p>`),
        D.T(R`<p>Some pins of PORTA, PORTB and PORTE can also be <b>analog inputs</b> for the A/D converter (Part 12). The registers <b>ANSEL</b> and <b>ANSELH</b> in bank 3 choose analog ($1$) or digital ($0$) for these pins, and after a reset they are analog. A pin that is configured as analog always reads as $0$ when it is used as a digital input, so a program that reads buttons on PORTB must first clear ANSELH.</p>
<p>The SETUP of <b>Activity 2</b> configures everything for output and the main code sends <code>1111,1111</code> to every port:</p>`),
        D.SIDE(R`void setup() {
    PORTA = 0; PORTB = 0; PORTC = 0;
    PORTD = 0; PORTE = 0;
    OSCCON = 0b01100000;  // 4 MHz
    TRISA = 0; TRISB = 0; TRISC = 0;
    TRISD = 0; TRISE = 0; // all outputs
    ANSEL = 0; ANSELH = 0;// all digital
}

void main(void) {
    setup();
    PORTA = 0b11111111;
    PORTB = 0b11111111;
    // ... PORTC, PORTD, PORTE
    while (1);
}`, R`SETUP:              ; by default in BANK0
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
    RETURN`, { cap: R`Activity 2 in C and in assembly. In the simulation of the lecture all the pins are high except RE3, the input-only pin.` }),
        D.H('Connecting an LED'),
        D.T(R`<p>To see a logic level, connect an LED with a resistor in series to the pin. A red LED drops about $2.2\ \mathrm{V}$ and is bright at $10\ \mathrm{mA}$. With Kirchhoff's voltage law and Ohm's law:</p>
$$V_{R} = V_{\text{pin}} - V_{\text{LED}} = 5 - 2.2 = 2.8\ \mathrm{V}, \qquad R = \frac{V_{R}}{I} = \frac{2.8\ \mathrm{V}}{10\ \mathrm{mA}} = 280\ \Omega.$$
<p>A pin of the PIC can deliver at most $20\ \mathrm{mA}$, so a device that needs more current must be driven through a transistor.</p>`),
        D.bits('TRISB for a button and an LED', R`<p>Configure TRISB so that <b>RB0 is an input</b> and <b>RB4 is an output</b>. The other bits do not matter.</p>`, { reg: 'TRISB', names: PORT_NAMES('B'), want: 'xxx0xxx1', init: '11111111', maskNote: 'Only TRISB4 and TRISB0 are checked.' }, R`Input $= 1$, output $= 0$: TRISB0 $= 1$ and TRISB4 $= 0$.`, { hint: '1 = Input, 0 = Output.' }),
        D.num('Resistor for a bright LED', R`<p>An ultra-bright LED needs $3\ \mathrm{V}$ and $30\ \mathrm{mA}$. Which series resistor would it need on a $5\ \mathrm{V}$ pin, in ohms? (Then think whether the pin can deliver $30\ \mathrm{mA}$.)</p>`, 66.67, R`$R = \frac{5 - 3}{0.03} \approx 66.7\ \Omega$. But $30\ \mathrm{mA}$ is more than the $20\ \mathrm{mA}$ a pin can give: this LED needs a transistor.`, { tol: 0.5, unit: 'Ω', unitAlt: ['ohm', 'ohms', 'Ω'], hint: R`$R = \frac{V_{\text{pin}} - V_{\text{LED}}}{I}$ with $I = 0.03\ \mathrm{A}$.` }),
        D.mc('Reading an analog pin', 'A push button is connected to RB0 (configured as an input) but the program always reads RB0 $= 0$, even when the button is pressed. What is the most likely reason?', ['ANSELH was not cleared, so RB0 is still an analog pin and reads as 0', 'TRISB0 is 1', 'The LED is missing', 'RB0 can only be an output'], 0, 'After a reset the analog-capable pins are analog; clear ANSEL/ANSELH to use them as digital inputs.', { hint: 'Which register selects analog or digital?' }),
        D.num('Output pins', R`<p>How many pins of the PIC16F887 can be used as outputs?</p>`, 34, R`$35$ I/O pins, but RE3 is input-only: $35 - 1 = 34$.`, { hint: 'One I/O pin can only be an input.' }),
        D.asm('Activity 2', R`<p>Write the complete program of Activity 2 without the configuration lines: a SETUP subroutine that clears the ports, selects the $4\ \mathrm{MHz}$ oscillator, makes all ports outputs and all pins digital, and a main code that writes <code>11111111B</code> to all five ports and stops.</p>`, {
          start: '    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    RETFIE\n\nMAIN:\n    CALL SETUP\n    ; write 11111111B to all ports\n\n    GOTO $\n\nSETUP:\n    ; clear the ports, OSCCON, TRIS, ANSEL\n\n    RETURN\n',
          tests: [{ expect: { 'OUT.A': 255, 'OUT.B': 255, 'OUT.C': 255, 'OUT.D': 255, 'OUT.E': 7, OSCCON: 0x60, ANSEL: 0, ANSELH: 0, BANK: 0 } }],
          solution: '    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    RETFIE\n\nMAIN:\n    CALL SETUP\n    MOVLW 11111111B\n    MOVWF PORTA\n    MOVWF PORTB\n    MOVWF PORTC\n    MOVWF PORTD\n    MOVWF PORTE\n    GOTO $\n\nSETUP:\n    CLRF PORTA\n    CLRF PORTB\n    CLRF PORTC\n    CLRF PORTD\n    CLRF PORTE\n    BSF RP0\n    BCF RP1\n    MOVLW 01100000B\n    MOVWF OSCCON\n    CLRF TRISA\n    CLRF TRISB\n    CLRF TRISC\n    CLRF TRISD\n    CLRF TRISE\n    BSF RP0\n    BSF RP1\n    CLRF ANSEL\n    CLRF ANSELH\n    BCF RP0\n    BCF RP1\n    RETURN\n'
        }, 'The TRIS registers and OSCCON are in bank 1, ANSEL and ANSELH in bank 3; the ports are written from bank 0.', { hint: ['Follow the SETUP shown above: bank 1 for OSCCON and TRIS, bank 3 for ANSEL and ANSELH, then back to bank 0.', 'In MAIN: MOVLW 11111111B, then MOVWF to each port.'] }),
        D.c('Activity 2 in C', R`<p>Write Activity 2 in C: configure all five ports as digital outputs, select the $4\ \mathrm{MHz}$ oscillator and write <code>0b11111111</code> to every port, then stay in an endless loop.</p>`, {
          start: R`#include <xc.h>

void setup() {

}

void main(void) {
    setup();

    while (1);
}
`, tests: [{ maxCycles: 20000, expect: { 'OUT.A': 255, 'OUT.B': 255, 'OUT.C': 255, 'OUT.D': 255, 'OUT.E': 7, OSCCON: 0x60, ANSEL: 0, ANSELH: 0 } }],
          solution: R`#include <xc.h>

void setup() {
    PORTA = 0; PORTB = 0; PORTC = 0; PORTD = 0; PORTE = 0;
    OSCCON = 0b01100000;
    TRISA = 0; TRISB = 0; TRISC = 0; TRISD = 0; TRISE = 0;
    ANSEL = 0; ANSELH = 0;
}

void main(void) {
    setup();
    PORTA = 0b11111111;
    PORTB = 0b11111111;
    PORTC = 0b11111111;
    PORTD = 0b11111111;
    PORTE = 0b11111111;
    while (1);
}
`
        }, '', { hint: 'In C there are no banks: just assign the registers by name.' })
      ]
    },
    {
      title: 'Reading push buttons',
      objectives: ['You will know why an input pin needs a pull-up or pull-down resistor', 'You will be able to wait for a button in assembly with BTFSS and BTFSC', 'You will be able to read buttons in C (Activities 3, 4, 5 and 5C)'],
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
        D.H('Buttons in C (Activity 5C)'),
        D.CODE(R`#include <xc.h>
#define led    RD0
#define pb_on  RD1
#define pb_off RD2

void setup() {
    PORTD = 0;              // clear portd
    OSCCON = 0b01100000;    // select 4MHz oscillator
    TRISD = 0b00000110;     // RD1 and RD2 inputs, the rest outputs
}

void main(void) {
    setup();
    while (1) {                     // infinite loop
        if (pb_on == 1) led = 1;    // test pb, led on if pressed
        if (pb_off == 1) led = 0;   // test pb, led off if pressed
    }
}`),
        D.T(R`<p>In C a single pin is used like a variable of one bit: <code>RD0 = 1;</code> sets it, <code>if (RD1 == 1)</code> reads it. Instead of waiting in a loop for each button, the C version checks both buttons again and again in its endless loop.</p>`),
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
        D.c('Activity 5C', R`<p>Write Activity 5C in C: in the endless loop, switch the LED on RD0 on when <code>pb_on</code> (RD1) is pressed and off when <code>pb_off</code> (RD2) is pressed. The setup is given.</p>`, {
          start: R`#include <xc.h>
#define led    RD0
#define pb_on  RD1
#define pb_off RD2

void setup() {
    PORTD = 0;
    OSCCON = 0b01100000;
    TRISD = 0b00000110;
}

void main(void) {
    setup();
    while (1) {

    }
}
`, tests: [
            { name: 'PB_ON pressed and released', maxCycles: 20000, events: [{ at: 3000, pins: { D: 2 } }, { at: 6000, pins: { D: 0 } }], expect: { RD0: 1 } },
            { name: 'then PB_OFF', maxCycles: 30000, events: [{ at: 3000, pins: { D: 2 } }, { at: 6000, pins: { D: 0 } }, { at: 12000, pins: { D: 4 } }, { at: 15000, pins: { D: 0 } }], expect: { RD0: 0 } },
            { name: 'No button', maxCycles: 10000, expect: { RD0: 0 } }],
          solution: R`#include <xc.h>
#define led    RD0
#define pb_on  RD1
#define pb_off RD2

void setup() {
    PORTD = 0;
    OSCCON = 0b01100000;
    TRISD = 0b00000110;
}

void main(void) {
    setup();
    while (1) {
        if (pb_on == 1) led = 1;
        if (pb_off == 1) led = 0;
    }
}
`
        }, '', { hint: R`Two <code>if</code> statements inside <code>while (1)</code>.` }),
        D.c('Copy the switches', R`<p>Four switches are connected to RD0–RD3 and four LEDs to RC0–RC3. Write a program that configures PORTD as input and PORTC as output, and then copies the four switches to the four LEDs continuously (the four high bits of PORTC must stay $0$).</p>`, {
          start: R`#include <xc.h>

void main(void) {

    while (1) {

    }
}
`, tests: [
            { name: 'switches 1010', maxCycles: 8000, init: { pins: { D: 0b1010 } }, expect: { 'OUT.C': 0b1010, TRISC: 0 } },
            { name: 'switches change to 0111', maxCycles: 8000, init: { pins: { D: 0b11110000 } }, events: [{ at: 3000, pins: { D: 0b10110111 } }], expect: { 'OUT.C': 0b0111 } }],
          solution: R`#include <xc.h>

void main(void) {
    TRISD = 0b11111111;
    TRISC = 0b00000000;
    PORTC = 0;
    while (1) {
        PORTC = PORTD & 0b00001111;
    }
}
`
        }, '', { hint: R`Inside the loop: <code>PORTC = PORTD &amp; 0b00001111;</code> keeps only the four switch bits.` })
      ]
    },
    {
      title: 'Bit manipulation in C',
      objectives: ['You will be able to set, clear, toggle and test any bit with masks and shifts', 'You will know the shift operators <code>&lt;&lt;</code> and <code>&gt;&gt;</code>', 'You will know how the bit operations of C correspond to BSF, BCF, BTFSS and XOR'],
      blocks: [
        D.T(R`<p>The shift operators move all the bits of a number to the left or to the right. <code>x &lt;&lt; n</code> shifts left by $n$ places (new bits on the right are $0$): it multiplies by $2^{n}$. <code>x &gt;&gt; n</code> shifts right: for unsigned numbers it divides by $2^{n}$. The expression <code>1 &lt;&lt; n</code> is a byte with only bit $n$ set, the perfect mask for bit $n$:</p>`),
        D.TABLE(['Task', 'C', 'Assembly'], [
          ['set bit n', '<code>x |= (1 &lt;&lt; n);</code>', '<code>BSF x, n</code>'],
          ['clear bit n', '<code>x &amp;= ~(1 &lt;&lt; n);</code>', '<code>BCF x, n</code>'],
          ['toggle bit n', '<code>x ^= (1 &lt;&lt; n);</code>', '<code>MOVLW</code> mask, <code>XORWF x, F</code>'],
          ['test bit n', '<code>if ((x &gt;&gt; n) &amp; 1)</code> or <code>if (x &amp; (1 &lt;&lt; n))</code>', '<code>BTFSS x, n</code> / <code>BTFSC x, n</code>']
        ]),
        D.T(R`<p>For the registers of the chip, XC8 also gives every bit its own name: <code>RD0 = 1;</code> is the same as <code>PORTD |= 0b00000001;</code>, and <code>PORTDbits.RD0</code> is another way to write it. Activity 10C toggles a pin with the logical NOT: <code>RD0 = !RD0;</code>.</p>`),
        D.c('Set a bit', R`<p>Write a function <code>unsigned char set_bit(unsigned char x, unsigned char n)</code> which returns <code>x</code> with bit <code>n</code> set to $1$ (the other bits unchanged).</p>`, {
          start: R`unsigned char set_bit(unsigned char x, unsigned char n) {

}
`, tests: [{ call: 'set_bit', args: [0, 3], ret: 8 }, { call: 'set_bit', args: [0b10100000, 0], ret: 0b10100001 }, { call: 'set_bit', args: [255, 5], ret: 255 }, { call: 'set_bit', args: [0, 7], ret: 128 }],
          solution: R`unsigned char set_bit(unsigned char x, unsigned char n) {
    return x | (1 << n);
}
`
        }, '', { hint: R`OR with the mask <code>1 &lt;&lt; n</code>.` }),
        D.c('Clear a bit', R`<p>Write a function <code>unsigned char clear_bit(unsigned char x, unsigned char n)</code> which returns <code>x</code> with bit <code>n</code> cleared.</p>`, {
          start: R`unsigned char clear_bit(unsigned char x, unsigned char n) {

}
`, tests: [{ call: 'clear_bit', args: [255, 0], ret: 254 }, { call: 'clear_bit', args: [0b10101010, 3], ret: 0b10100010 }, { call: 'clear_bit', args: [0, 4], ret: 0 }, { call: 'clear_bit', args: [128, 7], ret: 0 }],
          solution: R`unsigned char clear_bit(unsigned char x, unsigned char n) {
    return x & ~(1 << n);
}
`
        }, '', { hint: R`AND with the inverted mask <code>~(1 &lt;&lt; n)</code>: a $0$ only at bit n.` }),
        D.c('Test a bit', R`<p>Write a function <code>int test_bit(unsigned char x, unsigned char n)</code> which returns $1$ if bit <code>n</code> of <code>x</code> is set and $0$ otherwise.</p>`, {
          start: R`int test_bit(unsigned char x, unsigned char n) {

}
`, tests: [{ call: 'test_bit', args: [0b00001000, 3], ret: 1 }, { call: 'test_bit', args: [0b00001000, 2], ret: 0 }, { call: 'test_bit', args: [128, 7], ret: 1 }, { call: 'test_bit', args: [127, 7], ret: 0 }],
          solution: R`int test_bit(unsigned char x, unsigned char n) {
    return (x >> n) & 1;
}
`
        }, '', { hint: R`Shift bit n down to bit 0 and keep only that bit: <code>(x &gt;&gt; n) &amp; 1</code>.` }),
        D.c('Count the ones', R`<p>Write a function <code>int count_ones(unsigned char x)</code> which returns how many bits of <code>x</code> are $1$. Test the lowest bit and shift <code>x</code> right in a loop.</p>`, {
          start: R`int count_ones(unsigned char x) {

}
`, tests: [{ call: 'count_ones', args: [0], ret: 0 }, { call: 'count_ones', args: [255], ret: 8 }, { call: 'count_ones', args: [0b10100001], ret: 3 }, { call: 'count_ones', args: [128], ret: 1 }],
          solution: R`int count_ones(unsigned char x) {
    int n = 0;
    while (x != 0) {
        n += x & 1;
        x = x >> 1;
    }
    return n;
}
`
        }, '', { hint: R`Add <code>x &amp; 1</code> to a counter, then <code>x = x &gt;&gt; 1</code>, until <code>x</code> is $0$.` }),
        D.num('Shift left', R`<p>What is the value of <code>(unsigned char)(0b00010110 &lt;&lt; 2)</code> in decimal?</p>`, 88, R`$0001\,0110_{2} = 22$; shifted left by $2$: $0101\,1000_{2} = 88 = 22 \times 2^{2}$.`, { hint: 'Each shift to the left multiplies by 2.' }),
        D.c('Toggle with XOR', R`<p>An LED is connected to RD0. Write a program that makes RD0 an output and toggles it $6$ times with <code>PORTD ^= 0b00000001;</code>, waiting $100\ \mathrm{ms}$ after each toggle, then stays in an endless loop. (The clock is $4\ \mathrm{MHz}$.)</p>`, {
          start: R`#include <xc.h>
#define _XTAL_FREQ 4000000

void main(void) {

    while (1);
}
`, tests: [{ maxCycles: 800000, expect: { 'EDGES.D0': 6, 'PERIOD.D0': [199000, 201500], TRISD0: 0 } }],
          reqs: [{ re: /\^=/, msg: 'Toggle with ^= (XOR).' }],
          solution: R`#include <xc.h>
#define _XTAL_FREQ 4000000

void main(void) {
    TRISD0 = 0;
    PORTD = 0;
    for (int i = 0; i < 6; i++) {
        PORTD ^= 0b00000001;
        __delay_ms(100);
    }
    while (1);
}
`
        }, '', { hint: [R`Make RD0 an output with <code>TRISD0 = 0;</code> (or <code>TRISD = 0;</code>).`, R`A <code>for</code> loop of $6$ rounds with the XOR and <code>__delay_ms(100);</code> inside.`] }),
        D.asm('Make RC0 an output', R`<p>Make only the pin RC0 an output (TRISC0 $= 0$) without changing the other bits of TRISC, using a bit instruction, and then set RC0 to $1$. Finish in bank 0.</p>`, {
          start: ASTART, tests: [{ expect: { TRISC: 0xFE, 'OUT.C': 1, BANK: 0 } }],
          solution: '    BSF STATUS, 5\n    BCF TRISC, 0\n    BCF STATUS, 5\n    BSF PORTC, 0\n    GOTO $\n'
        }, 'BCF TRISC, 0 clears only bit 0; the other pins stay inputs.', { hint: 'BCF works on one bit only. Remember the bank of TRISC.' })
      ]
    }
  ]
});
})();
