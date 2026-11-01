/* Part 13 - Text output: LCD and serial port (Lecture 16/Activity 15, Lectures 18-19/Activities 17 and 18) */
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
const USART_SEND = 'USART_SEND:\n    MOVWF TXREG\n    BSF RP0\n    BTFSS TRMT\n    GOTO $-1\n    BCF RP0\n    RETURN\n';
const SPLIT = 'SPLIT:\n    CLRF  HUND\n    CLRF  TENS\n    MOVF  NUM, W\n    MOVWF UNITS\nSP_H:\n    MOVLW 100\n    SUBWF UNITS, W\n    BTFSS STATUS, 0\n    GOTO  SP_T\n    MOVWF UNITS\n    INCF  HUND, F\n    GOTO  SP_H\nSP_T:\n    MOVLW 10\n    SUBWF UNITS, W\n    BTFSS STATUS, 0\n    RETURN\n    MOVWF UNITS\n    INCF  TENS, F\n    GOTO  SP_T\n';
const TABLE = (name, s) => name + ':\n    ADDWF PCL, F\n' + Array.from(s).map(c => "    RETLW '" + c + "'\n").join('') + '    RETLW 0\n';
D.part({
  title: 'Text output: LCD and serial port',
  intro: R`<p>A program that can show text is much easier to use and to debug. In this part you drive a character LCD with the routines of Activity 15, show messages from tables and numbers as digits, and program the USART to send and receive characters on the serial port (Activities 17 and 18), with the timing problems that come with it.</p>`,
  sections: [
    {
      title: 'Sending bytes to an LCD (Activity 15)',
      objectives: ['You will know the pins and the commands of an HD44780 character LCD', 'You will know how a byte is sent in two nibbles in 4-bit mode', 'You will be able to write a message on the LCD in assembly'],
      blocks: [
        D.T(R`<p>A character LCD shows ASCII characters in a grid of fixed positions: the common <b>$16 \times 2$</b> display has $2$ lines of $16$ characters, each drawn in a $5 \times 8$ dot matrix. It contains its own controller, the Hitachi <b>HD44780</b>, which receives commands and characters from the microcontroller. The important pins are:</p>`),
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
        D.num('Line 2', R`<p>Which command (in hexadecimal) moves the cursor to the first position of line 2?</p>`, ['C0'], R`Set DDRAM address: bit 7 $= 1$ plus the address $40_{16}$: $80_{16} + 40_{16} = C0_{16}$.`, { kind: 'hex', hint: R`Line 2 starts at the DDRAM address $40_{16}$.` }),
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
      title: 'Messages and numbers on the LCD',
      objectives: ['You will be able to show a message stored in a RETLW table', 'You will be able to show the value of a register as decimal digits'],
      blocks: [
        D.T(R`<p>Writing every letter with its own <code>MOVLW</code> and <code>CALL LCD_WRITE</code> works, but it is long and hard to change. A message is better kept in a <code>RETLW</code> table ending with $0$ (Part 9), and printed by a loop that calls the table with the index $0, 1, 2, \ldots$ until it returns $0$. The same loop prints any message.</p>
<p>A number is shown in two steps: split it into its decimal digits (Part 8), then add <code>'0'</code> to each digit to get its character. The LCD shows exactly what it receives: sending the value $7$ instead of the character <code>'7'</code> ($55$) shows a strange symbol.</p>`),
        D.CODE(R`    CLRF    INDEX
LOOP:
    MOVF    INDEX, W
    CALL    MSG          ; W = character number INDEX
    IORLW   0            ; Z = 1 at the end mark
    BTFSC   STATUS, 2
    GOTO    DONE
    CALL    LCD_WRITE    ; show it
    INCF    INDEX, F
    GOTO    LOOP
DONE:`, 'asm', { cap: R`Printing a message from a table. The table must be placed in the first $256$ words of the program, before the long LCD library, because <code>ADDWF PCL, F</code> changes only the low byte of the program counter.` }),
        D.mc('A digit on the LCD', R`<p>A register holds the digit $7$. Which value must be sent to the LCD with RS $= 1$ to show it?</p>`, ['$55$, the ASCII code of the character 7', '$7$', '$0000\\,0111_{2}$ in the high nibble', '$70$'], 0, R`The LCD shows characters: <code>'7'</code> $= 48 + 7 = 55$.`, { hint: R`<code>'0'</code> is $48$.` }),
        D.asm('A message from a table', R`<p>The table <code>MSG</code> (placed early in the program) returns the characters of <code>Hello PIC</code> and then $0$. Write the main code: call SETUP and LCD_BEGIN, move to line 1, and print the message with a loop over the table. The LCD routines are given after your code.</p>`, {
          pre: LCD_DEFS + 'INDEX EQU 0x24\n' + TABLE('MSG', 'Hello PIC'), post: LCD_4L + LCD_REST,
          start: 'MAIN:\n    CALL SETUP\n    CALL LCD_BEGIN\n    CALL LCD_LIN1\n    ; print the table MSG with a loop\n\n    GOTO $\n',
          tests: [{ name: 'The display', maxSteps: 120000, expect: { LCD1: 'Hello PIC', LCDON: 1 } }],
          reqs: [{ re: /CALL\s+MSG/i, msg: 'Read the characters with CALL MSG.' }],
          solution: 'MAIN:\n    CALL SETUP\n    CALL LCD_BEGIN\n    CALL LCD_LIN1\n    CLRF INDEX\nLOOP:\n    MOVF INDEX, W\n    CALL MSG\n    IORLW 0\n    BTFSC STATUS, 2\n    GOTO DONE\n    CALL LCD_WRITE\n    INCF INDEX, F\n    GOTO LOOP\nDONE:\n    GOTO $\n'
        }, R`The loop of the example: <code>IORLW 0</code> sets Z for the end mark without changing W, so the character can be passed to <code>LCD_WRITE</code>.`, { hint: 'Copy the loop shown above between CALL LCD_LIN1 and GOTO $.' }),
        D.asm('A number on the LCD', R`<p>Show <code>N=</code> followed by the three digits of the register NUM on line 1 (for example <code>N=047</code>). The subroutine <code>SPLIT</code> (given) puts the digits of NUM into HUND, TENS and UNITS. The LCD routines are given after your code.</p>`, {
          pre: LCD_DEFS + 'NUM   EQU 0x20\nHUND  EQU 0x21\nTENS  EQU 0x22\nUNITS EQU 0x23\n' + SPLIT, post: LCD_4L + LCD_REST,
          start: "MAIN:\n    CALL SETUP\n    CALL LCD_BEGIN\n    CALL LCD_LIN1\n    ; N= and the three digits of NUM\n\n    GOTO $\n",
          tests: [[173, 'N=173'], [47, 'N=047'], [0, 'N=000']].map(([v, t]) => ({ name: R`$\text{NUM} = ` + v + R`$`, init: { NUM: v }, maxSteps: 120000, expect: { LCD1: t } })),
          solution: "MAIN:\n    CALL SETUP\n    CALL LCD_BEGIN\n    CALL LCD_LIN1\n    MOVLW 'N'\n    CALL LCD_WRITE\n    MOVLW '='\n    CALL LCD_WRITE\n    CALL SPLIT\n    MOVF HUND, W\n    ADDLW '0'\n    CALL LCD_WRITE\n    MOVF TENS, W\n    ADDLW '0'\n    CALL LCD_WRITE\n    MOVF UNITS, W\n    ADDLW '0'\n    CALL LCD_WRITE\n    GOTO $\n"
        }, R`SPLIT finds the digits; <code>ADDLW '0'</code> turns each digit into its character before <code>LCD_WRITE</code>.`, { hint: [R`<code>MOVLW 'N'</code>, <code>CALL LCD_WRITE</code>, the same for <code>'='</code>, then <code>CALL SPLIT</code>.`, R`For each digit: <code>MOVF HUND, W</code>, <code>ADDLW '0'</code>, <code>CALL LCD_WRITE</code>.`] })
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
        D.num('SPBRG with BRGH = 0', R`<p>Which SPBRG value gives $2400$ baud at $4\ \mathrm{MHz}$ with BRGH $= 0$ (the factor is $64$)? Round to the nearest integer.</p>`, 25, R`$\frac{4\,000\,000}{64 \times 2400} - 1 = 25.04 \approx 25$.`, { hint: R`$SPBRG = \frac{F_{\text{osc}}}{64 \times \text{Baud}} - 1$.` }),
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
        D.asm('Send a message from a table', R`<p>Send the message of the table <code>MSG</code> (<code>Ready</code>, then $0$) on the serial port, character by character with the given <code>USART_SEND</code>, which waits for TRMT. SETUP is given after your code.</p>`, {
          pre: 'INDEX EQU 0x20\n' + VEC + TABLE('MSG', 'Ready'), post: SETUP17 + USART_SEND,
          start: 'MAIN:\n    CALL SETUP\n    ; send the table MSG with a loop\n\n    GOTO $\n',
          tests: [{ name: 'Transmitted text', maxSteps: 30000, expect: { TX: 'Ready' } }],
          reqs: [{ re: /CALL\s+MSG/i, msg: 'Read the characters with CALL MSG.' }],
          solution: 'MAIN:\n    CALL SETUP\n    CLRF INDEX\nLOOP:\n    MOVF INDEX, W\n    CALL MSG\n    IORLW 0\n    BTFSC STATUS, 2\n    GOTO DONE\n    CALL USART_SEND\n    INCF INDEX, F\n    GOTO LOOP\nDONE:\n    GOTO $\n'
        }, R`The same table loop as for the LCD, with <code>USART_SEND</code> instead of <code>LCD_WRITE</code>.`, { hint: 'Use the loop of the LCD message, calling USART_SEND for each character.' })
      ]
    },
    {
      title: 'The serial port: receiving (Activity 18)',
      objectives: ['You will be able to receive characters with the USART interrupt', 'You will know how the flag RCIF is cleared', 'You will be able to collect received characters in a buffer'],
      blocks: [
        D.T(R`<p>The receiver pushes the incoming bits into the receive shift register (RSR); when a byte is complete it moves to <b>RCREG</b> and the flag <b>RCIF</b> (PIR1) is set. The receiver is switched on by <b>CREN</b> (continuous receive, bit 4 of RCSTA) together with SPEN: <code>RCSTA = 0b10010000</code>. The program cannot know when a character will arrive, so the receiver is usually used with its <b>interrupt</b>: RCIE (PIE1), PEIE and GIE must be $1$.</p>`),
        D.KEY('Clearing RCIF', R`<p>RCIF cannot be cleared with <code>BCF RCIF</code>. It is cleared by <b>reading RCREG</b>, even if the value is not used. If the ISR does not read RCREG, the flag stays set and the interrupt repeats forever.</p>`),
        D.T(R`<p><b>Activity 18</b> answers to the letter <code>H</code>: the ISR reads RCREG (which clears RCIF), compares it with <code>'H'</code> and, if equal, sends <code>HCT Dubai</code>. To collect a whole phrase, the ISR stores each received character in a buffer of RAM through a pointer (Part 9): the next free address is kept in a variable, copied into FSR, and incremented after each character. A real program also checks the pointer against the end of the buffer, so that a long phrase cannot overwrite other variables.</p>`),
        D.mc('Clearing the receive flag', 'How is the flag RCIF cleared?', ['By reading RCREG', 'With BCF RCIF', 'By writing TXREG', 'By clearing GIE'], 0, 'Reading the received byte empties RCREG and clears RCIF.', { hint: 'The data register empties when it is read.' }),
        D.mc('Three enables', 'Which bits must be 1 to receive with the interrupt? Select all that apply.', ['RCIE', 'PEIE', 'GIE', 'INTE', 'T0IE'], [0, 1, 2], 'RCIE is a peripheral source, so PEIE and GIE are needed too.', { hint: 'It is a peripheral interrupt.' }),
        D.asm('Activity 18', R`<p>Write the ISR (at <code>0x04</code>) and the SETUP of Activity 18. The ISR reads RCREG, compares it with <code>'H'</code> and calls <code>SEND_MSG</code> if they are equal. SETUP configures TX/RX pins, RCIE, $9600$ baud, the transmitter with BRGH $= 1$, RCSTA $= 10010000B$, PEIE and GIE. The routines that send <code>HCT Dubai</code> and the main code are given. The simulator sends characters to the PIC.</p>`, {
          pre: PRE18, start: '    ORG 0X4\n    ; read RCREG, compare with H, call SEND_MSG if equal\n    RETFIE\n\nSETUP:\n    ; pins, RCIE, SPBRG, TXSTA, RCSTA, PEIE, GIE\n    RETURN\n',
          tests: [{ name: 'H arrives', events: [{ step: 3000, rx: 'H' }], maxSteps: 14000, limitOk: true, expect: { TX: 'HCT Dubai', RCIF: 0, GIE: 1 } }, { name: 'X arrives', events: [{ step: 3000, rx: 'X' }], maxSteps: 14000, limitOk: true, expect: { TX: '', RCIF: 0, GIE: 1 } }, { name: 'H twice', events: [{ step: 3000, rx: 'H' }, { step: 14000, rx: 'H' }], maxSteps: 28000, limitOk: true, expect: { TX: 'HCT DubaiHCT Dubai', GIE: 1 } }],
          solution: '    ORG 0X4\n    MOVF RCREG, W\n    XORLW \'H\'\n    BTFSC ZERO\n    CALL SEND_MSG\n    RETFIE\n\n' + SETUP18
        }, 'Reading RCREG fetches the character and clears RCIF, so each H triggers exactly one message.', { hint: [R`ISR: <code>MOVF RCREG, W</code>, <code>XORLW 'H'</code>, <code>BTFSC ZERO</code>, <code>CALL SEND_MSG</code>, <code>RETFIE</code>.`, 'In SETUP, RCIE, TRISC, SPBRG and TXSTA are in bank 1; RCSTA, PEIE and GIE in bank 0.'] }),
        D.asm('Echo', R`<p>Write an ISR which sends back every character it receives (an <i>echo</i>), so that the user sees what they type. Read RCREG <b>once</b> (this clears RCIF), write the character into TXREG and wait for TRMT before returning. The main code and SETUP (receiver, transmitter and interrupts on) are given after your code.</p>`, {
          pre: '    ORG 0\n    GOTO MAIN\n    ORG 0X4\n', post: 'MAIN:\n    CALL SETUP\n    GOTO $\n' + SETUP18,
          start: '    ; read RCREG, send it back\n\n    RETFIE\n',
          tests: [{ name: 'abc', events: [{ step: 3000, rx: 'abc' }], maxSteps: 30000, limitOk: true, expect: { TX: 'abc', RCIF: 0 } }, { name: 'PIC', events: [{ step: 3000, rx: 'PIC' }], maxSteps: 30000, limitOk: true, expect: { TX: 'PIC' } }],
          solution: '    MOVF  RCREG, W      ; read once: clears RCIF\n    MOVWF TXREG         ; send it back\n    BSF   RP0\n    BTFSS TRMT          ; wait until sent\n    GOTO  $-1\n    BCF   RP0\n    RETFIE\n'
        }, R`Reading RCREG gives the character and clears RCIF; the ISR then works like <code>USART_SEND</code>.`, { hint: [R`<code>MOVF RCREG, W</code> and <code>MOVWF TXREG</code>.`, R`Then wait for TRMT in bank 1, as in <code>USART_SEND</code>, and return to bank 0 before <code>RETFIE</code>.`] }),
        D.asm('A receive buffer', R`<p>Write an ISR which stores every received character in a buffer starting at $30_{16}$. The variable PTR holds the address of the next free place (the main code sets it to $30_{16}$): copy it into FSR, store RCREG through INDF, and increment PTR.</p>`, {
          pre: 'PTR EQU 0x20\n    ORG 0\n    GOTO MAIN\n    ORG 0X4\n', post: 'MAIN:\n    MOVLW 0x30\n    MOVWF PTR\n    CALL SETUP\n    GOTO $\n' + SETUP18,
          start: '    ; store RCREG at the address in PTR\n\n    RETFIE\n',
          tests: [{ name: 'HELLO', events: [{ step: 3000, rx: 'HELLO' }], maxSteps: 30000, limitOk: true, expect: { 'RAM[0x30]': 72, 'RAM[0x31]': 69, 'RAM[0x32]': 76, 'RAM[0x33]': 76, 'RAM[0x34]': 79, PTR: 0x35, RCIF: 0 } }],
          solution: '    MOVF  PTR, W\n    MOVWF FSR           ; point to the next free place\n    MOVF  RCREG, W      ; read: clears RCIF\n    MOVWF INDF          ; store it\n    INCF  PTR, F\n    RETFIE\n'
        }, R`Each interrupt writes one character at the address in PTR and moves PTR forward: <code>HELLO</code> fills $30_{16} \ldots 34_{16}$ and PTR ends at $35_{16}$.`, { hint: R`<code>MOVF PTR, W</code>, <code>MOVWF FSR</code>, <code>MOVF RCREG, W</code>, <code>MOVWF INDF</code>, <code>INCF PTR, F</code>.` })
      ]
    }
  ]
});
})();
