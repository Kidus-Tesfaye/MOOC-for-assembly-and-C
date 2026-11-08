/* Part 1 - Getting started with C */
(function () {
const START = R`#include <stdio.h>

void main(void) {
    // write your code here

}
`;
const prog = (body) => '#include <stdio.h>\n\nvoid main(void) {\n' + body.replace(/^/gm, '    ') + '\n}\n';

D.part({
  title: 'Getting started with C',
  intro: R`<p>In this part you write your first programs in C. You print text and numbers, calculate with the arithmetic operators, store values in variables and read numbers typed by the user.</p>`,
  sections: [
    {
      title: 'Your first program',
      objectives: ['You will have written and run your first C program', 'You will know how to use the <code>printf</code> command', 'You will know what a syntax error is and how to read the message of the compiler'],
      blocks: [
        D.T(R`<p>A computer program is a list of <i>commands</i>, or <i>statements</i>. The processor executes them one by one, from the first to the last. A command can calculate something, store a value in memory, compare two values, switch on a light connected to a pin of the chip or show a message to the user.</p>
<p>The processor of the PIC16F887 works exactly like this. Its program is stored in its <b>Flash memory</b>, one instruction in each memory location. The processor fetches the first instruction, executes it, then automatically moves to the next one, and so on. In this course you will write these instructions in two languages: <b>C</b>, which is easier to read and write, and <b>assembly language</b>, which names the actual instructions of the processor.</p>
<p>Let's begin with C and the command <code>printf</code>, which <i>prints</i> text. Printing means that the program shows the text on the screen. The following program prints the line "Hi there!":</p>`),
        D.CODE(R`#include <stdio.h>

void main(void) {
    printf("Hi there!\n");
}`),
        D.T(R`<p>When the program is run, it produces this:</p>`),
        D.OUT('Hi there!'),
        D.T(R`<p>The program has a few parts that every C program needs:</p>
<ul>
<li><code>#include &lt;stdio.h&gt;</code> tells the compiler that the program uses the standard input/output functions, such as <code>printf</code>.</li>
<li><code>void main(void)</code> starts the <b>main function</b>. Every C program begins its work in <code>main</code>. The commands of <code>main</code> are written between the braces <code>{</code> and <code>}</code>.</li>
<li><code>printf("Hi there!\n");</code> is the command that prints. The text to print is written between double quotes. The two characters <code>\n</code> mean <i>new line</i>: whatever is printed next starts on the following line.</li>
<li>Every command ends with a semicolon <code>;</code>.</li>
</ul>`),
        D.INFO('Where does the text go?', R`<p>A microcontroller such as the PIC16F887 has no screen. With the XC8 compiler, <code>printf</code> sends the text, one character after the other, through the <b>serial port</b> of the chip (the USART). A computer connected to that port shows the text in a <i>serial terminal</i> window. In this course the simulator plays the role of the terminal: the output of your program appears below the editor. You will program the serial port yourself in Part 13.</p>`),
        D.T(R`<p>The program will not work unless the code is written exactly as above. For example, if the quotation marks are missing, as in</p>`),
        D.CODE(R`printf(Hi there!\n);`),
        D.T(R`<p>the program cannot be compiled, and the compiler reports an error instead:</p>`),
        D.OUT(R`Line 4: Unexpected character '!'.`, { label: 'Compiler error' }),
        D.T(R`<p>This is called a <b>syntax error</b>: the code does not follow the rules (the <i>syntax</i>) of the C language. The message tells you on which line the problem was found. The real mistake can also be just before that place, for example a missing semicolon at the end of the previous line. When a program does not work, always read the error message carefully.</p>`),
        D.c('Emoticon', R`<p>Please write a program which prints out an emoticon:</p>`, {
          start: START, sample: ':-)',
          tests: [{ name: 'Output', out: ':-)\n' }],
          solution: prog(R`printf(":-)\n");`)
        }, '', { hint: R`Copy the example program above and change the text between the double quotes.` }),
        D.H('A program of several commands'),
        D.T(R`<p>Several commands written one after the other are executed in order, from first to last. For example this program</p>`),
        D.CODE(R`#include <stdio.h>

void main(void) {
    printf("Welcome to C programming!\n");
    printf("First we will practise using printf.\n");
    printf("This program prints three lines of text.\n");
}`),
        D.T(R`<p>prints the following lines:</p>`),
        D.OUT(R`Welcome to C programming!
First we will practise using printf.
This program prints three lines of text.`),
        D.T(R`<p>If you leave out the <code>\n</code>, the next text continues on the same line. Two <code>printf</code> commands can therefore build one line together:</p>`),
        D.CODE(R`printf("Hello ");
printf("PIC!\n");`),
        D.OUT('Hello PIC!'),
        D.c('Fix the code: the order', R`<p>This program should print the first lines of an assembly program in the right order, but the lines are mixed up. Fix the program so that it prints exactly:</p>`, {
          sample: R`MAIN:
    CALL SETUP
    MOVLW 25
    GOTO $`,
          start: R`#include <stdio.h>

void main(void) {
    printf("    MOVLW 25\n");
    printf("    GOTO $\n");
    printf("MAIN:\n");
    printf("    CALL SETUP\n");
}
`,
          tests: [{ name: 'Output', out: 'MAIN:\n    CALL SETUP\n    MOVLW 25\n    GOTO $\n' }],
          solution: R`#include <stdio.h>

void main(void) {
    printf("MAIN:\n");
    printf("    CALL SETUP\n");
    printf("    MOVLW 25\n");
    printf("    GOTO $\n");
}
`
        }, '', { hint: 'The commands are executed from top to bottom. Move the lines (cut and paste) so that the first line printed is MAIN:' }),
        D.c('Row, row, row your boat', R`<p>Please write a program which prints out the following lines exactly as they are written here, punctuation and all:</p>`, {
          start: START, sample: R`Row, row, row your boat,
Gently down the stream.
Merrily, merrily, merrily, merrily,
Life is but a dream.`,
          tests: [{ name: 'Output', out: 'Row, row, row your boat,\nGently down the stream.\nMerrily, merrily, merrily, merrily,\nLife is but a dream.\n' }],
          solution: prog(R`printf("Row, row, row your boat,\n");
printf("Gently down the stream.\n");
printf("Merrily, merrily, merrily, merrily,\n");
printf("Life is but a dream.\n");`)
        }, '', { hint: R`Use one <code>printf</code> for each line and finish each text with <code>\n</code>. The test compares every character, so check the commas and full stops.` }),
        D.mc('The new line', R`<p>What does this program print?</p>`, [
          'Two lines: <code>ABC</code> and then <code>DEF</code>', 'One line: <code>ABCDEF</code>', 'One line: <code>ABC DEF</code>', 'Three lines: <code>A</code>, <code>BC</code> and <code>DEF</code>'], 1,
          R`The first <code>printf</code> does not end with <code>\n</code>, so <code>DEF</code> continues on the same line; nothing adds a space between them.`, { snippet: { text: R`printf("ABC");
printf("DEF\n");`, lang: 'c' }, hint: R`A new line starts only where <code>\n</code> appears in the text.` }),
        D.H('Comments'),
        D.T(R`<p>A <b>comment</b> is a note for the human reader of the program. The compiler ignores it. In C a comment starts with <code>//</code> and continues to the end of the line, or it is written between <code>/*</code> and <code>*/</code>, and can then span several lines. All the lecture activities begin with a comment that describes the task of the program:</p>`),
        D.CODE(R`/* Activity 5 in C
   This code will turn on an LED when ON-PB is pressed
   and OFF when OFF-PB is pressed */

#include <stdio.h>

void main(void) {
    printf("Comments are not printed.\n");   // this is also a comment
}`),
        D.OUT('Comments are not printed.'),
        D.c('Print some code', R`<p>Inside a string, the double quote <code>"</code> would end the text. To print a double quote, write <code>\"</code>: the backslash tells the compiler that the next character is part of the text. In the same way <code>\\</code> prints a backslash.</p><p>Please write a program which prints exactly the following line:</p>`, {
          start: START, sample: R`printf("Hello there!\n");`,
          tests: [{ name: 'Output', out: 'printf("Hello there!\\n");\n' }],
          solution: prog(R`printf("printf(\"Hello there!\\n\");\n");`)
        }, '', { hint: [R`The text contains two double quotes and one backslash. Write them as <code>\"</code> and <code>\\</code>.`, R`The text to print is <code>printf(\"Hello there!\\n\");</code> and you need your own <code>\n</code> at the end.`] }),
        D.mc('Find the syntax error', R`<p>Which line of this program contains a syntax error?</p>`, ['Line 3', 'Line 4', 'Line 5', 'There is no error'], 1,
          R`Line 4 has no semicolon at the end. The compiler only notices it when it reads the next command, so its message mentions the missing <code>;</code> after the text of line 4.`, { snippet: { text: R`#include <stdio.h>
void main(void) {
    printf("one\n");
    printf("two\n")
    printf("three\n");
}`, lang: 'c', lines: true }, hint: 'Look at the end of each line: every command ends with the same character.' })
      ]
    },
    {
      title: 'Printing numbers and arithmetic',
      objectives: ['You will know how to print the result of a calculation with <code>%d</code>', 'You will know the arithmetic operators of C, including integer division and the remainder', 'You will know that an <code>int</code> of the PIC holds only numbers from $-32768$ to $32767$'],
      blocks: [
        D.T(R`<p>To print a number, <code>printf</code> needs a <b>format specifier</b> in its text. The specifier <code>%d</code> means "an integer number goes here". The number itself is written after the text, separated by a comma. It can be the result of a calculation:</p>`),
        D.CODE(R`printf("%d\n", 2 + 5);
printf("%d\n", 3 * 3);
printf("%d\n", 2 + 2 * 10);`),
        D.OUT(R`7
9
22`),
        D.T(R`<p>The third line shows that C follows the usual order of operations: multiplication is done before addition, so $2 + 2 \times 10 = 22$. Use parentheses when you need another order: <code>(2 + 2) * 10</code> gives $40$.</p>
<p>A single <code>printf</code> can print several numbers, mixed with text. Each <code>%d</code> is replaced by the next value in the list:</p>`),
        D.CODE(R`printf("%d plus %d is %d\n", 25, 30, 25 + 30);`),
        D.OUT('25 plus 30 is 55'),
        D.T(R`<p>These are the arithmetic operators of C:</p>`),
        D.TABLE(['Operator', 'Purpose', 'Example', 'Result'], [
          ['<code>+</code>', 'Addition', '<code>2 + 4</code>', '<code>6</code>'],
          ['<code>-</code>', 'Subtraction', '<code>10 - 3</code>', '<code>7</code>'],
          ['<code>*</code>', 'Multiplication', '<code>-2 * 123</code>', '<code>-246</code>'],
          ['<code>/</code>', 'Division (with integers: the decimals are dropped)', '<code>9 / 2</code>', '<code>4</code>'],
          ['<code>%</code>', 'Remainder of the division (modulo)', '<code>9 % 2</code>', '<code>1</code>']
        ], { mono: [0] }),
        D.T(R`<p>Pay attention to division. When both numbers are integers, C performs <b>integer division</b>: the result is the whole number of times the divisor fits, and the fractional part is simply dropped. Mathematically $\frac{9}{2} = 4.5$, but in C <code>9 / 2</code> is <code>4</code>. The remainder operator <code>%</code> gives what is left over: $9 = 4 \times 2 + 1$, so <code>9 % 2</code> is <code>1</code>. Together, <code>/</code> and <code>%</code> are very useful, for example to split $125$ seconds into $2$ minutes and $5$ seconds.</p>`),
        D.c('Seconds in an hour', R`<p>Please write a program which calculates and prints the number of seconds in an hour. Use C to do the calculation: write the multiplication $60 \times 60$ in your code.</p>`, {
          start: START, sample: '3600',
          tests: [{ name: 'Output', out: '3600\n' }],
          reqs: [{ re: /60\s*\*\s*60/, msg: 'Let C calculate the result: write 60 * 60 in the program.' }],
          solution: prog(R`printf("%d\n", 60 * 60);`)
        }, '', { hint: R`<code>printf("%d\n", ...);</code> prints the value of the calculation written after the comma.` }),
        D.c('Minutes in a week', R`<p>Please write a program which prints the number of minutes in a week, calculated as $7 \times 24 \times 60$. The program should print exactly:</p>`, {
          start: START, sample: 'A week has 10080 minutes.',
          tests: [{ name: 'Output', out: 'A week has 10080 minutes.\n' }],
          reqs: [{ re: /7\s*\*\s*24\s*\*\s*60|60\s*\*\s*24\s*\*\s*7|24\s*\*\s*60\s*\*\s*7|7\s*\*\s*60\s*\*\s*24/, msg: 'Let C calculate the result from 7, 24 and 60.' }],
          solution: prog(R`printf("A week has %d minutes.\n", 7 * 24 * 60);`)
        }, '', { hint: R`Put <code>%d</code> in the middle of the text, where the number belongs.` }),
        D.mc('Integer division', R`<p>What does <code>printf("%d %d\n", 17 / 5, 17 % 5);</code> print?</p>`, ['<code>3 2</code>', '<code>3.4 0</code>', '<code>3 4</code>', '<code>4 2</code>'], 0,
          R`$17 = 3 \times 5 + 2$: the integer division gives $3$ and the remainder is $2$.`, { hint: 'How many whole times does 5 fit in 17, and what is left over?' }),
        D.num('Parentheses', R`<p>What does <code>printf("%d\n", (8 + 4) / 3 * 2);</code> print?</p>`, 8,
          R`The parentheses first: $8 + 4 = 12$. Then <code>/</code> and <code>*</code> have the same priority and are done from left to right: $12 / 3 = 4$, $4 \times 2 = 8$.`, { hint: 'Division and multiplication are done from left to right.' }),
        D.c('Split the seconds', R`<p>A timer counted $3725$ seconds. Write a program which prints how many whole hours, minutes and seconds that is, using only integer division <code>/</code> and the remainder <code>%</code>. The program should print exactly:</p>`, {
          start: START, sample: '1 h 2 min 5 s',
          tests: [{ name: 'Output', out: '1 h 2 min 5 s\n' }],
          reqs: [{ re: /3725/, msg: 'Use the number 3725 in your calculations.' }, { re: /%[^d"]*3600|%\s*60/, msg: 'Use the remainder operator % in the calculation.' }],
          forbid: [{ re: /printf\s*\(\s*"1 h 2 min 5 s/, msg: 'Calculate the numbers with / and %; do not just type the answer.' }],
          solution: prog(R`printf("%d h %d min %d s\n", 3725 / 3600, 3725 % 3600 / 60, 3725 % 60);`)
        }, '', { hint: [R`The hours are <code>3725 / 3600</code>.`, R`The seconds that are left after the hours are <code>3725 % 3600</code>; divide them by 60 to get the minutes. The last seconds are <code>3725 % 60</code>.`] }),
        D.H('How big can an int be?'),
        D.T(R`<p>Try to print the number of seconds in a day, $24 \times 60 \times 60 = 86400$:</p>`),
        D.CODE(R`printf("%d\n", 24 * 60 * 60);`),
        D.OUT('20864'),
        D.T(R`<p>This is not a mistake of the simulator: the XC8 compiler for the PIC16F887 behaves exactly like this. On this 8-bit chip a whole number of type <code>int</code> is stored in <b>16 bits</b>, so it can only hold numbers from $-32768$ to $32767$. The result $86400$ does not fit, and only the lowest 16 bits of it remain: $86400 - 65536 = 20864$. This is called an <b>overflow</b>. You will learn exactly why it happens in Part 2, when you study binary numbers.</p>
<p>For larger numbers C has the type <b><code>long</code></b>, which uses 32 bits and holds numbers up to about $\pm 2.1$ billion. A number becomes a <code>long</code> when you write the letter <code>L</code> after it, and a <code>long</code> is printed with <code>%ld</code> (the letter l, for long):</p>`),
        D.CODE(R`printf("%ld\n", 24L * 60 * 60);`),
        D.OUT('86400'),
        D.WARN('On your computer the result would be different', R`<p>On a desktop computer an <code>int</code> usually has 32 bits, and <code>24 * 60 * 60</code> prints <code>86400</code> without any problem. The size of the types is one of the things that change from one processor to another. This course follows the XC8 compiler, because the programs are written for the PIC16F887.</p>`),
        D.c('Seconds in a year', R`<p>Please write a program which calculates the number of seconds in a year of 365 days and prints it like this:</p>`, {
          start: START, sample: 'A year has 31536000 seconds.',
          tests: [{ name: 'Output', out: 'A year has 31536000 seconds.\n' }],
          reqs: [{ re: /365/, msg: 'Let C calculate the result from 365, 24, 60 and 60.' }],
          forbid: [{ re: /31536000/, msg: 'Let C calculate the number; do not type the answer.' }],
          solution: prog(R`printf("A year has %ld seconds.\n", 365L * 24 * 60 * 60);`)
        }, '', { hint: [R`The result does not fit in an <code>int</code>. Write the first number as <code>365L</code> so that the whole calculation is done with <code>long</code> numbers.`, R`Print a <code>long</code> with <code>%ld</code>.`] }),
        D.mc('Will it fit?', R`<p>Which of these results can be stored in an <code>int</code> of the XC8 compiler? Select all that apply.</p>`, ['$1000 \\times 30 = 30000$', '$200 \\times 200 = 40000$', '$-100 \\times 300 = -30000$', '$70000 - 40000 = 30000$ (but $70000$ is first stored in an int)'], [0, 2],
          R`An <code>int</code> holds $-32768 \ldots 32767$. $30000$ and $-30000$ fit; $40000$ does not, and neither does $70000$.`, { hint: R`Compare each number with the range $-32768$ to $32767$.` })
      ]
    },
    {
      title: 'Variables',
      objectives: ['You will know how to declare a variable and give it a value', 'You will be able to use variables in calculations and update their values', 'You will know that a variable that is not given a value contains garbage'],
      blocks: [
        D.T(R`<p>A <b>variable</b> is a named place in the memory of the processor that holds a value. Before a variable can be used, it must be <b>declared</b>: the declaration gives its <i>type</i> and its <i>name</i>, and usually also its first value.</p>`),
        D.CODE(R`#include <stdio.h>

void main(void) {
    int rega = 25;
    int regb = 30;
    int regc;

    regc = rega + regb;
    printf("%d + %d = %d\n", rega, regb, regc);
}`),
        D.OUT('25 + 30 = 55'),
        D.T(R`<p>The line <code>int rega = 25;</code> declares a variable called <code>rega</code> of type <code>int</code> and stores the value $25$ in it. The equals sign <code>=</code> is the <b>assignment</b> operator: it calculates the value on its right side and stores it in the variable on its left side. It does not mean "is equal to" as in mathematics. The statement <code>regc = rega + regb;</code> reads the two values, adds them and stores the result $55$ in <code>regc</code>.</p>
<p>This program does the same work as <b>Activity 1</b> of the lectures, which adds $25$ and $30$ in assembly language using three memory locations called REGA, REGB and REGC. You will write that program yourself in Part 3.</p>`),
        D.INFO('Choosing a name for a variable', R`<ul>
<li>A name can contain letters, digits and the underscore <code>_</code>, but it cannot start with a digit. <code>sum</code>, <code>reg_a</code> and <code>count2</code> are fine; <code>2count</code> is not.</li>
<li>C is <b>case sensitive</b>: <code>count</code>, <code>Count</code> and <code>COUNT</code> are three different names.</li>
<li>Choose names that tell what the variable is for, such as <code>temperature</code> or <code>led_count</code>.</li>
<li>The names of the C keywords (<code>int</code>, <code>if</code>, <code>while</code>...) cannot be used.</li>
</ul>`),
        D.H('Changing the value of a variable'),
        D.T(R`<p>The value of a variable can be changed as often as needed. A very common pattern uses the old value of the variable to calculate the new one:</p>`),
        D.CODE(R`int count = 10;
count = count + 5;     // count is now 15
count = count * 2;     // count is now 30
count++;               // count is now 31 (++ adds 1)
count--;               // count is now 30 (-- subtracts 1)
count += 7;            // the same as count = count + 7: now 37
printf("%d\n", count);`),
        D.OUT('37'),
        D.T(R`<p>Remember that the statements are executed one after the other: when <code>count = count * 2;</code> is executed, <code>count</code> already holds $15$. The shortcuts <code>+=</code>, <code>-=</code>, <code>*=</code>, <code>/=</code> and <code>%=</code> work in the same way as <code>+=</code>.</p>`),
        D.multi('Follow the values', R`<p>What are the values of <code>a</code> and <code>b</code> when these statements have been executed?</p>`, [{ label: '<code>a</code> =', ans: [7] }, { label: '<code>b</code> =', ans: [17] }],
          R`$a = 5$, then $b = 5 \times 2 = 10$, then $a = 5 + 2 = 7$, and finally $b = 10 + 7 = 17$.`, { snippet: { text: R`int a = 5;
int b = a * 2;
a = a + 2;
b = b + a;`, lang: 'c' }, hint: 'Go through the lines from top to bottom and write down the values after each line.' }),
        D.c('Swap two values', R`<p>The program below should exchange the values of <code>x</code> and <code>y</code> and then print them. The line <code>x = y; y = x;</code> does not work: after the first assignment the old value of <code>x</code> is lost. Fix the program by using a third variable <code>temp</code> to remember the old value of <code>x</code>.</p>`, {
          start: R`#include <stdio.h>

void main(void) {
    int x = 3;
    int y = 8;

    x = y;
    y = x;

    printf("x = %d, y = %d\n", x, y);
}
`, sample: 'x = 8, y = 3',
          tests: [{ name: 'Output', out: 'x = 8, y = 3\n' }],
          reqs: [{ re: /\btemp\b/, msg: 'Use a variable called temp.' }],
          forbid: [{ re: /printf\s*\(\s*"x = 8/, msg: 'Swap the values; do not print the numbers directly.' }],
          solution: R`#include <stdio.h>

void main(void) {
    int x = 3;
    int y = 8;
    int temp;

    temp = x;
    x = y;
    y = temp;

    printf("x = %d, y = %d\n", x, y);
}
`
        }, '', { hint: R`First store the value of <code>x</code> in <code>temp</code>, then copy <code>y</code> into <code>x</code>, and finally copy <code>temp</code> into <code>y</code>.` }),
        D.c('Price with tax', R`<p>A component costs <code>price</code> dirhams. Calculate the tax ($5\%$ of the price) and the total price using <b>integer</b> arithmetic, and print them as in the example. The tax is $\frac{\text{price} \times 5}{100}$ (integer division). The tests change the value of <code>price</code>, so do not type the results yourself.</p>`, {
          start: R`#include <stdio.h>

int price = 120;

void main(void) {
    // calculate tax and total from price

}
`, sample: R`Price: 120
Tax: 6
Total: 126`,
          tests: [{ name: 'price = 120', out: 'Price: 120\nTax: 6\nTotal: 126\n' }, { name: 'price = 85', setGlobals: { price: 85 }, out: 'Price: 85\nTax: 4\nTotal: 89\n' }, { name: 'price = 2000', setGlobals: { price: 2000 }, out: 'Price: 2000\nTax: 100\nTotal: 2100\n' }],
          solution: R`#include <stdio.h>

int price = 120;

void main(void) {
    int tax = price * 5 / 100;
    int total = price + tax;
    printf("Price: %d\n", price);
    printf("Tax: %d\n", tax);
    printf("Total: %d\n", total);
}
`
        }, '', { hint: [R`Declare <code>int tax = price * 5 / 100;</code> and then <code>int total = price + tax;</code>.`, 'Print three lines, each with one %d.'] }),
        D.H('A variable without a value'),
        D.T(R`<p>What does a variable contain before anything has been stored in it? In C the answer is: <b>whatever was left in that memory location</b>. Such a value is called <i>garbage</i>.</p>`),
        D.CODE(R`int total;            // declared, but no value given
total = total + 10;   // garbage + 10
printf("%d\n", total);`),
        D.T(R`<p>This program prints a number that nobody can predict. Always give a variable its first value before you read it, for example <code>int total = 0;</code>. (Variables declared <i>outside</i> of <code>main</code>, called <i>global variables</i>, are an exception: C sets them to zero when the program starts. The variable <code>price</code> of the previous exercise was a global variable.)</p>`),
        D.mc('Garbage', R`<p>Which statements are true about this code? Select all that apply.</p>`, ['<code>count</code> starts at an unpredictable value', 'The program always prints <code>1</code>', 'Writing <code>int count = 0;</code> fixes the problem', 'The compiler sets every variable to 0 automatically, so there is no problem'], [0, 2],
          R`<code>count</code> is a local variable without a first value, so <code>count++</code> increments garbage. Initialising it with <code>= 0</code> fixes the program.`, { snippet: { text: R`void main(void) {
    int count;
    count++;
    printf("%d\n", count);
}`, lang: 'c' }, hint: 'Is count given a value before count++ reads it?' }),
        D.c('Average of three', R`<p>The variables <code>a</code>, <code>b</code> and <code>c</code> hold three measurements. Calculate their sum and their average (with integer division) and print them as in the example. The tests use different measurements.</p>`, {
          start: R`#include <stdio.h>

int a = 20;
int b = 31;
int c = 40;

void main(void) {

}
`, sample: R`Sum: 91
Average: 30`,
          tests: [{ name: '20, 31, 40', out: 'Sum: 91\nAverage: 30\n' }, { name: '5, 5, 6', setGlobals: { a: 5, b: 5, c: 6 }, out: 'Sum: 16\nAverage: 5\n' }, { name: '100, 250, 400', setGlobals: { a: 100, b: 250, c: 400 }, out: 'Sum: 750\nAverage: 250\n' }],
          solution: R`#include <stdio.h>

int a = 20;
int b = 31;
int c = 40;

void main(void) {
    int sum = a + b + c;
    printf("Sum: %d\n", sum);
    printf("Average: %d\n", sum / 3);
}
`
        }, '', { hint: R`Store <code>a + b + c</code> in a variable <code>sum</code>; the average is <code>sum / 3</code>.` })
      ]
    },
    {
      title: 'Information from the user',
      objectives: ['You will be able to read numbers typed by the user with <code>scanf</code>', 'You will be able to write programs that use the input in calculations'],
      blocks: [
        D.T(R`<p>A program becomes more useful when it can react to <b>input</b>, information that is given to it while it runs. The standard C function for reading input is <code>scanf</code>. It works like a <code>printf</code> backwards: the format <code>%d</code> means "read an integer", and the value is stored in the variable whose name follows, with an ampersand <code>&amp;</code> in front of it.</p>`),
        D.CODE(R`#include <stdio.h>

void main(void) {
    int age;
    printf("What is your age? ");
    scanf("%d", &age);
    printf("Next year you will be %d.\n", age + 1);
}`),
        D.OUT(R`What is your age? [[20]]
Next year you will be 21.`),
        D.T(R`<p>In the sample output above, the part written in <b style="color:#1565c0">blue</b> is what the user typed. The program prints a question (a <i>prompt</i>), waits for the user, stores the number in <code>age</code> and then uses it.</p>
<p>The <code>&amp;</code> sign is necessary: it gives <code>scanf</code> the <b>address</b> of the variable, the place in memory where the number must be written. Forgetting it is one of the most common mistakes in C. You will understand addresses fully in Part 9.</p>`),
        D.INFO('Input on a microcontroller', R`<p>On the PIC the user types on the computer connected to the serial port, and the characters arrive one by one in the receiver of the USART. With XC8, <code>scanf</code> reads them through a function called <code>getch()</code> that the programmer writes. In this course the simulator gives the input to your program: press <b>Run</b> and edit the input under the editor to try different values. The tests use their own inputs.</p>`),
        D.c('Sum of two numbers', R`<p>Write a program which asks for two integers and prints their sum, as in the example. The prompts must be exactly as shown.</p>`, {
          start: START, sample: R`First number: [[5]]
Second number: [[7]]
The sum is 12`,
          tests: [{ name: '5 and 7', stdin: '5\n7\n', out: 'First number: Second number: The sum is 12\n' }, { name: '-3 and 10', stdin: '-3\n10\n', out: 'First number: Second number: The sum is 7\n' }, { name: '1000 and 2345', stdin: '1000\n2345\n', out: 'First number: Second number: The sum is 3345\n' }],
          solution: prog(R`int a, b;
printf("First number: ");
scanf("%d", &a);
printf("Second number: ");
scanf("%d", &b);
printf("The sum is %d\n", a + b);`)
        }, '', { hint: [R`Declare two variables, for example <code>int a, b;</code> (several variables of the same type can be declared on one line).`, R`Read each number with <code>scanf("%d", &a);</code> after its prompt. The prompts end with a space and no <code>\n</code>.`] }),
        D.c('Minutes and seconds', R`<p>Write a program which asks for a number of seconds and prints it as minutes and seconds:</p>`, {
          start: START, sample: R`Seconds: [[125]]
2 min 5 s`,
          tests: [{ name: '125', stdin: '125\n', out: 'Seconds: 2 min 5 s\n' }, { name: '59', stdin: '59\n', out: 'Seconds: 0 min 59 s\n' }, { name: '3600', stdin: '3600\n', out: 'Seconds: 60 min 0 s\n' }],
          solution: prog(R`int s;
printf("Seconds: ");
scanf("%d", &s);
printf("%d min %d s\n", s / 60, s % 60);`)
        }, '', { hint: R`The minutes are <code>s / 60</code> and the seconds that are left are <code>s % 60</code>.` }),
        D.c('Ohm\'s law', R`<p>An LED connected to a pin of the PIC needs a series resistor. The lecture calculates it with Ohm's law: $R = \frac{V_{\text{pin}} - V_{\text{LED}}}{I}$. With the pin voltage $5\ \mathrm{V}$, an LED voltage of $2.2\ \mathrm{V}$ and a current of $10\ \mathrm{mA}$, $R = \frac{5 - 2.2}{0.01} = 280\ \Omega$.</p><p>Write a program which asks for the LED voltage <b>in millivolts</b> and the current <b>in milliamperes</b> and prints the resistance in ohms, using integer arithmetic: $R = \frac{5000 - V_{\text{LED}}}{I}$ (millivolts divided by milliamperes gives ohms).</p>`, {
          start: START, sample: R`LED voltage (mV): [[2200]]
Current (mA): [[10]]
R = 280 ohm`,
          tests: [{ name: '2200 mV, 10 mA', stdin: '2200\n10\n', out: 'LED voltage (mV): Current (mA): R = 280 ohm\n' }, { name: '3000 mV, 20 mA', stdin: '3000\n20\n', out: 'LED voltage (mV): Current (mA): R = 100 ohm\n' }, { name: '1800 mV, 15 mA', stdin: '1800\n15\n', out: 'LED voltage (mV): Current (mA): R = 213 ohm\n' }],
          solution: prog(R`int v, i;
printf("LED voltage (mV): ");
scanf("%d", &v);
printf("Current (mA): ");
scanf("%d", &i);
printf("R = %d ohm\n", (5000 - v) / i);`)
        }, '', { hint: R`Calculate <code>(5000 - v) / i</code>: the subtraction must be in parentheses so that it happens before the division.` }),
        D.mc('The ampersand', R`<p>The user types <code>42</code>. What happens with this code?</p>`, ['The program fails or behaves unpredictably: scanf needs the address <code>&amp;x</code>, not the value of x', 'x becomes 42', 'x becomes 0', 'The program prints 42'], 0,
          R`<code>scanf</code> must know <i>where</i> to store the number, so it needs <code>&amp;x</code>. Given only the (garbage) value of <code>x</code>, it would write somewhere random in memory. The simulator stops the program with an error message instead.`, { snippet: { text: R`int x;
scanf("%d", x);`, lang: 'c' }, hint: 'Compare with the examples above: what is written in front of the variable name?' })
      ]
    },
{
      title: 'Challenge: making change',
      objectives: ['You will chain integer division and remainder to split a number into parts'],
      blocks: [
        D.T(R`<p>A vending machine must give change with as few coins as possible. Its coins are worth $100$, $50$, $25$, $10$, $5$ and $1$ fils. A cashier does it like this: take as many of the biggest coin as possible, then continue with what is left and the next coin. In C, integer division gives "as many as possible" and the remainder <code>%</code> gives "what is left":</p>
$$388 = 3 \times 100 + 88, \qquad 88 = 1 \times 50 + 38, \qquad 38 = 1 \times 25 + 13, \qquad \ldots$$`),
        D.c('Making change', R`<p>Write a program which asks for an amount in fils ($0$ to $30000$) and prints how many coins of each value the machine gives, from the biggest to the smallest, and the total number of coins, exactly in the format shown. Only <code>/</code> and <code>%</code> are needed: no <code>if</code> and no loops.</p>`, {
          start: START, sample: R`Change in fils: [[388]]
100: 3
50: 1
25: 1
10: 1
5: 0
1: 3
Coins: 9`,
          tests: [[388, [3, 1, 1, 1, 0, 3]], [99, [0, 1, 1, 2, 0, 4]], [0, [0, 0, 0, 0, 0, 0]], [1000, [10, 0, 0, 0, 0, 0]], [41, [0, 0, 1, 1, 1, 1]], [240, [2, 0, 1, 1, 1, 0]]].map(([v, c]) => ({ name: String(v), stdin: v + '\n', out: 'Change in fils: ' + [100, 50, 25, 10, 5, 1].map((k, i) => k + ': ' + c[i] + '\n').join('') + 'Coins: ' + c.reduce((a, b) => a + b, 0) + '\n' })),
          solution: "#include <stdio.h>\n\nvoid main(void) {\n    int fils, c100, c50, c25, c10, c5, c1;\n    printf(\"Change in fils: \");\n    scanf(\"%d\", &fils);\n    c100 = fils / 100;      // whole dirhams\n    fils = fils % 100;      // what is left\n    c50 = fils / 50;\n    fils = fils % 50;\n    c25 = fils / 25;\n    fils = fils % 25;\n    c10 = fils / 10;\n    fils = fils % 10;\n    c5 = fils / 5;\n    c1 = fils % 5;\n    printf(\"100: %d\\n\", c100);\n    printf(\"50: %d\\n\", c50);\n    printf(\"25: %d\\n\", c25);\n    printf(\"10: %d\\n\", c10);\n    printf(\"5: %d\\n\", c5);\n    printf(\"1: %d\\n\", c1);\n    printf(\"Coins: %d\\n\", c100 + c50 + c25 + c10 + c5 + c1);\n}\n"
        }, R`Each division takes as many coins of one value as possible, and <code>%</code> keeps what is left for the smaller coins. The total is the sum of the six counts, so each count needs its own variable. This "greedy" method gives the fewest coins for these coin values; for some other sets of coins it does not.`, { challenge: true, hint: [R`<code>fils / 100</code> is the number of $100$-fils coins and <code>fils % 100</code> is what is left. Store it back in <code>fils</code> and continue with $50$.`, R`Keep each count in its own variable, so that you can print them and add them all up for the last line.`] })
      ]
    }
  ]
});
})();
