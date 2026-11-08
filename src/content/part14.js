/* Part 14 - Putting it together (Lecture 20 and Activity 20C: H-bridge and motor commands; Labs 8-9; final projects) */
(function () {
const C_UART = R`#include <stdio.h>
#include <xc.h>
#define _XTAL_FREQ 4000000
`;
const MOTOR_SETUP = R`#define IN1 RD0
#define IN2 RD1

void setup(void) {
    PORTC = 0;
    PORTD = 0;
    OSCCON = 0b01100000;    // 4 MHz
    TRISC = 0b10000000;     // RC7 (RX) in, RC2 (PWM) out
    TRISD = 0b00000000;     // IN1, IN2 out
    TXSTA = 0b00100100;
    RCSTA = 0b10010000;
    SPBRG = 25;             // 9600 bit/s
    PR2 = 255;              // PWM period
    T2CON = 0b00000111;     // prescaler 16, Timer2 on
    CCP1CON = 0b00001100;   // CCP1 in PWM mode
}
`;
D.part({
  title: 'Putting it together',
  intro: R`<p>The last part combines everything: strings, conversions, interrupts, PWM and the serial port. You build the motor controller of Activity 20C, which receives commands such as <code>L255</code> from a phone through Bluetooth, learn to organise a program as a <b>state machine</b>, and finish with two small projects in C and in assembly.</p>`,
  sections: [
    {
      title: 'Parsing commands (Activity 20C)',
      objectives: ['You will be able to check and decode a text command', 'You will be able to convert characters into numbers with their weights'],
      blocks: [
        D.T(R`<p>In <b>Activity 20C</b> a DC motor is controlled from a phone through a Bluetooth module HC-05 (or HC-06) connected to the serial port. An app such as <i>Serial Bluetooth Terminal</i> sends commands of the form <code>XYYY</code>:</p>
<ul>
<li><code>X</code> is the direction: <code>L</code> for left, <code>R</code> for right, <code>S</code> for stop;</li>
<li><code>YYY</code> is the speed, three digits from <code>000</code> to <code>255</code>.</li>
</ul>
<p>For example <code>L255</code> turns left at full speed, <code>R127</code> right at half speed and <code>S000</code> stops. The ISR collects the characters in <code>phrase</code> (as in Activity 19C); when Enter arrives, <code>phrase[0]</code> is the direction and <code>phrase[1]</code>, <code>phrase[2]</code> and <code>phrase[3]</code> are the digits of the speed. Each digit is a character, so $48$ (the code of <code>'0'</code>) is subtracted and the digit is multiplied by its weight:</p>`),
        D.CODE(R`int speed = (phrase[1] - 48) * 100 + (phrase[2] - 48) * 10 + (phrase[3] - 48);
motor(phrase[0], speed);`),
        D.T(R`<p>For <code>"R127"</code>: $(49 - 48) \times 100 + (50 - 48) \times 10 + (55 - 48) = 100 + 20 + 7 = 127$.</p>
<p>A real program must also protect itself against wrong input: a missing digit, a letter where a digit should be, or a value above $255$ that would not fit in CCPR1L. Checking the input before using it is called <b>validation</b>.</p>`),
        D.c('Decode the speed', R`<p>Write a function <code>int parse_speed(char *cmd)</code> which returns the speed of a command such as <code>"L255"</code>, from its three digits.</p>`, {
          start: R`int parse_speed(char *cmd) {

}
`, tests: [{ call: 'parse_speed', args: ['L255'], ret: 255 }, { call: 'parse_speed', args: ['R127'], ret: 127 }, { call: 'parse_speed', args: ['S000'], ret: 0 }, { call: 'parse_speed', args: ['L009'], ret: 9 }],
          solution: R`int parse_speed(char *cmd) {
    return (cmd[1] - 48) * 100 + (cmd[2] - 48) * 10 + (cmd[3] - 48);
}
`
        }, '', { hint: R`<code>(cmd[1] - 48) * 100 + (cmd[2] - 48) * 10 + (cmd[3] - 48)</code>` }),
        D.c('Validate a command', R`<p>Write a function <code>int is_valid(char *cmd)</code> which returns $1$ only if the command has exactly the form <code>XYYY</code>: the first character is <code>L</code>, <code>R</code> or <code>S</code>, the next three are digits, the string ends there (the fifth character is <code>'\0'</code>), and the speed is at most $255$. Otherwise it returns $0$.</p>`, {
          start: R`int is_valid(char *cmd) {

}
`, tests: [{ call: 'is_valid', args: ['L255'], ret: 1 }, { call: 'is_valid', args: ['S000'], ret: 1 }, { call: 'is_valid', args: ['X100'], ret: 0 }, { call: 'is_valid', args: ['R256'], ret: 0 }, { call: 'is_valid', args: ['L12'], ret: 0 }, { call: 'is_valid', args: ['R1A5'], ret: 0 }, { call: 'is_valid', args: ['L1234'], ret: 0 }, { call: 'is_valid', args: ['R127'], ret: 1 }],
          solution: R`int is_valid(char *cmd) {
    if (cmd[0] != 'L' && cmd[0] != 'R' && cmd[0] != 'S') return 0;
    for (int i = 1; i <= 3; i++) {
        if (cmd[i] < '0' || cmd[i] > '9') return 0;
    }
    if (cmd[4] != '\0') return 0;
    int speed = (cmd[1] - '0') * 100 + (cmd[2] - '0') * 10 + (cmd[3] - '0');
    return speed <= 255;
}
`
        }, '', { hint: [R`Check the first character with <code>!=</code> and <code>&amp;&amp;</code>; check that each of <code>cmd[1]</code> … <code>cmd[3]</code> is between <code>'0'</code> and <code>'9'</code>.`, R`A string <code>"L12"</code> has <code>'\0'</code> at index 3, which is not a digit, so the digit check already rejects it; <code>"L1234"</code> is rejected by <code>cmd[4] != '\0'</code>.`] }),
        D.num('A command', R`<p>The phone sends <code>R064</code>. The speed $64$ is loaded into CCPR1L. What is the duty cycle of the PWM signal in percent (with PR2 $= 255$)?</p>`, 25, R`The speed is $64$; $\alpha = \frac{64}{256} = 25\%$.`, { unit: '%', tol: 0.05, hint: R`$\alpha = \frac{CCPR1L}{PR2 + 1}$.` })
      ]
    },
    {
      title: 'The H-bridge and the motor',
      objectives: ['You will know how an H-bridge reverses a DC motor', 'You will be able to write the motor function of Activity 20C', 'You will know which combinations of the switches are forbidden'],
      blocks: [
        D.T(R`<p>A DC motor turns the other way when the polarity of its voltage is inverted. An <b>H-bridge</b> does this with four switches (transistors) arranged like the letter H around the motor. Closing switches 1 and 4 makes the current flow one way; closing 2 and 3 makes it flow the other way. Closing 1 and 2 (or 3 and 4) at the same time connects the supply directly to ground: a <b>short circuit</b> that must never happen.</p>
<p>Applying the PWM signal to the switches that are on controls the speed as well. The <b>L298</b> chip contains two complete H-bridges (up to $4\ \mathrm{A}$) with protection against short circuits and overheating; the smaller L293 handles $1\ \mathrm{A}$. Ready-made L298 modules also include the free-wheeling diodes and a $5\ \mathrm{V}$ regulator. The PIC controls one bridge with three lines:</p>`),
        D.TABLE(['IN1', 'IN2', 'ENA (PWM)', 'Motor'], [['1', '0', 'duty cycle', 'turns left'], ['0', '1', 'duty cycle', 'turns right'], ['0', '0', 'any', 'stops'], ['1', '1', 'any', 'brakes (both terminals at the same level)']], { mono: [0, 1] }),
        D.SIDE(R`void motor(char direction, char speed) {
    CCPR1L = speed;
    if (direction == 'L') { IN1 = 1; IN2 = 0; }
    if (direction == 'R') { IN1 = 0; IN2 = 1; }
    if (direction == 'S') { IN1 = 0; IN2 = 0; }
}`, R`void __interrupt() my_isr_routine() {
    phrase[pointer] = RCREG;
    pointer++;
    if (RCREG == '\n' || RCREG == '\r') {
        pointer = 0;
        int speed = (phrase[1] - 48) * 100
                  + (phrase[2] - 48) * 10
                  + (phrase[3] - 48);
        motor(phrase[0], speed);
    }
}`, { cTitle: 'The motor function', asmTitle: 'The receive interrupt (simplified)', cap: R`Activity 20C: the speed goes into CCPR1L, the duty cycle of the PWM on RC2 (the ENA line of the L298), and the direction sets IN1 and IN2 (RD0 and RD1 in this course).` }),
        D.mc('Forbidden switches', 'Which pair of switches of an H-bridge must never be closed together?', ['1 and 2 (the two switches of the same side)', '1 and 4', '2 and 3', 'None: every pair is safe'], 0, 'Two switches on the same side connect the supply directly to ground: a short circuit.', { hint: '1 and 4 or 2 and 3 drive the motor.' }),
        D.c('The motor function', R`<p>Write the function <code>void motor(char direction, unsigned char speed)</code> of Activity 20C: CCPR1L receives the speed; <code>'L'</code> sets IN1 $= 1$, IN2 $= 0$; <code>'R'</code> sets IN1 $= 0$, IN2 $= 1$; <code>'S'</code> clears both. Any other direction must stop the motor too. <code>main</code> calls it once with the command given in the test.</p>`, {
          start: C_UART + MOTOR_SETUP + R`
void motor(char direction, unsigned char speed) {

}

char dir = 'L';
unsigned char spd = 200;

void main(void) {
    setup();
    motor(dir, spd);
    while (1);
}
`, tests: [
            { name: 'L, 200', maxCycles: 30000, expect: { RD0: 1, RD1: 0, CCPR1L: 200, 'PWM1.ON': 1 } },
            { name: 'R, 64', maxCycles: 30000, setGlobals: { dir: 82, spd: 64 }, expect: { RD0: 0, RD1: 1, CCPR1L: 64, 'PWM1.DUTY': 0.25 } },
            { name: 'S, 0', maxCycles: 30000, setGlobals: { dir: 83, spd: 0 }, expect: { RD0: 0, RD1: 0, CCPR1L: 0 } },
            { name: 'X (invalid), 99', maxCycles: 30000, setGlobals: { dir: 88, spd: 99 }, expect: { RD0: 0, RD1: 0 } }],
          solution: C_UART + MOTOR_SETUP + R`
void motor(char direction, unsigned char speed) {
    CCPR1L = speed;
    if (direction == 'L') { IN1 = 1; IN2 = 0; }
    else if (direction == 'R') { IN1 = 0; IN2 = 1; }
    else { IN1 = 0; IN2 = 0; }
}

char dir = 'L';
unsigned char spd = 200;

void main(void) {
    setup();
    motor(dir, spd);
    while (1);
}
`
        }, '', { hint: R`Use <code>if</code> / <code>else if</code> / <code>else</code>: the final <code>else</code> covers <code>'S'</code> and every invalid letter.` }),
        D.c('Activity 20C', R`<p>Write the receive interrupt of Activity 20C: collect the characters in <code>phrase</code>; when <code>'\r'</code> or <code>'\n'</code> arrives, reset the pointer, decode the speed from <code>phrase[1]</code> … <code>phrase[3]</code> and call <code>motor(phrase[0], speed)</code>. The setup and the motor function are given; the simulator sends commands through the serial port.</p>`, {
          start: C_UART + MOTOR_SETUP + R`
unsigned char pointer = 0;
char phrase[30];

void motor(char direction, unsigned char speed) {
    CCPR1L = speed;
    if (direction == 'L') { IN1 = 1; IN2 = 0; }
    else if (direction == 'R') { IN1 = 0; IN2 = 1; }
    else { IN1 = 0; IN2 = 0; }
}

// the interrupt function


void main(void) {
    setup();
    RCIE = 1;
    PEIE = 1;
    GIE = 1;
    while (1);
}
`, tests: [
            { name: 'L255', maxCycles: 60000, events: [{ at: 5000, rx: 'L255\r' }], expect: { RD0: 1, RD1: 0, CCPR1L: 255 } },
            { name: 'R127', maxCycles: 60000, events: [{ at: 5000, rx: 'R127\r' }], expect: { RD0: 0, RD1: 1, CCPR1L: 127 } },
            { name: 'L200 then S000', maxCycles: 90000, events: [{ at: 5000, rx: 'L200\r' }, { at: 40000, rx: 'S000\r' }], expect: { RD0: 0, RD1: 0, CCPR1L: 0 } }],
          solution: C_UART + MOTOR_SETUP + R`
unsigned char pointer = 0;
char phrase[30];

void motor(char direction, unsigned char speed) {
    CCPR1L = speed;
    if (direction == 'L') { IN1 = 1; IN2 = 0; }
    else if (direction == 'R') { IN1 = 0; IN2 = 1; }
    else { IN1 = 0; IN2 = 0; }
}

void __interrupt() my_isr_routine(void) {
    char c = RCREG;
    phrase[pointer] = c;
    pointer++;
    if (c == '\n' || c == '\r') {
        pointer = 0;
        int speed = (phrase[1] - 48) * 100 + (phrase[2] - 48) * 10 + (phrase[3] - 48);
        motor(phrase[0], speed);
    }
}

void main(void) {
    setup();
    RCIE = 1;
    PEIE = 1;
    GIE = 1;
    while (1);
}
`
        }, '', { hint: [R`Read the character once: <code>char c = RCREG;</code> and store it at <code>phrase[pointer++]</code>.`, R`When <code>c</code> is <code>'\r'</code> or <code>'\n'</code>: reset the pointer, calculate the speed, call <code>motor</code>.`] })
      ]
    },
    {
      title: 'State machines',
      objectives: ['You will be able to describe a behaviour as states and transitions', 'You will be able to implement a state machine with an enum and a switch'],
      blocks: [
        D.T(R`<p>Many embedded programs are easiest to write as a <b>state machine</b>: the system is always in one of a few <b>states</b> (for example RED, GREEN, YELLOW for a traffic light), and <b>events</b> (a time has passed, a button was pressed, a character arrived) make it move to another state. In C, the states are named with an <code>enum</code> and the behaviour of each state is a <code>case</code> of a <code>switch</code> inside the main loop:</p>`),
        D.CODE(R`enum State { RED, GREEN, YELLOW };
enum State state = RED;

while (1) {
    switch (state) {
        case RED:
            set_lights(1, 0, 0);
            __delay_ms(3000);
            state = GREEN;          // the transition
            break;
        case GREEN:
            set_lights(0, 0, 1);
            __delay_ms(2000);
            state = YELLOW;
            break;
        case YELLOW:
            set_lights(0, 1, 0);
            __delay_ms(1000);
            state = RED;
            break;
    }
}`),
        D.T(R`<p>An <code>enum</code> gives names to integer constants (here RED $= 0$, GREEN $= 1$, YELLOW $= 2$), which makes the code readable. The motor controller of Activity 20C is a state machine too: its state is the direction, and each received command is an event. In a state machine that must also react to buttons, the delays are usually replaced by a timer: the main loop then checks the events again and again, and never waits.</p>`),
        D.c('Traffic light', R`<p>Write the traffic light as a state machine: RD0 is red, RD1 yellow and RD2 green. The cycle is red $300\ \mathrm{ms}$, green $200\ \mathrm{ms}$, yellow $100\ \mathrm{ms}$, and again red. Exactly one light is on at a time. The tests look at the lights at different moments.</p>`, {
          start: R`#include <xc.h>
#define _XTAL_FREQ 4000000

enum State { RED, GREEN, YELLOW };

void main(void) {
    TRISD = 0;
    PORTD = 0;
    enum State state = RED;
    while (1) {

    }
}
`, tests: [
            { name: 'at 0.15 s: red', maxCycles: 150000, expect: { 'OUT.D': 0b001 } },
            { name: 'at 0.4 s: green', maxCycles: 400000, expect: { 'OUT.D': 0b100 } },
            { name: 'at 0.55 s: yellow', maxCycles: 550000, expect: { 'OUT.D': 0b010 } },
            { name: 'at 0.75 s: red again', maxCycles: 750000, expect: { 'OUT.D': 0b001 } }],
          reqs: [{ re: /\bswitch\b/, msg: 'Use a switch on the state.' }],
          solution: R`#include <xc.h>
#define _XTAL_FREQ 4000000

enum State { RED, GREEN, YELLOW };

void main(void) {
    TRISD = 0;
    PORTD = 0;
    enum State state = RED;
    while (1) {
        switch (state) {
            case RED:
                PORTD = 0b001;
                __delay_ms(300);
                state = GREEN;
                break;
            case GREEN:
                PORTD = 0b100;
                __delay_ms(200);
                state = YELLOW;
                break;
            case YELLOW:
                PORTD = 0b010;
                __delay_ms(100);
                state = RED;
                break;
        }
    }
}
`
        }, '', { hint: R`Copy the structure above: in each case set PORTD (<code>0b001</code>, <code>0b100</code>, <code>0b010</code>), wait, and choose the next state.` }),
        D.c('Code lock', R`<p>A code lock opens when the user types the characters <code>2</code>, <code>5</code>, <code>8</code> in this order. Write a function <code>int unlock(char *keys)</code> which processes the typed keys one by one with a state machine (the state is the number of correct keys so far) and returns $1$ as soon as the whole code has been seen, $0$ if never. A wrong key sends the state back to $0$ — but if that wrong key is a <code>2</code>, it counts as the first key of a new attempt.</p>`, {
          start: R`int unlock(char *keys) {
    int state = 0;

    return 0;
}
`, tests: [{ call: 'unlock', args: ['258'], ret: 1 }, { call: 'unlock', args: ['12589'], ret: 1 }, { call: 'unlock', args: ['2528'], ret: 0 }, { call: 'unlock', args: ['22258'], ret: 1 }, { call: 'unlock', args: ['285'], ret: 0 }, { call: 'unlock', args: [''], ret: 0 }],
          solution: R`int unlock(char *keys) {
    int state = 0;
    for (int i = 0; keys[i] != '\0'; i++) {
        char k = keys[i];
        switch (state) {
            case 0: state = (k == '2') ? 1 : 0; break;
            case 1: state = (k == '5') ? 2 : (k == '2' ? 1 : 0); break;
            case 2:
                if (k == '8') return 1;
                state = (k == '2') ? 1 : 0;
                break;
        }
    }
    return 0;
}
`
        }, '', { hint: [R`State $0$: waiting for <code>2</code>; state $1$: waiting for <code>5</code>; state $2$: waiting for <code>8</code>.`, R`In states $1$ and $2$, a wrong key goes back to state $0$, except <code>2</code>, which goes to state $1$.`] })
      ]
    },
    {
      title: 'Final projects',
      objectives: ['You will be able to combine A/D conversion, the LCD, the serial port and an output in one C program', 'You will be able to combine an interrupt, polling and outputs in one assembly program'],
      blocks: [
        D.T(R`<p>The course project of the lectures asks you to design, in a few hours, a system with A/D conversion, PWM, the USART, an LCD, sensors and actuators. The two exercises below are small versions of such projects. Plan them first: which pins, which registers, which functions, and what happens in which order.</p>`),
        D.c('Temperature monitor', R`<p>Write a temperature monitor in C. Once (no loop), it must:</p><ol><li>read AN0 with $V_{\text{ref}+} = 1\ \mathrm{V}$ (ADCON1 $= 0b00010000$, left justified) and calculate the temperature in whole degrees, $\frac{\text{reading} \times 100}{1023}$;</li><li>show <code>Temp is:</code> and the number at <code>line1 + 9</code> on the LCD, and <code>ALARM</code> or <code>OK</code> on line 2 (alarm above $40$);</li><li>switch the relay on RD6 on during an alarm;</li><li>send the line <code>T=</code> followed by the number and <code>\r\n</code> on the serial port ($9600$ baud), using <code>printf</code> with your own <code>putch</code>.</li></ol><p>The LCD is connected to RD0–RD5 as in the lectures.</p>`, {
          start: R`#include <stdio.h>
#include <stdlib.h>
#include <xc.h>
#define _XTAL_FREQ 4000000
#include "LiquidCrystal.h"
#define relay RD6

char text[7];

void setup(void) {
    OSCCON = 0b01100000;
    PORTD = 0;
    TRISD = 0;
    TRISA0 = 1;
    ANS0 = 1;
    ADCON1 = 0b00010000;
    TRISC = 0b10000000;
    SPBRG = 25;
    TXSTA = 0b00100100;
    RCSTA = 0b10010000;
}

void main(void) {
    setup();
    lcd_begin();
    lcd_clear();

    while (1);
}
`, tests: [
            { name: '0.25 V: 25 degrees', init: { analog: { 0: 0.25 }, vrefP: 1 }, maxCycles: 300000, expect: { LCD1: 'Temp is: 25', LCD2: 'OK', RD6: 0, TX: 'T=25\r\n' } },
            { name: '0.6 V: 60 degrees', init: { analog: { 0: 0.6 }, vrefP: 1 }, maxCycles: 300000, expect: { LCD1: 'Temp is: 60', LCD2: 'ALARM', RD6: 1, TX: 'T=60\r\n' } }],
          solution: R`#include <stdio.h>
#include <stdlib.h>
#include <xc.h>
#define _XTAL_FREQ 4000000
#include "LiquidCrystal.h"
#define relay RD6

char text[7];

void setup(void) {
    OSCCON = 0b01100000;
    PORTD = 0;
    TRISD = 0;
    TRISA0 = 1;
    ANS0 = 1;
    ADCON1 = 0b00010000;
    TRISC = 0b10000000;
    SPBRG = 25;
    TXSTA = 0b00100100;
    RCSTA = 0b10010000;
}

void putch(char c) {
    while (!TXIF);
    TXREG = c;
}

unsigned int read_an0(void) {
    ADCON0 = 0b01000001;
    __delay_us(20);
    GO = 1;
    while (GO);
    unsigned int v = (ADRESH << 8) | ADRESL;
    v = v >> 6;
    return v;
}

void main(void) {
    setup();
    lcd_begin();
    lcd_clear();
    int t = (long) read_an0() * 100 / 1023;
    itoa(text, t, 10);
    lcd_print(line1, (char*) "Temp is:");
    lcd_print(line1 + 9, text);
    if (t > 40) {
        lcd_print(line2, (char*) "ALARM");
        relay = 1;
    } else {
        lcd_print(line2, (char*) "OK");
        relay = 0;
    }
    printf("T=%d\r\n", t);
    while (1);
}
`
        }, '', { hint: [R`Reuse <code>read_an0</code> and the temperature formula of Part 12, and <code>putch</code> of Part 13.`, R`Store the reading in an <code>unsigned int</code> before shifting it right by $6$.`] }),
        D.asm('Press counter', R`<p>Write a press counter in assembly. Each press of the button on <b>RB0</b> generates an interrupt that increments COUNT and shows it on PORTD. A second button on <b>RB1</b>, tested by the main loop (active high), clears COUNT and PORTD. The vectors, the SETUP (PORTB digital inputs, PORTD outputs) and the context saving registers are given. Remember to clear INTF and to save W and STATUS.</p>`, {
          pre: 'COUNT EQU 0x20\nW_TEMP EQU 0x70\nSTATUS_TEMP EQU 0x71\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n',
          post: '\nSETUP:\n    CLRF PORTD\n    BSF RP0\n    MOVLW 01100000B\n    MOVWF OSCCON\n    MOVLW 11111111B\n    MOVWF TRISB\n    CLRF TRISD\n    BSF RP1\n    CLRF ANSELH\n    BCF RP0\n    BCF RP1\n    RETURN\n',
          start: '    ; the ISR: save W and STATUS, clear INTF, COUNT + 1, show it, restore\n\n    RETFIE\n\nMAIN:\n    CALL SETUP\n    CLRF COUNT\n    ; enable the RB0 interrupt\n\nLOOP:\n    ; if RB1 is pressed: clear COUNT and PORTD\n\n    GOTO LOOP\n',
          tests: [
            { name: 'Three presses', events: [{ step: 100, pins: { B: 1 } }, { step: 110, pins: { B: 0 } }, { step: 200, pins: { B: 1 } }, { step: 210, pins: { B: 0 } }, { step: 300, pins: { B: 1 } }, { step: 310, pins: { B: 0 } }], maxSteps: 500, limitOk: true, expect: { COUNT: 3, 'OUT.D': 3 } },
            { name: 'Two presses, reset, one press', events: [{ step: 100, pins: { B: 1 } }, { step: 110, pins: { B: 0 } }, { step: 200, pins: { B: 1 } }, { step: 210, pins: { B: 0 } }, { step: 300, pins: { B: 2 } }, { step: 320, pins: { B: 0 } }, { step: 400, pins: { B: 1 } }, { step: 410, pins: { B: 0 } }], maxSteps: 600, limitOk: true, expect: { COUNT: 1, 'OUT.D': 1 } }],
          solution: '    MOVWF W_TEMP\n    SWAPF STATUS, W\n    MOVWF STATUS_TEMP\n    BCF INTF\n    INCF COUNT, F\n    MOVF COUNT, W\n    MOVWF PORTD\n    SWAPF STATUS_TEMP, W\n    MOVWF STATUS\n    SWAPF W_TEMP, F\n    SWAPF W_TEMP, W\n    RETFIE\n\nMAIN:\n    CALL SETUP\n    CLRF COUNT\n    BSF GIE\n    BSF INTE\nLOOP:\n    BTFSS PORTB, 1\n    GOTO LOOP\n    CLRF COUNT\n    CLRF PORTD\n    GOTO LOOP\n'
        }, 'The interrupt counts the RB0 edges; the main loop polls RB1 and clears the count while it is pressed.', { hint: [R`The ISR is the context-saving ISR of Part 10 with <code>INCF COUNT, F</code>, <code>MOVF COUNT, W</code> and <code>MOVWF PORTD</code> in the middle.`, R`In LOOP: <code>BTFSS PORTB, 1</code> / <code>GOTO LOOP</code>, then <code>CLRF COUNT</code> and <code>CLRF PORTD</code>.`] }),
        D.T(R`<p><b>Congratulations!</b> You have reached the end of the course. You can now write programs in C and in assembly: variables and types, decisions and loops, functions and subroutines, bits and registers, arrays, strings and pointers, interrupts, timers, PWM, the A/D converter, the LCD and the serial port. Remember to <b>save your progress</b> to a file, and try the programs on a real PIC16F887 with MPLAB X when you can.</p>`)
      ]
    },
{
      title: 'Challenge: a lock with three tries',
      objectives: ['You will combine a table, counters and the serial port in a small security device'],
      blocks: [
        D.T(R`<p>The code lock of Section 3 accepts the code anywhere in a stream of characters, so a burglar can simply type every combination one after the other. Real locks read codes of a fixed length and count the failures: after three wrong codes they raise an alarm and refuse to open, even for the right code.</p>`),
        D.asm('A lock with three tries', R`<p>Characters arrive at the serial port (SETUP is given). Read them in groups of three: each group is one try.</p>
<ul><li>If a group is the code <code>123</code>, light RD0 (the lock opens) and stop.</li><li>If not, count the wrong try. After the third wrong try, light RD1 (the alarm) and stop: no more characters are read, so even the right code no longer opens the lock.</li></ul>
<p>Keep the code in a <code>RETLW</code> table called <code>CODE</code>, so it can be changed in one place, and compare each character with the table entry for its position. Stop with <code>GOTO $</code>.</p>`, {
          pre: "CHAR  EQU 0x20\nPOS   EQU 0x21\nTRIES EQU 0x22\nWRONG EQU 0x23\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    RETFIE\n", post: "\nSETUP:\n    CLRF  PORTD\n    BANKSEL TRISD\n    CLRF  TRISD         ; PORTD outputs\n    BSF   TRISC, 7      ; RX input\n    MOVLW 25\n    MOVWF SPBRG         ; 9600 baud at 4 MHz\n    MOVLW 00100100B\n    MOVWF TXSTA         ; BRGH = 1\n    BANKSEL RCSTA\n    MOVLW 10010000B     ; serial port on, continuous receive\n    MOVWF RCSTA\n    RETURN\n",
          start: 'MAIN:\n    CALL SETUP\n    CLRF TRIES\n\n; read the tries\n\n    GOTO $\n',
          tests: [['123', 1, 0], ['124', 0, 0], ['111222333', 0, 1], ['999888123', 1, 0], ['111222333123', 0, 1], ['124123', 1, 0], ['312', 0, 0]].map(([s, open, alarm]) => ({ name: '"' + s + '"', events: [{ step: 200, rx: s }], maxSteps: 12000, limitOk: true, expect: { RD0: open, RD1: alarm } })),
          reqs: [{ re: /\bRETLW\b/i, msg: 'Keep the code in a RETLW table.' }],
          solution: "MAIN:\n    CALL  SETUP\n    CLRF  TRIES\nNEW_TRY:\n    CLRF  POS           ; position in the code: 0, 1, 2\n    CLRF  WRONG         ; no mistake yet\nNEXT:\n    BTFSS RCIF          ; wait for a character\n    GOTO  NEXT\n    MOVF  RCREG, W\n    MOVWF CHAR\n    MOVF  POS, W\n    CALL  CODE          ; W = the character expected here\n    XORWF CHAR, W       ; Z = 1 if they are equal\n    BTFSS STATUS, 2\n    BSF   WRONG, 0      ; remember the mistake, but keep reading\n    INCF  POS, F\n    MOVF  POS, W\n    XORLW 3             ; three characters received?\n    BTFSS STATUS, 2\n    GOTO  NEXT\n    BTFSS WRONG, 0\n    GOTO  OPEN          ; no mistake: the right code\n    INCF  TRIES, F\n    MOVF  TRIES, W\n    XORLW 3             ; the third wrong code?\n    BTFSS STATUS, 2\n    GOTO  NEW_TRY\n    BSF   PORTD, 1      ; alarm, and accept nothing more\n    GOTO  $\nOPEN:\n    BSF   PORTD, 0      ; open the lock\n    GOTO  $\n\nCODE:                   ; W = 0, 1, 2 -> the characters of the code\n    ADDWF PCL, F\n    RETLW '1'\n    RETLW '2'\n    RETLW '3'\n"
        }, R`A wrong character does not end the try early: the lock always reads three characters, so nobody can tell which digit was wrong. WRONG remembers a mistake until the end of the group, POS selects the expected character in the table, and TRIES counts the wrong groups.`, { challenge: true, hint: [R`Use POS ($0$, $1$, $2$), WRONG (set when a character differs) and TRIES. For each character: <code>MOVF POS, W</code>, <code>CALL CODE</code>, <code>XORWF CHAR, W</code>; if Z $= 0$, set WRONG.`, R`After the third character: without a mistake, <code>BSF PORTD, 0</code> and <code>GOTO $</code>. Otherwise <code>INCF TRIES, F</code>; if TRIES is $3$, <code>BSF PORTD, 1</code> and <code>GOTO $</code>; if not, clear POS and WRONG for the next try.`] })
      ]
    }
  ]
});
})();
