/* Part 13 - Text output: LCD and serial port (Lecture 16/Activity 15, Lecture 17/Activity 16C, Lectures 18-19/Activities 17, 18, 19C) */
(function () {
const LCD_DEFS = 'A1 EQU 0X70\nA2 EQU 0X71\nA3 EQU 0X72\nLCD_TEMP EQU 0X73\n#define RS RD0\n#define E  RD1\n#define D4 RD2\n#define D5 RD3\n#define D6 RD4\n#define D7 RD5\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    RETFIE\n';
const LCD_4L = 'LCD_4L:\n    MOVWF LCD_TEMP\n    BCF D4\n    BCF D5\n    BCF D6\n    BCF D7\n    BTFSC LCD_TEMP, 3\n    BSF D7\n    BTFSC LCD_TEMP, 2\n    BSF D6\n    BTFSC LCD_TEMP, 1\n    BSF D5\n    BTFSC LCD_TEMP, 0\n    BSF D4\n    RETURN\n';
const LCD_REST = 'SETUP:\n    CLRF PORTD\n    BSF RP0\n    MOVLW 01100000B\n    MOVWF OSCCON\n    CLRF TRISD\n    BCF RP0\n    RETURN\n' +
  'LCD_BEGIN:\n    BCF E\n    BCF RS\n    CALL DELAY_20MS\n    MOVLW 00110000B\n    CALL LCD_4H\n    CALL FETCH_CMD\n    CALL DELAY_4500US\n    MOVLW 00110000B\n    CALL LCD_4H\n    CALL FETCH_CMD\n    CALL DELAY_4500US\n    MOVLW 00110000B\n    CALL LCD_4H\n    CALL FETCH_CMD\n    CALL DELAY_150US\n    MOVLW 00100000B\n    CALL LCD_4H\n    CALL FETCH_CMD\n    MOVLW 00101000B\n    CALL LCD_CMD\n    MOVLW 00001000B\n    CALL LCD_CMD\n    CALL LCD_CLEAR\n    MOVLW 00001100B\n    CALL LCD_CMD\n    MOVLW 00000110B\n    CALL LCD_CMD\n    RETURN\n' +
  'LCD_4H:\n    MOVWF LCD_TEMP\n    BCF D4\n    BCF D5\n    BCF D6\n    BCF D7\n    BTFSC LCD_TEMP, 7\n    BSF D7\n    BTFSC LCD_TEMP, 6\n    BSF D6\n    BTFSC LCD_TEMP, 5\n    BSF D5\n    BTFSC LCD_TEMP, 4\n    BSF D4\n    RETURN\n' +
  'LCD_CMD:\n    CALL LCD_4H\n    CALL FETCH_CMD\n    CALL LCD_4L\n    CALL FETCH_CMD\n    CALL DELAY_2000US\n    RETURN\nLCD_WRITE:\n    CALL LCD_4H\n    CALL FETCH_DATA\n    CALL LCD_4L\n    CALL FETCH_DATA\n    CALL DELAY_2000US\n    RETURN\n' +
  'FETCH_CMD:\n    BCF RS\n    BSF E\n    NOP\n    NOP\n    BCF E\n    RETURN\nFETCH_DATA:\n    BSF RS\n    BSF E\n    NOP\n    NOP\n    BCF E\n    RETURN\n' +
  'LCD_CLEAR:\n    MOVLW 00000001B\n    CALL LCD_CMD\n    RETURN\nLCD_LIN1:\n    MOVLW 10000000B\n    CALL LCD_CMD\n    RETURN\nLCD_LIN2:\n    MOVLW 11000000B\n    CALL LCD_CMD\n    RETURN\n' +
  'DELAY_4500US:\n    MOVLW 0XD5\n    MOVWF A1\n    MOVLW 0X06\n    MOVWF A2\n    DECFSZ A1, F\n    GOTO $-1\n    DECFSZ A2, F\n    GOTO $-3\n    RETURN\nDELAY_2000US:\n    MOVLW 0X96\n    MOVWF A1\n    MOVLW 0X03\n    MOVWF A2\n    DECFSZ A1, F\n    GOTO $-1\n    DECFSZ A2, F\n    GOTO $-3\n    RETURN\nDELAY_150US:\n    MOVLW 0X30\n    MOVWF A1\n    DECFSZ A1, 1\n    GOTO $-1\n    NOP\n    RETURN\nDELAY_20MS:\n    MOVLW 0XF7\n    MOVWF A1\n    MOVLW 0X1A\n    MOVWF A2\n    DECFSZ A1, F\n    GOTO $-1\n    DECFSZ A2, F\n    GOTO $-3\n    RETURN\n';
const VEC = '    ORG 0\n    GOTO MAIN\n    ORG 0X4\n    RETFIE\n';
const SETUP17 = 'SETUP:\n    CLRF  PORTC\n    BSF   RP0\n    BCF   TRISC6       ; TX IS OUTPUT\n    MOVLW 25           ; 9600 BIT/S\n    MOVWF SPBRG\n    CLRF  SPBRGH\n    MOVLW 00100100B    ; ENABLE TX, BRGH=1\n    MOVWF TXSTA\n    MOVLW 01100000B\n    MOVWF OSCCON\n    BCF   RP0\n    BSF   SPEN         ; ENABLE SERIAL PORT\n    RETURN\n';
const SEND_MAIN = 'MAIN:\n    CALL SETUP\n' + Array.from('HCT Dubai').map(c => "    MOVLW '" + c + "'\n    CALL USART_SEND\n").join('') + '    GOTO $\n';
const SEND_MSG = 'SEND_MSG:\n' + Array.from('HCT Dubai').map(c => "    MOVLW '" + c + "'\n    CALL USART_SEND\n").join('') + '    RETURN\n\nUSART_SEND:\n    MOVWF TXREG\n    BSF RP0\n    BTFSS TRMT\n    GOTO $-1\n    BCF RP0\n    RETURN\n';
const PRE18 = '    ORG 0\n    GOTO MAIN\n\n    ORG 0X40\n' + SEND_MSG + '\nMAIN:\n    CALL SETUP\n    GOTO $\n\n';
const SETUP18 = 'SETUP:\n    CLRF PORTC\n    BSF RP0\n    MOVLW 01100000B\n    MOVWF OSCCON\n    BCF TRISC6\n    BSF TRISC7\n    BSF RCIE\n    MOVLW 25\n    MOVWF SPBRG\n    CLRF SPBRGH\n    MOVLW 00100100B\n    MOVWF TXSTA\n    BCF RP0\n    MOVLW 10010000B\n    MOVWF RCSTA\n    BSF PEIE\n    BSF GIE\n    RETURN\n';
const C_UART = R`#include <stdio.h>
#include <xc.h>

void setup(void) {
    OSCCON = 0b01100000;    // 4 MHz
    TRISC = 0b10000000;     // RC7 (RX) input, RC6 (TX) output
    SPBRG = 25;             // 9600 bit/s
    TXSTA = 0b00100100;     // transmitter on, BRGH = 1
    RCSTA = 0b10010000;     // serial port on, continuous receive
}
`;
D.part({
  title: 'Text output: LCD and serial port',
  intro: R`<p>A program that can show text is much easier to use and to debug. In this part you drive a character LCD, first in assembly with the routines of Activity 15 and then in C, and you program the USART to send and receive characters on the serial port (Activities 17, 18 and 19C), with the timing problems that come with it.</p>`,
  sections: [
    {
      title: 'Sending bytes to an LCD (Activity 15)',
      objectives: ['You will know the pins and the commands of an HD44780 character LCD', 'You will know how a byte is sent in two nibbles in 4-bit mode', 'You will be able to write a message on the LCD in assembly'],
      blocks: [
        D.T(R`<p>A character LCD shows ASCII characters in a grid of fixed positions: the common <b>16×2</b> display has $2$ lines of $16$ characters, each drawn in a $5 \times 8$ dot matrix. It contains its own controller, the Hitachi <b>HD44780</b>, which receives commands and characters from the microcontroller. The important pins are:</p>`),
        D.TABLE(['Pin', 'Role'], [
          ['VSS, VDD, V0', 'ground, $5\\ \\mathrm{V}$, and the contrast (from a potentiometer of $1$–$10\\ \\mathrm{k}\\Omega$)'],
          ['RS', 'register select: $0$ = a <b>command</b> (clear, move the cursor...), $1$ = a <b>character</b> to show'],
          ['R/W', 'read or write; connected to ground when the program only writes'],
          ['E', 'enable: the LCD reads the data lines on the falling edge of E'],
          ['D0–D7', 'the data lines (only D4–D7 are used in 4-bit mode)'],
          ['A, K', 'the LED backlight, with a series resistor of $100$–$470\\ \\Omega$']
        ]),
        D.T(R`<p>To save pins, Activity 15 uses the <b>4-bit mode</b>: RS on RD0, E on RD1 and D4–D7 on RD2–RD5, $6$ pins instead of $11$. Each byte is then sent as two nibbles, the <b>high nibble first</b>, each one latched by a pulse on E. Some commands of the HD44780:</p>`),
        D.TABLE(['Command', 'Code', 'Effect'], [
          ['Clear display', '<code>00000001</code>', 'fills the display with spaces and returns the cursor to the start'],
          ['Return home', '<code>0000001x</code>', 'cursor to position $0$'],
          ['Entry mode set', '<code>000001 I/D S</code>', 'I/D $= 1$: the cursor moves right after each character'],
          ['Display on/off', '<code>00001 D C B</code>', 'D: display on, C: cursor visible, B: cursor blinks'],
          ['Function set', '<code>001 DL N F xx</code>', 'DL $= 0$: 4-bit interface; N $= 1$: 2 lines'],
          ['Set DDRAM address', '<code>1 aaaaaaa</code>', 'moves the cursor: $80_{16}$ is line 1, $C0_{16}$ is line 2 (address $40_{16}$)']
        ], { mono: [1] }),
        D.T(R`<p>Before use the LCD must be initialised in the order recommended by Hitachi: wait $20\ \mathrm{ms}$, send <code>0x3</code> three times, then <code>0x2</code> to select the 4-bit mode, then the commands <code>0x28</code> (2 lines, 4 bits), <code>0x08</code> (display off), clear, <code>0x0C</code> (display on, no cursor) and <code>0x06</code> (auto increment). Activity 15 puts every step in a subroutine:</p>`),
        D.CODE(R`LCD_4H:                 ; put the high nibble of W on D4..D7
    MOVWF   LCD_TEMP
    BCF     D4              ; clear the lines first
    BCF     D5
    BCF     D6
    BCF     D7
    BTFSC   LCD_TEMP, 7     ; check the bit and place
    BSF     D7              ; its value on the pin
    BTFSC   LCD_TEMP, 6
    BSF     D6
    BTFSC   LCD_TEMP, 5
    BSF     D5
    BTFSC   LCD_TEMP, 4
    BSF     D4
    RETURN

LCD_WRITE:              ; show the character in W
    CALL    LCD_4H          ; high nibble
    CALL    FETCH_DATA      ; RS = 1, pulse on E
    CALL    LCD_4L          ; low nibble
    CALL    FETCH_DATA
    CALL    DELAY_2000US
    RETURN

FETCH_DATA:
    BSF     RS              ; RS = 1 => DATA
    BSF     E
    NOP
    NOP
    BCF     E               ; the LCD reads on the falling edge
    RETURN

MSG1:                   ; the message, letter by letter
    MOVLW   'I'
    CALL    LCD_WRITE
    MOVLW   ' '
    CALL    LCD_WRITE
    ; ...`, 'asm'),
        D.T(R`<p><code>LCD_CMD</code> works like <code>LCD_WRITE</code> with <code>FETCH_CMD</code> (RS $= 0$). The main code of Activity 15 calls <code>LCD_BEGIN</code> once, then <code>LCD_CLEAR</code>, <code>LCD_LIN1</code>, <code>MSG1</code>, <code>LCD_LIN2</code>, <code>MSG2</code>, waits $2\ \mathrm{s}$, and shows a third message. In the simulator, the LCD appears under the editor when your program uses it.</p>`),
        D.match('LCD pins', 'Match each LCD pin with its role.', [['RS', 'Chooses between a command (0) and a character (1)'], ['E', 'The LCD reads the data on its falling edge'], ['D4–D7', 'Carry one nibble at a time in 4-bit mode'], ['V0', 'Contrast, from a potentiometer']], 'RS selects the register, E latches the data, D4–D7 carry the nibbles and V0 sets the contrast.', { hint: 'RS = register select, E = enable.' }),
        D.num('Line 2', R`<p>Which command (in hexadecimal) moves the cursor to the first position of line 2?</p>`, ['C0'], R`Set DDRAM address: bit 7 $= 1$ plus the address $40_{16}$: $80_{16} + 40_{16} = C0_{16}$.`, { kind: 'hex', hint: 'Line 2 starts at the DDRAM address 0x40.' }),
        D.num('The letter A', R`<p>Which byte (binary, $8$ bits) is sent with RS $= 1$ to show the letter <code>A</code>?</p>`, ['01000001'], R`The ASCII code of A is $65 = 0100\,0001_{2}$.`, { kind: 'bin', exact: true, hint: 'The ASCII code of A is 65.' }),
        D.mc('Nibble order', 'In 4-bit mode, in which order is a byte sent?', ['The high nibble first, then the low nibble', 'The low nibble first', 'Only the high nibble', 'All 8 bits at once'], 0, 'The HD44780 expects DB7–DB4 first, then DB3–DB0.', { hint: 'The lecture: "the four high order bits are transferred before the four low order bits".' }),
        D.asm('Write on the LCD', R`<p>All the LCD routines of Activity 15 are given. Write the main code: call SETUP and LCD_BEGIN, write <code>PIC16F887</code> on line 1 and <code>OK</code> on line 2 with <code>LCD_LIN1</code>, <code>LCD_LIN2</code> and <code>LCD_WRITE</code>, then stop with <code>GOTO $</code>.</p>`, {
          pre: LCD_DEFS, post: LCD_4L + LCD_REST,
          start: 'MAIN:\n    CALL SETUP\n    CALL LCD_BEGIN\n    ; line 1: PIC16F887, line 2: OK\n\n    GOTO $\n',
          tests: [{ name: 'The display', maxSteps: 120000, expect: { LCD1: 'PIC16F887', LCD2: 'OK', LCDON: 1 } }],
          solution: 'MAIN:\n    CALL SETUP\n    CALL LCD_BEGIN\n    CALL LCD_LIN1\n' + Array.from('PIC16F887').map(c => "    MOVLW '" + c + "'\n    CALL LCD_WRITE\n").join('') + '    CALL LCD_LIN2\n    MOVLW \'O\'\n    CALL LCD_WRITE\n    MOVLW \'K\'\n    CALL LCD_WRITE\n    GOTO $\n'
        }, 'LCD_LIN1 and LCD_LIN2 set the DDRAM address; each MOVLW with a character followed by CALL LCD_WRITE shows one letter.', { hint: [R`<code>CALL LCD_LIN1</code>, then for each letter <code>MOVLW 'P'</code> and <code>CALL LCD_WRITE</code>.`, R`Then <code>CALL LCD_LIN2</code> and the two letters of OK.`] }),
        D.asm('The low nibble', R`<p>The routine <code>LCD_4L</code> is missing from the library: write it. Like <code>LCD_4H</code>, it puts a nibble of W on the pins D4–D7, but the <b>low</b> nibble: bit 3 of W on D7, bit 2 on D6, bit 1 on D5 and bit 0 on D4. The main code writes <code>HCT</code> on the LCD.</p>`, {
          pre: LCD_DEFS + 'MAIN:\n    CALL SETUP\n    CALL LCD_BEGIN\n    CALL LCD_LIN1\n    MOVLW \'H\'\n    CALL LCD_WRITE\n    MOVLW \'C\'\n    CALL LCD_WRITE\n    MOVLW \'T\'\n    CALL LCD_WRITE\n    GOTO $\n', post: LCD_REST,
          start: 'LCD_4L:\n    MOVWF LCD_TEMP\n\n    RETURN\n',
          tests: [{ name: 'The display', maxSteps: 90000, expect: { LCD1: 'HCT' } }],
          solution: LCD_4L
        }, 'The same as LCD_4H, but testing the bits 3, 2, 1 and 0 of LCD_TEMP.', { hint: [R`Clear D4–D7 first with four <code>BCF</code>.`, R`Then <code>BTFSC LCD_TEMP, 3</code> / <code>BSF D7</code>, and so on for bits 2, 1 and 0.`] })
      ]
    },
    {
      title: 'The LCD in C (Activity 16C)',
      objectives: ['You will be able to use the LCD functions of the course library', 'You will be able to show numbers on the LCD with itoa'],
      blocks: [
        D.T(R`<p>In C the routines of the LCD are collected in a header file, <code>LiquidCrystal.h</code>, which the lecture includes in Activity 16C. It provides <code>lcd_begin()</code>, <code>lcd_clear()</code> and <code>lcd_print(position, text)</code>, with the positions <code>line1</code> and <code>line2</code>; <code>line1 + 9</code> is the tenth position of line 1. The functions in the header are similar to the assembly routines of Activity 15.</p>`),
        D.CODE(R`#include "LiquidCrystal.h"
#include "stdlib.h"

char phrase[7];

    lcd_begin();
    lcd_clear();
    lcd_print(line1, (char*) "I love Micro  :)");
    lcd_print(line2, (char*) "----------------");
    __delay_ms(2000);
    // ...
    itoa(phrase, (int) temperature, 10);   // number -> text
    lcd_clear();
    lcd_print(line1, (char*) "Temp is:");
    lcd_print(line1 + 9, phrase);
    lcd_print(line1 + 11, (char*) "c");`),
        D.T(R`<p>The LCD only shows characters, so a number is first converted into text with <code>itoa</code> (integer to ASCII): <code>itoa(phrase, 25, 10)</code> writes the characters <code>'2'</code>, <code>'5'</code> and <code>'\0'</code> into <code>phrase</code>. The buffer must have room for all the digits, the sign and the <code>'\0'</code>.</p>`),
        D.c('Welcome message', R`<p>Write a program which shows the welcome message of Activity 16C: <code>I love Micro  :)</code> on line 1 and sixteen <code>-</code> on line 2.</p>`, {
          start: R`#include <xc.h>
#define _XTAL_FREQ 4000000
#include "LiquidCrystal.h"

void main(void) {
    TRISD = 0;

    while (1);
}
`, tests: [{ maxCycles: 200000, expect: { LCD1: 'I love Micro  :)', LCD2: '----------------' } }],
          solution: R`#include <xc.h>
#define _XTAL_FREQ 4000000
#include "LiquidCrystal.h"

void main(void) {
    TRISD = 0;
    lcd_begin();
    lcd_clear();
    lcd_print(line1, (char*) "I love Micro  :)");
    lcd_print(line2, (char*) "----------------");
    while (1);
}
`
        }, '', { hint: R`<code>lcd_begin(); lcd_clear();</code> then two <code>lcd_print</code> calls.` }),
        D.c('Temperature on the LCD', R`<p>Complete the display part of Activity 16C: the variable <code>temperature</code> holds a whole number of degrees. Show <code>Temp is:</code> at the start of line 1, the number at position <code>line1 + 9</code> and the letter <code>c</code> just after it, and on line 2 <code>Hot</code> if the temperature is above $40$, otherwise <code>Cold</code>. The tests use several temperatures.</p>`, {
          start: R`#include <xc.h>
#define _XTAL_FREQ 4000000
#include "LiquidCrystal.h"
#include <stdlib.h>

int temperature = 25;
char phrase[7];

void main(void) {
    TRISD = 0;
    lcd_begin();
    lcd_clear();

    while (1);
}
`, tests: [{ name: '25', maxCycles: 200000, expect: { LCD1: 'Temp is: 25c', LCD2: 'Cold' } }, { name: '57', maxCycles: 200000, setGlobals: { temperature: 57 }, expect: { LCD1: 'Temp is: 57c', LCD2: 'Hot' } }, { name: '40', maxCycles: 200000, setGlobals: { temperature: 40 }, expect: { LCD1: 'Temp is: 40c', LCD2: 'Cold' } }],
          reqs: [{ re: /itoa/, msg: 'Convert the number with itoa.' }],
          solution: R`#include <xc.h>
#define _XTAL_FREQ 4000000
#include "LiquidCrystal.h"
#include <stdlib.h>

int temperature = 25;
char phrase[7];

void main(void) {
    TRISD = 0;
    lcd_begin();
    lcd_clear();
    itoa(phrase, temperature, 10);
    lcd_print(line1, (char*) "Temp is:");
    lcd_print(line1 + 9, phrase);
    lcd_print(line1 + 11, (char*) "c");
    if (temperature > 40) lcd_print(line2, (char*) "Hot");
    else lcd_print(line2, (char*) "Cold");
    while (1);
}
`
        }, '', { hint: [R`<code>itoa(phrase, temperature, 10);</code> converts the number.`, R`The <code>c</code> goes at <code>line1 + 11</code>, after the two digits.`] }),
        D.c('A counter on the LCD', R`<p>Write a program which counts from $0$ to $9$ on the LCD: line 1 shows <code>Count: </code> followed by the number (at <code>line1 + 7</code>), updated every $100\ \mathrm{ms}$. At the end line 1 shows <code>Count: 9</code>, and line 2 shows <code>Done</code>.</p>`, {
          start: R`#include <xc.h>
#define _XTAL_FREQ 4000000
#include "LiquidCrystal.h"
#include <stdlib.h>

char buf[4];

void main(void) {
    TRISD = 0;
    lcd_begin();
    lcd_clear();

    while (1);
}
`, tests: [{ maxCycles: 1500000, expect: { LCD1: 'Count: 9', LCD2: 'Done', CYCLES: [1000000, 1500001] } }],
          reqs: [{ re: /\bfor\b|\bwhile\b/, msg: 'Use a loop.' }],
          solution: R`#include <xc.h>
#define _XTAL_FREQ 4000000
#include "LiquidCrystal.h"
#include <stdlib.h>

char buf[4];

void main(void) {
    TRISD = 0;
    lcd_begin();
    lcd_clear();
    lcd_print(line1, (char*) "Count:");
    for (int i = 0; i <= 9; i++) {
        itoa(buf, i, 10);
        lcd_print(line1 + 7, buf);
        __delay_ms(100);
    }
    lcd_print(line2, (char*) "Done");
    while (1);
}
`
        }, '', { hint: R`Print <code>Count:</code> once, then in a <code>for</code> loop convert <code>i</code> with <code>itoa</code> and print it at <code>line1 + 7</code>.` })
      ]
    },
    {
      title: 'The serial port: transmitting (Activity 17)',
      objectives: ['You will know how an asynchronous serial frame is built', 'You will be able to calculate SPBRG for a baud rate', 'You will be able to send characters and strings without losing any'],
      blocks: [
        D.T(R`<p>The <b>USART</b> (Universal Synchronous Asynchronous Receiver/Transmitter) is the built-in serial port. In the <b>asynchronous</b> mode, used between a PIC and a computer, the data travel on one wire in each direction: <b>TX</b> (RC6) sends and <b>RX</b> (RC7) receives, so the two devices can send and receive at the same time (<b>full duplex</b>). The TX of one device is connected to the RX of the other, and the grounds are connected together. A computer needs a USB-to-serial converter (FT232, CH340 or CP2102); a Bluetooth module such as the HC-05 also speaks this protocol.</p>
<p>There is no clock wire: both sides agree on the speed, the <b>baud rate</b> (bits per second). Every byte is sent as a <b>frame</b>: a start bit ($0$), the $8$ data bits from the least significant bit, and a stop bit ($1$). That is $10$ bits per byte.</p>`),
        D.T(R`<p>The speed is generated from the oscillator by the baud rate generator <b>SPBRG</b>. With BRGH $= 1$ (high speed, bit 2 of TXSTA) and the 8-bit generator:</p>
$$\text{Baud} = \frac{F_{\text{osc}}}{16\,(SPBRG + 1)} \qquad\Rightarrow\qquad SPBRG = \frac{F_{\text{osc}}}{16 \times \text{Baud}} - 1.$$
<p>(With BRGH $= 0$ the factor is $64$.) For $9600$ baud at $4\ \mathrm{MHz}$: $SPBRG = \frac{4\,000\,000}{16 \times 9600} - 1 = 25.04 \approx 25$.</p>
<p>To transmit: TRISC6 $= 0$, SPBRG, <b>TXSTA</b> $= 0010\,0100_{2}$ (TXEN $= 1$ enables the transmitter, SYNC $= 0$ asynchronous, BRGH $= 1$), and <b>SPEN</b> $= 1$ (bit 7 of RCSTA) to switch the serial port on. Then writing a byte into <b>TXREG</b> sends it automatically: the byte moves to the shift register TSR, which pushes the bits out one by one.</p>`),
        D.H('Why only "Hi"?'),
        D.T(R`<p>Activity 17 first sends the letter <code>H</code>. Then it sends the phrase <code>HCT Dubai</code> by writing the nine letters into TXREG one after the other, and the terminal receives only <code>Hi</code>! Writing TXREG takes about $2\ \mu\mathrm{s}$, but sending a byte takes $\frac{10}{9600}\ \mathrm{s} \approx 1.04\ \mathrm{ms}$. While the first letter is being sent, the next letters overwrite each other in TXREG, and only the last one survives. The cure is to wait after each letter until it has been sent: wait at least $1.04\ \mathrm{ms}$, or better, test the flag <b>TRMT</b> (bit 1 of TXSTA, bank 1), which is $1$ when the shift register is empty.</p>`),
        D.CODE(R`USART_SEND:
    MOVWF   TXREG       ; start sending the character in W
    BSF     RP0         ; TRMT is in TXSTA, bank 1
    BTFSS   TRMT        ; check TRMT
    GOTO    $-1         ; wait until the data is sent
    BCF     RP0         ; back to bank 0
    RETURN`, 'asm'),
        D.num('SPBRG for 19200', R`<p>Which SPBRG value gives $19200$ baud at $4\ \mathrm{MHz}$ with BRGH $= 1$ (rounded)?</p>`, 12, R`$\frac{4\,000\,000}{16 \times 19200} - 1 = 12.02 \approx 12$, giving $\frac{4\,000\,000}{16 \times 13} \approx 19231$ baud, an error of $0.16\%$.`, { hint: R`$SPBRG = \frac{F_{\text{osc}}}{16 \times \text{Baud}} - 1$.` }),
        D.multi('Times at 1200 baud', R`<p>At $1200$ baud, how long does one bit take, and one byte with its start and stop bits? Give both in milliseconds (two decimals).</p>`, [{ label: 'One bit:', ans: [0.83], tol: 0.005, unit: 'ms' }, { label: 'One byte:', ans: [8.33], tol: 0.005, unit: 'ms' }], R`One bit: $\frac{1}{1200}\ \mathrm{s} \approx 0.83\ \mathrm{ms}$; one byte is $10$ bits: $8.33\ \mathrm{ms}$.`, { hint: 'A byte frame has 10 bits.' }),
        D.mc('115200 baud at 4 MHz', R`<p>Which statement is true for $115200$ baud with a $4\ \mathrm{MHz}$ oscillator?</p>`, ['With BRGH $= 1$, SPBRG $= 1$ gives $125000$ baud (an error of about $8.5\\%$); with BRGH $= 0$ it is impossible', 'SPBRG $= 25$ works perfectly', 'BRGH $= 0$ is better', 'Any SPBRG gives exactly 115200'], 0, R`BRGH $= 1$: $\frac{4\,000\,000}{16 \times 115200} - 1 \approx 1.17 \to 1$, which gives $\frac{4\,000\,000}{32} = 125000$ baud. BRGH $= 0$: $\frac{4\,000\,000}{64 \times 115200} - 1 < 0$.`, { hint: 'Calculate SPBRG for both values of BRGH.' }),
        D.asm('Send H', R`<p>Write the main code and the SETUP of Activity 17: configure the USART for $9600$ baud at $4\ \mathrm{MHz}$ (TX output, SPBRG, TXSTA, SPEN) and send the letter <code>H</code> with <code>MOVWF TXREG</code>. The simulator shows what the terminal receives.</p>`, {
          pre: VEC, start: 'MAIN:\n    CALL SETUP\n    ; send the letter H\n    GOTO $\n\nSETUP:\n    ; RC6 output, SPBRG, TXSTA, SPEN\n    RETURN\n',
          tests: [{ name: 'Sending H', maxSteps: 5000, expect: { TX: 'H', BAUD: [9500, 9700], TXEN: 1, SPEN: 1, TRISC6: 0 } }],
          solution: 'MAIN:\n    CALL SETUP\n    MOVLW \'H\'\n    MOVWF TXREG\n    GOTO $\n\nSETUP:\n    CLRF PORTC\n    BSF RP0\n    BCF TRISC6\n    MOVLW 25\n    MOVWF SPBRG\n    CLRF SPBRGH\n    MOVLW 00100100B\n    MOVWF TXSTA\n    BCF RP0\n    BSF SPEN\n    RETURN'
        }, 'RC6 output, SPBRG = 25 and TXSTA = 00100100B give 9600 baud with the transmitter on; SPEN switches the port on; writing TXREG sends the letter.', { hint: ['SPBRG, TXSTA and TRISC are in bank 1; SPEN is in RCSTA (bank 0).', R`Load the ASCII code with <code>MOVLW 'H'</code>.`] }),
        D.asm('Send HCT Dubai', R`<p>The main code and the SETUP are given: the main code calls <code>USART_SEND</code> for each letter of <code>HCT Dubai</code>. Write <code>USART_SEND</code> so that all nine letters reach the terminal: load TXREG, then wait for TRMT.</p>`, {
          pre: VEC + SEND_MAIN + '\n' + SETUP17 + '\n', start: 'USART_SEND:\n    MOVWF TXREG\n    RETURN\n',
          tests: [{ name: 'Transmitted phrase', maxSteps: 40000, expect: { TX: 'HCT Dubai' } }],
          solution: 'USART_SEND:\n    MOVWF TXREG\n    BSF RP0\n    BTFSS TRMT\n    GOTO $-1\n    BCF RP0\n    RETURN\n'
        }, 'Without the wait the terminal receives only "Hi": the letters overwrite each other in TXREG.', { hint: 'Copy the routine shown above.' }),
        D.c('printf on the serial port', R`<p>With XC8, <code>printf</code> sends each character through a function <code>void putch(char c)</code> that the program must provide. Write <code>putch</code>: wait while the transmit buffer is full (<code>while (!TXIF);</code>), then write the character into TXREG. The program then prints <code>Hello PIC</code> on the real serial port.</p>`, {
          start: C_UART + R`
void putch(char c) {

}

void main(void) {
    setup();
    printf("Hello PIC\r\n");
    while (1);
}
`, tests: [{ name: 'Characters on TX', maxCycles: 60000, expect: { TX: 'Hello PIC\r\n', BAUD: [9500, 9700] } }],
          solution: C_UART + R`
void putch(char c) {
    while (!TXIF);
    TXREG = c;
}

void main(void) {
    setup();
    printf("Hello PIC\r\n");
    while (1);
}
`
        }, '', { hint: R`<code>while (!TXIF); TXREG = c;</code> TXIF is $1$ when TXREG is empty and can take a new byte.` }),
        D.c('Send a string', R`<p>Write a function <code>void send_string(char *s)</code> which sends the characters of a string on the serial port until the <code>'\0'</code>, waiting for TRMT before each new character. <code>main</code> sends the phrase of Activity 17.</p>`, {
          start: C_UART + R`
void send_string(char *s) {

}

void main(void) {
    setup();
    send_string("HCT Dubai");
    while (1);
}
`, tests: [{ name: 'Characters on TX', maxCycles: 60000, expect: { TX: 'HCT Dubai' } }],
          solution: C_UART + R`
void send_string(char *s) {
    while (*s != '\0') {
        while (!TRMT);
        TXREG = *s;
        s++;
    }
}

void main(void) {
    setup();
    send_string("HCT Dubai");
    while (1);
}
`
        }, '', { hint: R`Loop while <code>*s != '\0'</code>: wait with <code>while (!TRMT);</code>, then <code>TXREG = *s;</code> and <code>s++;</code>.` })
      ]
    },
    {
      title: 'The serial port: receiving (Activities 18 and 19C)',
      objectives: ['You will be able to receive characters with the USART interrupt', 'You will know how the flag RCIF is cleared', 'You will be able to collect a received phrase in a buffer'],
      blocks: [
        D.T(R`<p>The receiver pushes the incoming bits into the receive shift register (RSR); when a byte is complete it moves to <b>RCREG</b> and the flag <b>RCIF</b> (PIR1) is set. The receiver is switched on by <b>CREN</b> (continuous receive, bit 4 of RCSTA) together with SPEN: <code>RCSTA = 0b10010000</code>. The program cannot know when a character will arrive, so the receiver is usually used with its <b>interrupt</b>: RCIE (PIE1), PEIE and GIE must be $1$.</p>`),
        D.KEY('Clearing RCIF', R`<p>RCIF cannot be cleared with <code>BCF RCIF</code>. It is cleared by <b>reading RCREG</b>, even if the value is not used. If the ISR does not read RCREG, the flag stays set and the interrupt repeats forever.</p>`),
        D.T(R`<p><b>Activity 18</b> answers to the letter <code>H</code>: the ISR reads RCREG (which clears RCIF), compares it with <code>'H'</code> and, if equal, sends <code>HCT Dubai</code>. <b>Activity 19C</b> collects a whole phrase: a buffer <code>char phrase[30]</code> is filled by the ISR at the position <code>pointer</code>, which moves forward with each character, until the user presses Enter (the characters <code>'\r'</code> or <code>'\n'</code>). Then the phrase is sent back, and if it is <code>OK</code> the LED on RC0 switches on:</p>`),
        D.CODE(R`unsigned int pointer = 0;
char phrase[30];

void __interrupt() my_isr_routine() {
    phrase[pointer] = RCREG;                   // store the character
    pointer++;                                 // move the pointer
    if (RCREG == '\n' || RCREG == '\r') {      // the user typed enter
        USART_SEND((char*) "Sent msg was: ");
        USART_SEND((char*) phrase);
        pointer = 0;
        if (phrase[0] == 'O' && phrase[1] == 'K') RC0 = 1;
        else RC0 = 0;
    }
}`),
        D.T(R`<p>Note that the lecture code reads RCREG twice: the second read returns the same byte, because no new byte has arrived in between. A safer version reads it once into a variable. In a real program the pointer must also be checked against the size of the buffer, otherwise a long phrase would write past the end of <code>phrase</code>.</p>`),
        D.mc('Clearing the receive flag', 'How is the flag RCIF cleared?', ['By reading RCREG', 'With BCF RCIF', 'By writing TXREG', 'By clearing GIE'], 0, 'Reading the received byte empties RCREG and clears RCIF.', { hint: 'The data register empties when it is read.' }),
        D.mc('Three enables', 'Which bits must be 1 to receive with the interrupt? Select all that apply.', ['RCIE', 'PEIE', 'GIE', 'INTE', 'T0IE'], [0, 1, 2], 'RCIE is a peripheral source, so PEIE and GIE are needed too.', { hint: 'It is a peripheral interrupt.' }),
        D.asm('Activity 18', R`<p>Write the ISR (at <code>0x04</code>) and the SETUP of Activity 18. The ISR reads RCREG, compares it with <code>'H'</code> and calls <code>SEND_MSG</code> if they are equal. SETUP configures TX/RX pins, RCIE, $9600$ baud, the transmitter with BRGH $= 1$, RCSTA $= 10010000B$, PEIE and GIE. The routines that send <code>HCT Dubai</code> and the main code are given. The simulator sends characters to the PIC.</p>`, {
          pre: PRE18, start: '    ORG 0X4\n    ; read RCREG, compare with H, call SEND_MSG if equal\n    RETFIE\n\nSETUP:\n    ; pins, RCIE, SPBRG, TXSTA, RCSTA, PEIE, GIE\n    RETURN\n',
          tests: [{ name: 'H arrives', events: [{ step: 3000, rx: 'H' }], maxSteps: 14000, limitOk: true, expect: { TX: 'HCT Dubai', RCIF: 0, GIE: 1 } }, { name: 'X arrives', events: [{ step: 3000, rx: 'X' }], maxSteps: 14000, limitOk: true, expect: { TX: '', RCIF: 0, GIE: 1 } }, { name: 'H twice', events: [{ step: 3000, rx: 'H' }, { step: 14000, rx: 'H' }], maxSteps: 28000, limitOk: true, expect: { TX: 'HCT DubaiHCT Dubai', GIE: 1 } }],
          solution: '    ORG 0X4\n    MOVF RCREG, W\n    XORLW \'H\'\n    BTFSC ZERO\n    CALL SEND_MSG\n    RETFIE\n\n' + SETUP18
        }, 'Reading RCREG fetches the character and clears RCIF, so each H triggers exactly one message.', { hint: [R`ISR: <code>MOVF RCREG, W</code>, <code>XORLW 'H'</code>, <code>BTFSC ZERO</code>, <code>CALL SEND_MSG</code>, <code>RETFIE</code>.`, 'In SETUP, RCIE, TRISC, SPBRG and TXSTA are in bank 1; RCSTA, PEIE and GIE in bank 0.'] }),
        D.c('Echo', R`<p>Write the interrupt function of a program that sends back every character it receives (an <i>echo</i>), so that the user sees what he types. Read RCREG <b>once</b> into a variable, then wait for TXIF and write the character into TXREG.</p>`, {
          start: C_UART + R`
// the interrupt function


void main(void) {
    setup();
    RCIE = 1;
    PEIE = 1;
    GIE = 1;
    while (1);
}
`, tests: [{ name: 'abc', maxCycles: 60000, events: [{ at: 5000, rx: 'abc' }], expect: { TX: 'abc', RCIF: 0 } }, { name: 'PIC', maxCycles: 60000, events: [{ at: 5000, rx: 'PIC' }], expect: { TX: 'PIC' } }],
          solution: C_UART + R`
void __interrupt() isr(void) {
    char c = RCREG;
    while (!TXIF);
    TXREG = c;
}

void main(void) {
    setup();
    RCIE = 1;
    PEIE = 1;
    GIE = 1;
    while (1);
}
`
        }, '', { hint: R`<code>char c = RCREG; while (!TXIF); TXREG = c;</code>` }),
        D.c('Activity 19C', R`<p>Write the interrupt function of Activity 19C. The variables <code>pointer</code> and <code>phrase[30]</code> exist, and <code>USART_SEND</code> from <code>usart.h</code> sends a string. Store the received character at <code>phrase[pointer]</code> and move the pointer. When the character is <code>'\r'</code> or <code>'\n'</code>: send <code>Sent msg was: </code> and the phrase, reset the pointer to $0$, and switch on RC0 if the phrase starts with <code>OK</code>, otherwise switch it off.</p>`, {
          start: C_UART + R`#include "usart.h"

unsigned int pointer = 0;
char phrase[30];

// the interrupt function


void main(void) {
    setup();
    RC0 = 0;
    RCIE = 1;
    PEIE = 1;
    GIE = 1;
    while (1);
}
`, tests: [
            { name: 'OK and enter', maxCycles: 120000, events: [{ at: 5000, rx: 'OK\r' }], expect: { TX: 'Sent msg was: OK\r', RC0: 1 } },
            { name: 'NO and enter', maxCycles: 120000, events: [{ at: 5000, rx: 'NO\r' }], expect: { TX: 'Sent msg was: NO\r', RC0: 0 } },
            { name: 'OK then HI', maxCycles: 200000, events: [{ at: 5000, rx: 'OK\r' }, { at: 90000, rx: 'HI\r' }], expect: { TX: 'Sent msg was: OK\rSent msg was: HI\r', RC0: 0 } }],
          reqs: [{ re: /USART_SEND/, msg: 'Send with USART_SEND.' }],
          solution: C_UART + R`#include "usart.h"

unsigned int pointer = 0;
char phrase[30];

void __interrupt() my_isr_routine() {
    char c = RCREG;
    phrase[pointer] = c;
    pointer++;
    if (c == '\n' || c == '\r') {
        USART_SEND((char*) "Sent msg was: ");
        USART_SEND((char*) phrase);
        pointer = 0;
        if (phrase[0] == 'O' && phrase[1] == 'K') RC0 = 1;
        else RC0 = 0;
    }
}

void main(void) {
    setup();
    RC0 = 0;
    RCIE = 1;
    PEIE = 1;
    GIE = 1;
    while (1);
}
`
        }, '', { hint: [R`Read the character once: <code>char c = RCREG;</code>`, R`<code>USART_SEND</code> stops after the <code>'\r'</code> at the end of the phrase.`] })
      ]
    }
  ]
});
})();
