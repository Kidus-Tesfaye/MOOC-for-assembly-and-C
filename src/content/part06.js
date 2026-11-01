/* Part 6 - Functions and subroutines (Lecture 4: CALL/RETURN and the stack; Lectures 6 and 8: program templates; Activity 7 RETLW) */
(function () {
const ASTART = '; write your code here\n';
D.part({
  title: 'Functions and subroutines',
  intro: R`<p>Large programs are built from small, named pieces: <b>functions</b> in C and <b>subroutines</b> in assembly. In this part you write your own functions, see how the processor remembers where to return with its <b>stack</b>, return values in W with <code>RETLW</code>, build look-up tables, and learn the standard structure of a complete PIC program.</p>`,
  sections: [
    {
      title: 'Functions in C',
      objectives: ['You will be able to define and call your own functions', 'You will know what parameters and return values are', 'You will know where local variables exist'],
      blocks: [
        D.T(R`<p>A <b>function</b> is a named block of code that can be called from other places of the program. You have used functions all along: <code>printf</code>, <code>scanf</code> and <code>main</code> itself. Every lecture activity in C also defines a function called <code>setup</code>:</p>`),
        D.CODE(R`void setup() {
    PORTD = 0;              // clear portd
    OSCCON = 0b01100000;    // select 4MHz oscillator
    TRISD = 0b00000110;     // define in and out
}

void main(void) {
    setup();                // this is how the function is called
    while (1) {
        // ...
    }
}`),
        D.T(R`<p>The word <code>void</code> before the name means that the function returns no value, and the empty parentheses mean that it takes no input. A function must be defined (or at least declared) before the place where it is called, which is why the lecture places <code>setup</code> above <code>main</code>.</p>
<p>A function can receive <b>parameters</b> and give back a <b>return value</b>. The type of the result is written before the name, and the parameters are declared in the parentheses:</p>`),
        D.CODE(R`#include <stdio.h>

int square(int x) {
    return x * x;
}

int add(int a, int b) {
    int sum = a + b;      // sum is a local variable
    return sum;
}

void main(void) {
    printf("%d\n", square(7));
    printf("%d\n", add(25, 30));
    printf("%d\n", square(add(1, 2)));
}`),
        D.OUT(R`49
55
9`),
        D.T(R`<p>When <code>square(7)</code> is called, the parameter <code>x</code> receives a copy of the value $7$; <code>return</code> ends the function and gives the value of <code>x * x</code> back to the caller. Variables declared inside a function, like <code>sum</code>, are <b>local</b>: they exist only while the function runs, and other functions cannot see them. Variables declared outside every function are <b>global</b> and can be used everywhere.</p>`),
        D.INFO('Testing functions', R`<p>In the exercises of this part the tests call your function directly with different arguments and check the value it returns, so the program does not need a <code>main</code> function (you may still add one to try your code with Run). Keep the exact name and parameters given in the exercise.</p>`),
        D.c('Absolute value', R`<p>Write a function <code>int absolute(int x)</code> which returns the absolute value $|x|$ of its parameter: $x$ itself if it is positive or zero, and $-x$ otherwise.</p>`, {
          start: R`int absolute(int x) {

}
`, tests: [{ call: 'absolute', args: [5], ret: 5 }, { call: 'absolute', args: [-12], ret: 12 }, { call: 'absolute', args: [0], ret: 0 }, { call: 'absolute', args: [-32767], ret: 32767 }],
          solution: R`int absolute(int x) {
    if (x < 0) {
        return -x;
    }
    return x;
}
`
        }, '', { hint: R`<code>if (x &lt; 0) return -x;</code> and otherwise <code>return x;</code>` }),
        D.c('Biggest of three', R`<p>Write a function <code>int max3(int a, int b, int c)</code> which returns the biggest of its three parameters.</p>`, {
          start: R`int max3(int a, int b, int c) {

}
`, tests: [{ call: 'max3', args: [4, 9, 2], ret: 9 }, { call: 'max3', args: [10, 3, 7], ret: 10 }, { call: 'max3', args: [-5, -2, -9], ret: -2 }, { call: 'max3', args: [6, 6, 6], ret: 6 }, { call: 'max3', args: [1, 2, 300], ret: 300 }],
          solution: R`int max3(int a, int b, int c) {
    int m = a;
    if (b > m) m = b;
    if (c > m) m = c;
    return m;
}
`
        }, '', { hint: 'Keep the biggest value found so far in a local variable, starting from a.' }),
        D.c('Factorial', R`<p>Write a function <code>long factorial(int n)</code> which returns $n! = 1 \times 2 \times 3 \times \ldots \times n$ for $0 \leq n \leq 12$ (by definition $0! = 1$). Use a loop. The result is a <code>long</code> because $12! = 479\,001\,600$.</p>`, {
          start: R`long factorial(int n) {

}
`, tests: [{ call: 'factorial', args: [5], ret: 120 }, { call: 'factorial', args: [0], ret: 1 }, { call: 'factorial', args: [1], ret: 1 }, { call: 'factorial', args: [12], ret: 479001600 }, { call: 'factorial', args: [8], ret: 40320 }],
          solution: R`long factorial(int n) {
    long result = 1;
    for (int i = 2; i <= n; i++) {
        result = result * i;
    }
    return result;
}
`
        }, '', { hint: [R`Start with <code>long result = 1;</code> and multiply it by $2, 3, \ldots, n$ in a loop.`, 'XC8 does not allow a function to call itself (recursion) on this chip, so use a loop.'] }),
        D.c('Is it even?', R`<p>Write a function <code>int is_even(int n)</code> which returns $1$ if <code>n</code> is even and $0$ if it is odd.</p>`, {
          start: R`int is_even(int n) {

}
`, tests: [{ call: 'is_even', args: [4], ret: 1 }, { call: 'is_even', args: [7], ret: 0 }, { call: 'is_even', args: [0], ret: 1 }, { call: 'is_even', args: [-3], ret: 0 }, { call: 'is_even', args: [-8], ret: 1 }],
          solution: R`int is_even(int n) {
    return n % 2 == 0;
}
`
        }, '', { hint: R`A number is even when the remainder of the division by $2$ is $0$. A comparison already gives $1$ or $0$.` }),
        D.c('Count the digits', R`<p>Write a function <code>int digits(long n)</code> which returns the number of decimal digits of a non-negative number ($0$ has one digit). Divide by $10$ until nothing is left.</p>`, {
          start: R`int digits(long n) {

}
`, tests: [{ call: 'digits', args: [7], ret: 1 }, { call: 'digits', args: [0], ret: 1 }, { call: 'digits', args: [1023], ret: 4 }, { call: 'digits', args: [86400], ret: 5 }, { call: 'digits', args: [2000000000], ret: 10 }],
          solution: R`int digits(long n) {
    int count = 1;
    while (n >= 10) {
        n = n / 10;
        count++;
    }
    return count;
}
`
        }, '', { hint: R`Every division by $10$ removes one digit: count the divisions while <code>n &gt;= 10</code>, starting from $1$.` }),
        D.mc('Local variables', R`<p>What does this program print?</p>`, ['<code>5</code>', '<code>6</code>', '<code>0</code>', 'It does not compile'], 0, R`The function receives a <i>copy</i> of the value; changing the parameter <code>x</code> does not change the variable <code>a</code> of <code>main</code>.`, { snippet: { text: R`void change(int x) {
    x = x + 1;
}

void main(void) {
    int a = 5;
    change(a);
    printf("%d\n", a);
}`, lang: 'c' }, hint: 'A parameter receives a copy of the value.' })
      ]
    },
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
        D.SIDE(R`void add_three(void) {
    w = w + 3;
}

void main(void) {
    w = 5;
    add_three();    // w = 8
    add_three();    // w = 11
    while (1);
}`, R`    MOVLW   5
    CALL    ADD_THREE   ; W = 8
    CALL    ADD_THREE   ; W = 11
    GOTO    $

ADD_THREE:
    ADDLW   3
    RETURN`, { cap: R`The subroutine is placed after the <code>GOTO $</code> of the main code, so that the processor can reach it only through a <code>CALL</code>.` }),
        D.KEY('Never fall into a subroutine', R`<p>A subroutine must only be entered with <code>CALL</code>. If the main code runs into it by accident (for example because the <code>GOTO $</code> or the main loop is missing), its <code>RETURN</code> finds an empty stack. That is why the lecture template places <code>MAIN</code> first, ends it with an endless loop, and writes the subroutines after it.</p>`),
        D.trace('Trace a subroutine', 'Follow the program with CALL and RETURN. Write W after each executed instruction.', { code: 'MOVLW 5\nCALL ADD10\nCALL ADD10\nGOTO $\nADD10:\nADDLW 10\nRETURN', watch: ['W'], maxRows: 7 }, R`W $= 5$; the first call adds $10$ ($15$) and returns; the second call adds $10$ again ($25$).`, { hint: 'After RETURN the program continues with the instruction after the CALL.' }),
        D.mc('LIFO', 'The stack follows the sequence ...', ['Last in, first out', 'First in, first out', 'Random order', 'Address order'], 0, 'The return address pushed last is popped first: the innermost call returns first.', { hint: 'Think of a pile of plates.' }),
        D.num('Stack size', R`<p>How many levels does the stack of the PIC16F887 have?</p>`, 8, 'The hardware stack has 8 levels.', { hint: 'Nested calls are limited to this number.' }),
        D.asm('A doubling subroutine', R`<p>Write a subroutine <code>DOUBLE</code> which doubles the value of W ($W \leftarrow 2W$, for results up to $255$). The main code is given: it calls <code>DOUBLE</code> three times starting from $W = 5$, so W must end as $40$.</p>`, {
          pre: '    MOVLW 5\n    CALL DOUBLE\n    CALL DOUBLE\n    CALL DOUBLE\n    MOVWF RESULT\n    GOTO $\nRESULT EQU 0x20\nTEMP EQU 0x21', start: 'DOUBLE:\n    ; double W\n\n    RETURN\n',
          tests: [{ expect: { RESULT: 40 } }], solution: 'DOUBLE:\n    MOVWF TEMP\n    ADDWF TEMP, W\n    RETURN\n'
        }, R`Store W in TEMP and add it to W again: $W + W = 2W$.`, { hint: R`Copy W into TEMP with <code>MOVWF TEMP</code>, then <code>ADDWF TEMP, W</code> calculates $TEMP + W$.` }),
        D.asm('Fix the fall-through', R`<p>This program should leave $15$ in RESULT, but the assembler simulator reports a RETURN with an empty stack. Add the one missing instruction.</p>`, {
          pre: 'RESULT EQU 0x20', start: '    MOVLW 5\n    CALL ADD_TEN\n    MOVWF RESULT\nADD_TEN:\n    ADDLW 10\n    RETURN\n',
          tests: [{ expect: { RESULT: 15 } }], solution: '    MOVLW 5\n    CALL ADD_TEN\n    MOVWF RESULT\n    GOTO $\nADD_TEN:\n    ADDLW 10\n    RETURN\n'
        }, 'Without GOTO $ after MOVWF RESULT, the processor runs into ADD_TEN and its RETURN finds an empty stack.', { hint: 'The main code must stop before the subroutine.' })
      ]
    },
    {
      title: 'Returning values and look-up tables',
      objectives: ['You will know that a subroutine returns a value in W', 'You will be able to use RETLW to return a constant', 'You will be able to build a look-up table'],
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
        D.SIDE(R`unsigned char square(unsigned char i) {
    switch (i) {
        case 0: return 0;
        case 1: return 1;
        case 2: return 4;
        case 3: return 9;
        default: return 16;
    }
}`, R`SQUARE:              ; W = index 0 ... 4
    ADDWF   PCL, F   ; jump W lines forward
    RETLW   0
    RETLW   1
    RETLW   4
    RETLW   9
    RETLW   16`, { cap: R`In assembly the table jumps directly to the answer. In C a table is usually written as an array (Part 9). A table must not cross a $256$-word boundary of the program memory, because only the low byte of the PC is changed.` }),
        D.mc('RETLW', 'What does <code>RETLW 00000111B</code> do?', ['It puts 00000111B in W and returns from the subroutine', 'It returns and clears W', 'It compares W with 00000111B', 'It jumps to address 7'], 0, 'RETLW = return with literal in W.', { hint: 'RETurn with Literal in W.' }),
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
        }, R`<code>ADDWF PCL, F</code> jumps W instructions forward, onto the RETLW of that digit.`, { hint: 'After ADDWF PCL, F write ten RETLW instructions, one per digit, in order.' })
      ]
    },
    {
      title: 'The structure of a complete program',
      objectives: ['You will know the order of the parts of an assembly program and of a C program', 'You will know what the configuration bits are', 'You will be able to compare C and assembly as the lecture does'],
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
        D.T(R`<p>The <b>configuration bits</b> are settings stored in the chip together with the program: they are not in the RAM and the program does not change them while it runs. MPLAB X can generate them from a window of options. The activities use:</p>`),
        D.TABLE(['Setting', 'Meaning'], [
          ['<code>FOSC = INTRC_NOCLKOUT</code>', 'use the internal oscillator; the pins RA6 and RA7 stay normal I/O pins'],
          ['<code>WDTE = OFF</code>', 'no watchdog timer (a timer that resets a program that hangs)'],
          ['<code>PWRTE = OFF</code>', 'no power-up timer'],
          ['<code>MCLRE = OFF</code>', 'the pin MCLR is used as the input RE3, not as a reset pin'],
          ['<code>CP = OFF</code>, <code>CPD = OFF</code>', 'the program and the data are not protected against reading'],
          ['<code>BOREN = OFF</code>', 'no brown-out reset (reset when the supply voltage drops)'],
          ['<code>LVP = OFF</code>', 'no low-voltage programming: RB3 is a normal I/O pin']
        ]),
        D.H('The C template'),
        D.T(R`<p>A C project (Lecture 8) contains the same parts: the configuration bits as <code>#pragma config</code> lines, <code>#include &lt;xc.h&gt;</code> (the C version of <code>xc.inc</code>), <code>#define _XTAL_FREQ 4000000</code>, the <code>setup</code> function and <code>main</code> with its endless loop. In C there is no need to select the RAM banks: the compiler does it. The binary values of assembly such as <code>01100000B</code> are written <code>0b01100000</code>.</p>`),
        D.CODE(R`#pragma config FOSC = INTRC_NOCLKOUT
#pragma config WDTE = OFF
#pragma config MCLRE = OFF
#pragma config LVP = OFF
#include <xc.h>
#define _XTAL_FREQ 4000000

void setup() {
    PORTD = 0;
    OSCCON = 0b01100000;
    TRISD = 0b00000110;
}

void main(void) {
    setup();
    while (1) {
        // the main task
    }
}`),
        D.TABLE(['', 'C', 'Assembly'], [
          ['Writing the code', 'easier and shorter', 'longer: every step goes through W'],
          ['Control of the registers', 'the compiler chooses the registers and the banks', 'direct control of every register'],
          ['Execution time', 'cannot be predicted exactly', 'known exactly, instruction by instruction'],
          ['Place in Flash memory', 'chosen by the compiler (in the lecture the code starts at <code>0x7DD</code>)', 'chosen with <code>ORG</code>']
        ], { cap: 'The conclusions of Lecture 8 about C and assembly. The two Activity 5 programs do the same work but produce different machine code.' }),
        D.order('Template order', 'Put the parts of an assembly program in the order of the lecture template.', ['Description of the code (comments)', 'Include of xc.inc', 'Configuration bits', 'Interrupt code at ORG 0X4', 'Main code', 'SETUP function', 'Other functions'], 'Description, include, configuration, interrupt, main, setup, other functions.', { hint: 'The interrupt code must be at address 4, before the main code.' }),
        D.mc('The reset vector', 'Where does the processor start after the chip is powered up or reset?', ['At address 0 of the Flash memory', 'At address 4', 'At the label MAIN', 'At the last instruction'], 0, 'Address 0 is the reset vector; address 4 is the interrupt vector.', { hint: 'ORG 0 is called the reset vector.' }),
        D.tf('CONFIG in RAM', 'The configuration words are located in the RAM.', false, 'They are stored with the program in the chip, not in the RAM, and the program does not change them while it runs.', { hint: 'Are they changed while the program runs?' }),
        D.mc('Which is true?', 'Which statement matches the conclusions of Lecture 8?', ['In assembly you know exactly how long each instruction takes; in C you cannot predict the execution time exactly', 'C programs always run faster than assembly', 'In C you must select the RAM banks yourself', 'Assembly code is always placed by the compiler'], 0, 'C is easier, assembly gives direct control and exact timing.', { hint: 'Which language shows every instruction that is executed?' }),
        D.fill('The C template', 'Complete the skeleton of a C program for the PIC.', '#include <{{xc.h}}>\n#define {{_XTAL_FREQ}} 4000000\n\nvoid {{setup}}() {\n    OSCCON = 0b01100000;\n}\n\nvoid main(void) {\n    setup();\n    {{while}} (1) {\n    }\n}', 'xc.h gives the register names, _XTAL_FREQ the clock for the delays, setup configures the chip and while (1) repeats forever.', { lang: 'c', cs: true, hint: 'Look at the template above.' })
      ]
    }
  ]
});
})();
