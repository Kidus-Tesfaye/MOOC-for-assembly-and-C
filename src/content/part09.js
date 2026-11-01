/* Part 9 - Arrays, strings and pointers (buffers and ASCII of Lectures 16-20, Activity 20C digit conversion; indirect addressing) */
(function () {
const START = R`#include <stdio.h>

void main(void) {

}
`;
const ASTART = '; write your code here\n\n    GOTO $\n';
D.part({
  title: 'Arrays, strings and pointers',
  intro: R`<p>So far every variable held one value. An <b>array</b> holds many values of the same type, one after the other in memory; a <b>string</b> is an array of characters; and a <b>pointer</b> is a variable that holds the address of another variable. The serial port programs of the lectures use all three: a buffer <code>char phrase[30]</code>, an index into it, and <code>(char*)</code> casts. In assembly the same ideas are built with <b>indirect addressing</b>.</p>`,
  sections: [
    {
      title: 'Arrays',
      objectives: ['You will be able to declare, initialise and use an array', 'You will be able to go through an array with a loop', 'You will be able to pass an array to a function'],
      blocks: [
        D.T(R`<p>An array is declared with its size in square brackets. Its elements are numbered from $0$: an array of $5$ elements has the indexes $0 \ldots 4$.</p>`),
        D.CODE(R`int samples[5] = {12, 7, 30, 4, 18};   // 5 ints, initialised
samples[1] = 8;                          // change the second element
printf("%d\n", samples[0] + samples[4]); // 12 + 18 = 30

int total = 0;
for (int i = 0; i < 5; i++) {
    total += samples[i];
}
printf("%d\n", total);`),
        D.OUT(R`30
72`),
        D.T(R`<p>The elements are stored next to each other: <code>samples</code> uses $5 \times 2 = 10$ bytes, and <code>sizeof(samples) / sizeof(samples[0])</code> gives the number of elements. C does <b>not</b> check the indexes: <code>samples[5]</code> silently reads or writes the memory after the array, a classic source of bugs. (The simulator of this course stops the program with an error instead, to help you find the mistake.)</p>
<p>Remember that the PIC16F887 has only $368$ bytes of RAM: an array of $200$ <code>int</code> values would not even fit.</p>`),
        D.T(R`<p>An array is passed to a function as its address, together with its length. The parameter is written <code>int *a</code> or <code>int a[]</code> (the two mean the same); inside the function it is used with indexes as usual, and changes made through it change the original array:</p>`),
        D.CODE(R`int sum(int *a, int n) {
    int s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s;
}`),
        D.c('Maximum of an array', R`<p>Write a function <code>int max_value(int *a, int n)</code> which returns the biggest of the <code>n</code> elements of the array (n $\geq 1$).</p>`, {
          start: R`int max_value(int *a, int n) {

}
`, tests: [{ call: 'max_value', args: [[3, 9, 2, 7], 4], ret: 9 }, { call: 'max_value', args: [[-5, -2, -8], 3], ret: -2 }, { call: 'max_value', args: [[42], 1], ret: 42 }, { call: 'max_value', args: [[1, 2, 3, 4, 100], 5], ret: 100 }],
          solution: R`int max_value(int *a, int n) {
    int m = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] > m) m = a[i];
    }
    return m;
}
`
        }, '', { hint: R`Start with <code>m = a[0]</code> and compare it with every other element.` }),
        D.c('Count above a limit', R`<p>Write a function <code>int count_above(int *a, int n, int limit)</code> which returns how many elements are greater than <code>limit</code>. (For example, how many temperature samples exceeded $40$.)</p>`, {
          start: R`int count_above(int *a, int n, int limit) {

}
`, tests: [{ call: 'count_above', args: [[35, 42, 40, 51, 12], 5, 40], ret: 2 }, { call: 'count_above', args: [[1, 2, 3], 3, 5], ret: 0 }, { call: 'count_above', args: [[10, 20, 30], 3, 0], ret: 3 }],
          solution: R`int count_above(int *a, int n, int limit) {
    int c = 0;
    for (int i = 0; i < n; i++) {
        if (a[i] > limit) c++;
    }
    return c;
}
`
        }, '', { hint: 'A counter, a loop and an if.' }),
        D.c('Reverse in place', R`<p>Write a function <code>void reverse(int *a, int n)</code> which reverses the order of the elements of the array itself: the first element changes place with the last, the second with the one before the last, and so on.</p>`, {
          start: R`void reverse(int *a, int n) {

}
`, tests: [{ call: 'reverse', args: [[1, 2, 3, 4, 5], 5], arrays: [[5, 4, 3, 2, 1]] }, { call: 'reverse', args: [[7, 8], 2], arrays: [[8, 7]] }, { call: 'reverse', args: [[9, 1, 4, 6], 4], arrays: [[6, 4, 1, 9]] }],
          solution: R`void reverse(int *a, int n) {
    for (int i = 0; i < n / 2; i++) {
        int t = a[i];
        a[i] = a[n - 1 - i];
        a[n - 1 - i] = t;
    }
}
`
        }, '', { hint: [R`Swap <code>a[i]</code> and <code>a[n - 1 - i]</code> for $i = 0 \ldots \frac{n}{2} - 1$.`, 'Use a temporary variable for the swap, as in Part 1.'] }),
        D.c('Moving average', R`<p>Sensor readings are noisy; a common fix is to average the last samples. Write a function <code>int average(int *a, int n)</code> which returns the integer average of the array. Use a <code>long</code> for the sum.</p>`, {
          start: R`int average(int *a, int n) {

}
`, tests: [{ call: 'average', args: [[500, 510, 490, 505], 4], ret: 501 }, { call: 'average', args: [[1023, 1023, 1023, 1023, 1023, 1023, 1023, 1023], 8], ret: 1023 }, { call: 'average', args: [[30000, 30000, 30000], 3], ret: 30000 }],
          solution: R`int average(int *a, int n) {
    long s = 0;
    for (int i = 0; i < n; i++) {
        s += a[i];
    }
    return s / n;
}
`
        }, '', { hint: R`$3 \times 30000$ does not fit in an int: accumulate in <code>long s</code>.` }),
        D.num('Size of an array', R`<p>What is <code>sizeof(t)</code> for <code>long t[6];</code> with XC8?</p>`, 24, R`$6 \times 4 = 24$ bytes.`, { hint: 'A long has 4 bytes.' }),
        D.mc('Out of bounds', R`<p>For <code>char buf[8];</code>, which indexes are valid?</p>`, ['$0 \\ldots 7$', '$1 \\ldots 8$', '$0 \\ldots 8$', 'any index'], 0, 'An array of 8 elements has the indexes 0 to 7.', { hint: 'Indexes start at 0.' })
      ]
    },
    {
      title: 'Characters and strings',
      objectives: ['You will know how characters are stored as ASCII codes', 'You will know that a C string ends with the character <code>\\0</code>', 'You will be able to convert between digits and numbers, as in Activity 20C'],
      blocks: [
        D.T(R`<p>A character is stored as a number, its <b>ASCII code</b>: <code>'A'</code> is $65$, <code>'a'</code> is $97$, the space is $32$ and the digit <code>'0'</code> is $48$. The lecture table shows the codes of the digits:</p>`),
        D.TABLE(['Character', R`<code>'0'</code>`, R`<code>'1'</code>`, R`<code>'2'</code>`, '…', R`<code>'9'</code>`, R`<code>'A'</code>`, R`<code>'a'</code>`], [['Decimal', '48', '49', '50', '…', '57', '65', '97'], ['Hexadecimal', '30', '31', '32', '…', '39', '41', '61']], { small: true }),
        D.T(R`<p>Because the digits are consecutive, the value of a digit character is its code minus $48$: <code>'7' - '0'</code> $= 55 - 48 = 7$. Activity 20C converts the three characters of a speed such as <code>"125"</code> into the number $125$ exactly like this, multiplying each digit by its weight:</p>
$$(49 - 48) \times 100 + (50 - 48) \times 10 + (53 - 48) \times 1 = 125.$$
<p>A <b>string</b> is an array of characters that ends with the special character <code>'\0'</code> (code $0$). The string <code>"OK"</code> therefore needs $3$ bytes: <code>'O'</code>, <code>'K'</code> and <code>'\0'</code>. Functions that process strings stop at the <code>'\0'</code>. The header <code>&lt;string.h&gt;</code> provides <code>strlen</code> (length without the <code>\0</code>), <code>strcpy</code> (copy), <code>strcat</code> (append) and <code>strcmp</code> (compare: $0$ when equal).</p>`),
        D.CODE(R`char phrase[30] = "OK";       // room for 29 characters + '\0'
printf("%s has %u characters\n", phrase, strlen(phrase));
if (phrase[0] == 'O' && phrase[1] == 'K') {
    printf("The LED turns on\n");
}`),
        D.OUT(R`OK has 2 characters
The LED turns on`),
        D.T(R`<p>A number is converted into text with <code>itoa</code> from <code>&lt;stdlib.h&gt;</code>; Activity 16C uses it to show the temperature on the LCD: <code>itoa(phrase, (int) temperature, 10);</code> (in XC8 the buffer comes first, then the value and the base). <code>sprintf</code> is a more flexible alternative: it works like <code>printf</code> but writes into a string.</p>`),
        D.num('Code of a digit', R`<p>What is the ASCII code of the character <code>'5'</code>?</p>`, 53, R`$48 + 5 = 53$.`, { hint: R`<code>'0'</code> is $48$.` }),
        D.num('Bytes of a string', R`<p>How many bytes does the string <code>"HCT Dubai"</code> occupy in memory?</p>`, 10, R`$9$ characters (the space counts) plus the final <code>'\0'</code>: $10$ bytes.`, { hint: 'Do not forget the terminating character.' }),
        D.c('My own strlen', R`<p>Write a function <code>int length(char *s)</code> which returns the number of characters of the string, without using <code>strlen</code>: count the characters until <code>'\0'</code>.</p>`, {
          start: R`int length(char *s) {

}
`, tests: [{ call: 'length', args: ['HCT Dubai'], ret: 9 }, { call: 'length', args: [''], ret: 0 }, { call: 'length', args: ['I love Micro  :)'], ret: 16 }],
          forbid: [{ re: /strlen/, msg: 'Do not use strlen.' }],
          solution: R`int length(char *s) {
    int n = 0;
    while (s[n] != '\0') {
        n++;
    }
    return n;
}
`
        }, '', { hint: R`<code>while (s[n] != '\0') n++;</code>` }),
        D.c('From text to number', R`<p>Write a function <code>int to_number(char *s)</code> which converts a string of decimal digits (at most $4$ digits, no sign) into its value, like Activity 20C converts <code>"125"</code> into $125$. Go through the characters, and for each one multiply the result so far by $10$ and add the value of the digit.</p>`, {
          start: R`int to_number(char *s) {

}
`, tests: [{ call: 'to_number', args: ['125'], ret: 125 }, { call: 'to_number', args: ['0'], ret: 0 }, { call: 'to_number', args: ['9999'], ret: 9999 }, { call: 'to_number', args: ['007'], ret: 7 }],
          forbid: [{ re: /atoi/, msg: 'Do the conversion yourself, without atoi.' }],
          solution: R`int to_number(char *s) {
    int v = 0;
    for (int i = 0; s[i] != '\0'; i++) {
        v = v * 10 + (s[i] - '0');
    }
    return v;
}
`
        }, '', { hint: [R`The value of the digit is <code>s[i] - '0'</code> (or <code>s[i] - 48</code>).`, R`$125 = ((1 \times 10) + 2) \times 10 + 5$: multiply by $10$ before adding each new digit.`] }),
        D.c('Count the vowels', R`<p>Write a function <code>int vowels(char *s)</code> which returns how many characters of the string are lowercase vowels (a, e, i, o, u).</p>`, {
          start: R`int vowels(char *s) {

}
`, tests: [{ call: 'vowels', args: ['microcontroller'], ret: 5 }, { call: 'vowels', args: ['PIC16F887'], ret: 0 }, { call: 'vowels', args: ['aeiou'], ret: 5 }],
          solution: R`int vowels(char *s) {
    int n = 0;
    for (int i = 0; s[i] != '\0'; i++) {
        char c = s[i];
        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u') n++;
    }
    return n;
}
`
        }, '', { hint: R`Compare each character with <code>'a'</code>, <code>'e'</code>... using <code>||</code>.` }),
        D.c('Upper case', R`<p>Write a function <code>void to_upper(char *s)</code> which changes every lowercase letter of the string into uppercase, in place. A lowercase letter has a code $32$ higher than its uppercase letter: <code>'a'</code> $= 97$, <code>'A'</code> $= 65$. Do not use <code>toupper</code>.</p>`, {
          start: R`void to_upper(char *s) {

}
`, tests: [{ call: 'to_upper', args: ['Hello pic'], strings: ['HELLO PIC'] }, { call: 'to_upper', args: ['led on: 25c'], strings: ['LED ON: 25C'] }, { call: 'to_upper', args: ['ABC'], strings: ['ABC'] }],
          solution: R`void to_upper(char *s) {
    for (int i = 0; s[i] != '\0'; i++) {
        if (s[i] >= 'a' && s[i] <= 'z') {
            s[i] = s[i] - 32;
        }
    }
}
`
        }, '', { hint: R`For each character between <code>'a'</code> and <code>'z'</code>, subtract $32$.` }),
        D.c('Build a message', R`<p>Write a program which uses <code>strcpy</code> and <code>strcat</code> to build the text <code>Sent msg was: OK</code> in the array <code>msg</code> from the two strings given, and prints it with <code>%s</code> followed by a new line.</p>`, {
          start: R`#include <stdio.h>
#include <string.h>

void main(void) {
    char msg[30];
    char start[] = "Sent msg was: ";
    char received[] = "OK";

}
`, sample: 'Sent msg was: OK',
          tests: [{ name: 'Output', out: 'Sent msg was: OK\n' }],
          reqs: [{ re: /strcpy/, msg: 'Use strcpy.' }, { re: /strcat/, msg: 'Use strcat.' }],
          solution: R`#include <stdio.h>
#include <string.h>

void main(void) {
    char msg[30];
    char start[] = "Sent msg was: ";
    char received[] = "OK";
    strcpy(msg, start);
    strcat(msg, received);
    printf("%s\n", msg);
}
`
        }, '', { hint: R`<code>strcpy(msg, start);</code> then <code>strcat(msg, received);</code>.` })
      ]
    },
    {
      title: 'Pointers',
      objectives: ['You will know what an address and a pointer are', 'You will be able to use the operators <code>&amp;</code> and <code>*</code>', 'You will be able to write functions that change variables of the caller'],
      blocks: [
        D.T(R`<p>Every variable lives at an <b>address</b> in the memory. The operator <code>&amp;</code> gives the address of a variable, and a <b>pointer</b> is a variable that stores such an address. Its type says what it points to: <code>int *p</code> points to an <code>int</code>. The operator <code>*</code> in front of a pointer gives the variable it points to (this is called <i>dereferencing</i>):</p>`),
        D.CODE(R`int x = 10;
int *p = &x;      // p holds the address of x
*p = 25;          // the variable p points to (x) becomes 25
printf("%d\n", x);`),
        D.OUT('25'),
        D.T(R`<p>This explains the <code>&amp;</code> of <code>scanf</code>: a function receives copies of its arguments, so to change a variable of the caller it must receive the variable's address. The classic example is a function that swaps two variables:</p>`),
        D.CODE(R`void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}

swap(&x, &y);     // x and y are exchanged`),
        D.T(R`<p>The name of an array is the address of its first element, so a pointer can walk through an array: if <code>p</code> points to <code>a[0]</code>, then <code>p + 1</code> points to <code>a[1]</code> (the address grows by the size of one element) and <code>*(p + i)</code> is the same as <code>a[i]</code>. A string is passed as a <code>char *</code>: the lecture functions <code>USART_SEND((char*) phrase)</code> and <code>lcd_print(line1, (char*) "Hot")</code> receive the address of the first character and continue until the <code>'\0'</code>.</p>`),
        D.c('Swap with pointers', R`<p>Write the function <code>void swap(int *a, int *b)</code> which exchanges the values of the two variables whose addresses it receives.</p>`, {
          start: R`void swap(int *a, int *b) {

}
`, tests: [{ call: 'swap', args: [[3], [8]], arrays: [[8], [3]] }, { call: 'swap', args: [[-1], [100]], arrays: [[100], [-1]] }],
          solution: R`void swap(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}
`
        }, '', { hint: 'Copy the example above: a temporary variable and three assignments through the pointers.' }),
        D.c('Minimum and maximum', R`<p>A function can only return one value, but it can give back more through pointers. Write <code>void min_max(int *a, int n, int *min, int *max)</code> which stores the smallest and the biggest element of the array in the variables pointed to by <code>min</code> and <code>max</code>.</p>`, {
          start: R`void min_max(int *a, int n, int *min, int *max) {

}
`, tests: [{ call: 'min_max', args: [[4, 9, -2, 7], 4, [0], [0]], arrays: [null, null, [-2], [9]] }, { call: 'min_max', args: [[5], 1, [0], [0]], arrays: [null, null, [5], [5]] }],
          solution: R`void min_max(int *a, int n, int *min, int *max) {
    *min = a[0];
    *max = a[0];
    for (int i = 1; i < n; i++) {
        if (a[i] < *min) *min = a[i];
        if (a[i] > *max) *max = a[i];
    }
}
`
        }, '', { hint: R`Write the results with <code>*min = ...</code> and <code>*max = ...</code>.` }),
        D.c('Walk with a pointer', R`<p>Write a function <code>int count_char(char *s, char c)</code> which returns how many times the character <code>c</code> appears in the string. Use the pointer itself to walk: <code>while (*s != '\0') { ... s++; }</code>.</p>`, {
          start: R`int count_char(char *s, char c) {

}
`, tests: [{ call: 'count_char', args: ['L255', 53], ret: 2 }, { call: 'count_char', args: ['banana', 97], ret: 3 }, { call: 'count_char', args: ['', 97], ret: 0 }],
          solution: R`int count_char(char *s, char c) {
    int n = 0;
    while (*s != '\0') {
        if (*s == c) n++;
        s++;
    }
    return n;
}
`
        }, '', { hint: R`<code>*s</code> is the current character and <code>s++</code> moves to the next one.` }),
        D.mc('What is printed?', R`<p>What does this code print?</p>`, ['<code>30</code>', '<code>20</code>', '<code>10</code>', 'an address'], 0, R`<code>p + 2</code> points to <code>a[2]</code>, whose value is $30$.`, { snippet: { text: R`int a[3] = {10, 20, 30};
int *p = a;
printf("%d\n", *(p + 2));`, lang: 'c' }, hint: 'p points to a[0]; p + 2 points two elements further.' })
      ]
    },
    {
      title: 'Arrays in assembly: indirect addressing',
      objectives: ['You will be able to use FSR and INDF to reach a register through its address', 'You will be able to process a block of registers in a loop', 'You will know how strings are stored in program memory with RETLW'],
      blocks: [
        D.T(R`<p>An instruction such as <code>MOVF 0x30, W</code> names its register directly, so it cannot be used in a loop that walks through <code>0x30</code>, <code>0x31</code>, <code>0x32</code>... For this the PIC has <b>indirect addressing</b>, the assembly version of a pointer:</p>
<ul>
<li>the register <b>FSR</b> (file select register) holds an address;</li>
<li>the register <b>INDF</b> (indirect file) is not a real register: reading or writing INDF reads or writes the register whose address is in FSR.</li>
</ul>
<p>FSR has $8$ bits; the ninth bit of the address comes from the bit IRP of STATUS (IRP $= 0$ for banks 0 and 1).</p>`),
        D.SIDE(R`unsigned char *p = (unsigned char *) 0x30;
for (int i = 0; i < 16; i++) {
    *p = 0;
    p++;
}`, R`    MOVLW   0x30
    MOVWF   FSR         ; p = 0x30
    MOVLW   16
    MOVWF   COUNT
LOOP:
    CLRF    INDF        ; *p = 0
    INCF    FSR, F      ; p++
    DECFSZ  COUNT, F
    GOTO    LOOP`, { cap: R`Clearing the $16$ registers $30_{16} \ldots 3F_{16}$ with a pointer. In C, a pointer to a fixed address is rarely needed: an array does the job.` }),
        D.T(R`<p>Constant data, such as the text of a message, does not have to waste RAM: it can be kept in the program memory as a look-up table of <code>RETLW</code> instructions (Part 6). Activity 15 writes each letter with its own <code>MOVLW 'I'</code> and <code>CALL LCD_WRITE</code>; a table makes the message easier to change: a loop calls the table with the index $0, 1, 2, \ldots$ until the table returns $0$, the end mark.</p>`),
        D.trace('Indirect access', R`<p>Follow the program and write W and FSR after each instruction. The registers $40_{16}$ and $41_{16}$ hold $5$ and $9$.</p>`, { pre: 'V0 EQU 0x40\nV1 EQU 0x41', code: 'MOVLW 0x40\nMOVWF FSR\nMOVF INDF, W\nINCF FSR, F\nADDWF INDF, W', watch: ['W', 'FSR'], init: { V0: 5, V1: 9 } }, R`FSR $= 64 = 40_{16}$, INDF reads register $40_{16}$ ($W = 5$), FSR becomes $65$, and INDF now reads register $41_{16}$: $W = 5 + 9 = 14$.`, { hint: 'INDF is the register whose address is in FSR.', note: 'Start: register 0x40 = 5, register 0x41 = 9.' }),
        D.asm('Clear a block', R`<p>Clear the eight registers $30_{16} \ldots 37_{16}$ with indirect addressing (FSR, INDF and a counter).</p>`, {
          pre: 'COUNT EQU 0x70', start: ASTART,
          tests: [{ init: { 'RAM[0x30]': 7, 'RAM[0x33]': 9, 'RAM[0x37]': 1, 'RAM[0x38]': 0x55, 'RAM[0x2F]': 0x66 }, expect: { 'RAM[0x30]': 0, 'RAM[0x33]': 0, 'RAM[0x37]': 0, 'RAM[0x38]': 0x55, 'RAM[0x2F]': 0x66 } }],
          solution: '    MOVLW 0x30\n    MOVWF FSR\n    MOVLW 8\n    MOVWF COUNT\nLOOP:\n    CLRF INDF\n    INCF FSR, F\n    DECFSZ COUNT, F\n    GOTO LOOP\n    GOTO $'
        }, 'FSR walks from 0x30 to 0x37 while COUNT counts the 8 rounds; CLRF INDF clears the register FSR points to.', { hint: 'Copy the loop shown above, with 8 instead of 16.' }),
        D.asm('Sum of an array', R`<p>Eight bytes are stored at $30_{16} \ldots 37_{16}$. Add them and store the sum (at most $255$) in SUM. Use indirect addressing.</p>`, {
          pre: 'SUM EQU 0x20\nCOUNT EQU 0x70', start: ASTART,
          tests: [{ name: '1, 2, ..., 8', init: { 'RAM[0x30]': 1, 'RAM[0x31]': 2, 'RAM[0x32]': 3, 'RAM[0x33]': 4, 'RAM[0x34]': 5, 'RAM[0x35]': 6, 'RAM[0x36]': 7, 'RAM[0x37]': 8 }, expect: { SUM: 36 } }, { name: 'other values', init: { 'RAM[0x30]': 100, 'RAM[0x31]': 50, 'RAM[0x37]': 20, 'RAM[0x38]': 99 }, expect: { SUM: 170 } }],
          solution: '    CLRF SUM\n    MOVLW 0x30\n    MOVWF FSR\n    MOVLW 8\n    MOVWF COUNT\nLOOP:\n    MOVF INDF, W\n    ADDWF SUM, F\n    INCF FSR, F\n    DECFSZ COUNT, F\n    GOTO LOOP\n    GOTO $'
        }, 'Each round reads the byte FSR points to with MOVF INDF, W, adds it to SUM and moves FSR forward.', { hint: 'MOVF INDF, W reads the current element; ADDWF SUM, F adds it.' })
      ]
    }
  ]
});
})();
