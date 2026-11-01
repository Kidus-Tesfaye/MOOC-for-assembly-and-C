/* Part 2 - Numbers inside the computer (Lecture 2: numbering systems and logic operations) */
(function () {
const b8 = H.b8, h2 = H.h2;
const table16 = []; for (let i = 0; i < 16; i++) table16.push([H.b4(i), i.toString(16).toUpperCase(), String(i)]);
const dec = (s) => parseInt(s, 2);
const START = R`#include <stdio.h>

void main(void) {

}
`;
const prog = (body) => '#include <stdio.h>\n\nvoid main(void) {\n' + body.replace(/^/gm, '    ') + '\n}\n';

D.part({
  title: 'Numbers inside the computer',
  intro: R`<p>A processor stores every value as a pattern of bits. In this part you learn the three numbering systems used in low-level programming (decimal, binary and hexadecimal), how many values fit in a given number of bits, and the logic and arithmetic operations that the processor performs on bytes. You also meet the C operators that work directly on bits.</p>`,
  sections: [
    {
      title: 'Decimal, binary and hexadecimal',
      objectives: ['You will know the three numbering systems and their digits', 'You will know what a bit, a nibble, a byte and a word are', 'You will be able to write numbers in binary and hexadecimal in C and in assembly'],
      blocks: [
        D.T(R`<p>Three numbering systems are needed to write and understand low-level code:</p>
<ul>
<li><b>Decimal</b> numbers use base $10$ and the digits $0$ to $9$. The last digit is the base minus one: $10 - 1 = 9$. Humans count in decimal, on their ten fingers.</li>
<li><b>Binary</b> numbers use base $2$ and the digits $0$ and $1$ (the last digit is $2 - 1 = 1$). The processor uses binary: a $1$ or a $0$ means that a voltage is present or not. A single binary digit is called a <b>bit</b>.</li>
<li><b>Hexadecimal</b> numbers use base $16$ and sixteen digits, $0$ to $15$. To avoid digits made of two characters, the values $10$ to $15$ are written with the letters <b>A</b> to <b>F</b>. Programmers use hexadecimal to read binary numbers easily.</li>
</ul>
<p>In every system each digit is multiplied by the <b>weight</b> of its position, and the weights are powers of the base. For example</p>
$$125 = 1 \times 100 + 2 \times 10 + 5 \times 1 = 1 \times 10^{2} + 2 \times 10^{1} + 5 \times 10^{0}$$
<p>and in binary</p>
$$101_{2} = 1 \times 4 + 0 \times 2 + 1 \times 1 = 1 \times 2^{2} + 0 \times 2^{1} + 1 \times 2^{0} = 5.$$
<p>The small number after a value, as in $101_{2}$, tells the base when it is not obvious.</p>`),
        D.KEY('Bit, nibble, byte and word', R`<p>A group of $4$ bits is a <b>nibble</b>. A group of $8$ bits is a <b>byte</b>; a byte holds enough information to store one character, such as <code>A</code>, <code>@</code> or <code>6</code>. A group of more than $8$ bits is a <b>word</b>. The lecture writes the bits in groups of four for readability: <code>1010,0001</code> is a byte and <code>11,0010,0001</code> is a word of $10$ bits.</p>`),
        D.T(R`<p>It is worth memorising the first sixteen numbers in the three systems: they make every conversion fast. They come from counting in binary, adding $1$ each time ($0 + 1 = 1$, $1 + 1 = 10_{2}$):</p>`),
        D.TABLE(['Binary', 'Hexadecimal', 'Decimal'], table16, { mono: [0, 1, 2], small: true }),
        D.H('Writing numbers in programs'),
        D.T(R`<p>Both languages of the course let you write a number in any of the three systems. The value is the same; only the way of writing it changes:</p>`),
        D.TABLE(['System', 'In C (XC8)', 'In assembly (pic-as)'], [
          ['Decimal', '<code>25</code>', '<code>25</code>, <code>25D</code> or <code>D\'25\'</code>'],
          ['Hexadecimal', '<code>0x19</code> or <code>0X19</code>', '<code>0x19</code>, <code>19H</code> or <code>H\'19\'</code>'],
          ['Binary', '<code>0b00011001</code>', '<code>00011001B</code> or <code>B\'00011001\'</code>'],
          ['Character (ASCII code)', '<code>\'A\'</code> (value $65$)', '<code>\'A\'</code>']
        ]),
        D.T(R`<p>The lecture activities use these forms all the time: <code>OSCCON = 0b01100000;</code> in C and <code>MOVLW 01100000B</code> in assembly both select the $4\ \mathrm{MHz}$ clock. In C, <code>printf</code> can also print a number in hexadecimal with <code>%X</code> (capital letters) or <code>%x</code> (small letters):</p>`),
        D.CODE(R`#include <stdio.h>

void main(void) {
    printf("%d %X\n", 0b11010110, 0b11010110);
    printf("%d %X\n", 0xFF, 255);
}`),
        D.OUT(R`214 D6
255 FF`),
        D.match('Base of each system', 'Match each numbering system with its base.', [['Decimal', 'Base 10'], ['Binary', 'Base 2'], ['Hexadecimal', 'Base 16']], R`The base is the number of different digits: $10$, $2$ and $16$.`, { hint: 'Binary has only two digits.' }),
        D.num('The letter F', R`<p>In hexadecimal the letters A to F stand for $10$ to $15$. Which decimal value does <b>F</b> stand for?</p>`, 15, R`$A = 10$, $B = 11$, $C = 12$, $D = 13$, $E = 14$, $F = 15$.`, { hint: 'A is 10; count up A, B, C, D, E, F.' }),
        D.multi('Nibble and byte', 'How many bits are in each group?', [{ label: 'Nibble =', ans: [4], unit: 'bits' }, { label: 'Byte =', ans: [8], unit: 'bits' }], R`A nibble is $4$ bits and a byte is $8$ bits: a byte is two nibbles.`, { hint: 'A byte is two nibbles.' }),
        D.mc('Word', R`<p>The binary group <code>0010,0000,1111</code> has $12$ bits. According to the lecture it is called a …</p>`, ['bit', 'nibble', 'byte', 'word'], 3, R`A group of more than $8$ bits is a word; this one is a $12$-bit word.`, { hint: 'More than 8 bits.', fb: { 2: 'A byte has exactly 8 bits. This group has 12.' } }),
        D.num('Weighted sum', R`<p>Use the weights: what is the decimal value of the binary number <code>1101</code>?</p>`, dec('1101'), R`$1 \times 8 + 1 \times 4 + 0 \times 2 + 1 \times 1 = 13$.`, { hint: 'The weights from the right are 1, 2, 4 and 8.' }),
        D.fill('Weights of a byte', 'Write the missing weights of the 8 bits of a byte, from b7 down to b0.', 'b7=128  b6=64  b5=32  b4=16  b3={{8}}  b2={{4}}  b1={{2}}  b0={{1}}', R`The weights are the powers of two, from $2^{7} = 128$ down to $2^{0} = 1$.`, { lang: 'text', hint: 'Each weight is half of the one before it.' }),
        D.fill('Counting in binary', 'Complete these 4-bit values.', 'decimal 5  = {{0101}}\ndecimal 9  = {{1001}}\ndecimal 12 = {{1100}}\ndecimal 15 = {{1111}}', R`From the table: $5 = 0101_{2}$, $9 = 1001_{2}$, $12 = 1100_{2}$, $15 = 1111_{2}$.`, { lang: 'text', hint: 'Decimal 8 is 1000. Add the smaller weights.' }),
        D.num('Bits to hex', R`<p>Hexadecimal expresses the bits in nibbles. Convert <code>0010,0000,1111</code> to hexadecimal.</p>`, ['20F'], R`The nibbles are $0010 = 2$, $0000 = 0$ and $1111 = F$, so the number is $20F_{16}$.`, { kind: 'hex', hint: 'Convert each nibble separately: 0010, 0000, 1111.' }),
        D.num('Hex to bits', R`<p>Write the hexadecimal number <code>FAB3</code> in binary ($16$ bits).</p>`, ['1111101010110011'], R`$F = 1111$, $A = 1010$, $B = 1011$ and $3 = 0011$.`, { kind: 'bin', exact: true, hint: 'Replace each hexadecimal digit with its 4-bit group.' }),
        D.c('Three ways to write a number', R`<p>Write a program which prints the value of the binary literal <code>0b10100101</code> in decimal and in hexadecimal (capital letters), separated by a space, exactly like this:</p>`, {
          start: START, sample: '165 A5',
          tests: [{ name: 'Output', out: '165 A5\n' }],
          reqs: [{ re: /0b10100101/, msg: 'Use the binary literal 0b10100101 in printf.' }],
          forbid: [{ re: /165|A5/, msg: 'Let printf convert the number: do not type 165 or A5.' }],
          solution: prog(R`printf("%d %X\n", 0b10100101, 0b10100101);`)
        }, '', { hint: R`Use <code>%d</code> and <code>%X</code> in the same format string and give the same value twice after it.` })
      ]
    },
    {
      title: 'Converting between the systems',
      objectives: ['You will be able to convert between binary and decimal by hand', 'You will be able to convert between binary and hexadecimal by hand', 'You will know why you should convert between decimal and hexadecimal through binary'],
      blocks: [
        D.T(R`<p>While programming you will often convert numbers in your head: a register value shown in hexadecimal, a bit pattern for a port, a decimal setting from a formula. The lecture gives one important rule: <b>do not convert directly between hexadecimal and decimal; always pass through binary.</b></p>
<ul>
<li><b>Binary to decimal:</b> add the weights of the bits that are $1$.</li>
<li><b>Decimal to binary:</b> go through the weights from $128$ down to $1$. If the weight fits in what is left, write $1$ and subtract it; otherwise write $0$.</li>
<li><b>Binary and hexadecimal:</b> replace each nibble with its hexadecimal digit, or each hexadecimal digit with its nibble.</li>
</ul>`),
        D.EX('Binary 1101,0110 to decimal', '1101,0110', 'text', [], R`$1101\,0110_{2} = 1 \times 128 + 1 \times 64 + 0 \times 32 + 1 \times 16 + 0 \times 8 + 1 \times 4 + 1 \times 2 + 0 \times 1 = 214$. Remember the weights $2^{7} = 128$, $2^{6} = 64$, $2^{5} = 32$, $2^{4} = 16$, $2^{3} = 8$, $2^{2} = 4$, $2^{1} = 2$, $2^{0} = 1$.`, { lineNumbers: false }),
        D.T(R`<p>And the other way round, decimal $214$ to binary:</p>`),
        D.TABLE(['Question', 'Answer', 'Bit', 'What is left'], [
          [R`Does $214$ contain $128$?`, 'yes', 'b7 = 1', R`$214 - 128 = 86$`],
          [R`Does $86$ contain $64$?`, 'yes', 'b6 = 1', R`$86 - 64 = 22$`],
          [R`Does $22$ contain $32$?`, 'no', 'b5 = 0', R`$22$`],
          [R`Does $22$ contain $16$?`, 'yes', 'b4 = 1', R`$22 - 16 = 6$`],
          [R`Does $6$ contain $8$?`, 'no', 'b3 = 0', R`$6$`],
          [R`Does $6$ contain $4$?`, 'yes', 'b2 = 1', R`$6 - 4 = 2$`],
          [R`Does $2$ contain $2$?`, 'yes', 'b1 = 1', R`$2 - 2 = 0$`],
          [R`Does $0$ contain $1$?`, 'no', 'b0 = 0', R`$0$`]
        ], { small: true, cap: R`So $214 = 1101\,0110_{2}$.` }),
        D.T(R`<p>Converting decimal $120$ to hexadecimal, as in the lecture: $120$ contains $64$ (remainder $56$), $32$ (remainder $24$), $16$ (remainder $8$) and $8$ (remainder $0$), so $120 = 0111\,1000_{2}$. With the table, $0111 = 7$ and $1000 = 8$: $120 = 78_{16}$. In the other direction, $C7_{16} = 1100\,0111_{2} = 128 + 64 + 4 + 2 + 1 = 199$.</p>`),
        D.num('Binary to decimal', R`<p>Convert <code>B'11010001'</code> to decimal.</p>`, dec('11010001'), R`$128 + 64 + 16 + 1 = 209$.`, { hint: 'Add the weights of the 1 bits: 128, 64, 16 and 1.' }),
        D.num('Seven bits', R`<p>Convert <code>B'0111111'</code> to decimal.</p>`, dec('0111111'), R`$32 + 16 + 8 + 4 + 2 + 1 = 63$, which is also $64 - 1$.`, { hint: 'Six bits are 1: the weights 32, 16, 8, 4, 2 and 1.' }),
        D.num('Hex to decimal through binary', R`<p>Convert <code>H'AB'</code> to decimal. Pass through binary ($A = 1010$, $B = 1011$).</p>`, 0xAB, R`$1010\,1011_{2} = 128 + 32 + 8 + 2 + 1 = 171$.`, { hint: 'Write 1010,1011 and add the weights.' }),
        D.num('Decimal 255', R`<p>Convert <code>D'255'</code> to binary ($8$ bits).</p>`, [b8(255)], R`All eight weights fit: $128 + 64 + 32 + 16 + 8 + 4 + 2 + 1 = 255$.`, { kind: 'bin', exact: true, hint: 'It is the largest value of a byte.' }),
        D.num('Decimal 127', R`<p>Convert <code>D'127'</code> to binary ($8$ bits).</p>`, [b8(127)], R`$127 = 128 - 1$: all the bits except b7.`, { kind: 'bin', exact: true, hint: '127 is one less than 128.' }),
        D.num('Decimal 16', R`<p>Convert <code>D'16'</code> to binary ($8$ bits).</p>`, [b8(16)], R`$16$ is the weight of b4 alone.`, { kind: 'bin', exact: true, hint: 'Which single weight equals 16?' }),
        D.num('Hex to binary', R`<p>Convert <code>H'AC'</code> to binary ($8$ bits).</p>`, [b8(0xAC)], R`$A = 1010$ and $C = 1100$.`, { kind: 'bin', exact: true, hint: 'Convert each hexadecimal digit to a nibble.' }),
        D.num('Pad first', R`<p>Convert <code>B'11111'</code> to hexadecimal. Add leading zeros to make complete nibbles first.</p>`, ['1F'], R`$11111_{2} = 0001\,1111_{2} = 1F_{16}$.`, { kind: 'hex', hint: 'Write it as 0001,1111.' }),
        D.num('Decimal to hex', R`<p>Convert <code>D'128'</code> to hexadecimal (go through binary).</p>`, ['80'], R`$128 = 1000\,0000_{2} = 80_{16}$.`, { kind: 'hex', hint: 'First write 128 in binary.' }),
        D.fill('Decimal to hex by steps', 'Convert decimal 120 to hexadecimal as in the lecture.', '120 in binary = {{01111000}}\n0111,1000 in hexadecimal = {{78}}', R`$120 = 64 + 32 + 16 + 8 = 0111\,1000_{2}$, and $0111 = 7$, $1000 = 8$, so $78_{16}$.`, { lang: 'text', hint: 'The bits b6, b5, b4 and b3 are 1.' }),
        D.num('Hex C7', R`<p>Convert hexadecimal <code>C7</code> to decimal. Go through binary: $C7_{16} = 1100\,0111_{2}$.</p>`, 0xC7, R`$128 + 64 + 4 + 2 + 1 = 199$.`, { hint: 'Add the weights of the 1 bits of 1100,0111.' }),
        D.mc('Which route?', 'According to the lecture, how should you convert a larger value from hexadecimal to decimal?', ['Directly, using the hexadecimal digits', 'First to binary, then from binary to decimal', 'First to a word', 'It cannot be converted'], 1, 'Never convert between hexadecimal and decimal directly: always pass through binary.', { hint: 'Binary is the bridge between the other two systems.' }),
        D.multi('Both conversions', R`<p>Convert <code>D'200'</code> to binary and to hexadecimal.</p>`, [{ label: 'Binary (8 bits):', ans: [b8(200)], kind: 'bin', exact: true, width: 11 }, { label: 'Hex:', ans: [h2(200)], kind: 'hex' }], R`$200 = 128 + 64 + 8 = 1100\,1000_{2}$ and $1100\,1000_{2} = C8_{16}$.`, { hint: R`$200 - 128 = 72$ and $72 - 64 = 8$.` }),
        D.c('Conversion table', R`<p>Write a program which prints the following conversion table. The values in the first column are $10$, $100$, $200$ and $255$; let <code>printf</code> do the conversion with <code>%d</code> and <code>%X</code> (hint: the same value is given twice to each <code>printf</code>).</p>`, {
          start: START, sample: R`10 = 0xA
100 = 0x64
200 = 0xC8
255 = 0xFF`,
          tests: [{ name: 'Output', out: '10 = 0xA\n100 = 0x64\n200 = 0xC8\n255 = 0xFF\n' }],
          forbid: [{ re: /0x64|0xC8|0xFF|0xA\b/i, msg: 'Let printf produce the hexadecimal digits with %X.' }],
          solution: prog(R`printf("%d = 0x%X\n", 10, 10);
printf("%d = 0x%X\n", 100, 100);
printf("%d = 0x%X\n", 200, 200);
printf("%d = 0x%X\n", 255, 255);`)
        }, '', { hint: R`The text <code>0x</code> is printed as it is, and <code>%X</code> adds the hexadecimal digits: <code>printf("%d = 0x%X\n", 10, 10);</code>` })
      ]
    },
    {
      title: 'Bits, bytes and ranges',
      objectives: [R`You will know how many different values fit in $n$ bits`, 'You will know the ranges of unsigned and signed numbers', 'You will understand why an <code>int</code> of the PIC overflows above $32767$'],
      blocks: [
        D.T(R`<p>Each bit can be $0$ or $1$. Two bits give $2 \times 2 = 4$ combinations ($00$, $01$, $10$, $11$), three bits give $8$, and in general</p>
$$n \text{ bits can hold } 2^{n} \text{ different values.}$$
<p>If all of them are used for positive numbers (<b>unsigned</b> numbers), the range is $0 \ldots 2^{n} - 1$:</p>`),
        D.TABLE(['Bits', 'Number of values', 'Unsigned range', 'Example on the PIC16F887'], [
          ['$1$', '$2^{1} = 2$', '$0 \\ldots 1$', 'a pin: on or off'],
          ['$4$', '$2^{4} = 16$', '$0 \\ldots 15$', 'one hexadecimal digit'],
          ['$8$', '$2^{8} = 256$', '$0 \\ldots 255$', 'every RAM register, the W register'],
          ['$10$', '$2^{10} = 1024$', '$0 \\ldots 1023$', 'the result of the A/D converter'],
          ['$13$', '$2^{13} = 8192$', '$0 \\ldots 8191$', 'the addresses of the Flash memory'],
          ['$16$', '$2^{16} = 65536$', '$0 \\ldots 65535$', 'an <code>unsigned int</code> of XC8, Timer1']
        ]),
        D.T(R`<p>The same rule tells how many <b>address lines</b> a memory needs. The Flash memory of the PIC16F887 has $8192$ locations (the lecture calls them drawers), and $2^{13} = 8192$, so $13$ address lines are needed: the first address is $0$ and the last is $8191 = 1FFF_{16}$. Each location holds an instruction of $14$ bits, so the memory holds $8192 \times 14 = 114688$ bits.</p>`),
        D.H('Negative numbers'),
        D.T(R`<p>To store negative numbers, the processor uses the <b>two's complement</b> form, which you will meet in the last section of this part. In short, half of the combinations are used for negative numbers, and a <b>signed</b> number of $n$ bits holds the range</p>
$$-2^{n-1} \ldots 2^{n-1} - 1.$$
<p>For $8$ bits that is $-128 \ldots 127$, and for $16$ bits $-32768 \ldots 32767$, the range of an <code>int</code> of XC8 that you met in Part 1.</p>`),
        D.H('Overflow'),
        D.T(R`<p>When the result of a calculation needs more bits than the variable has, the extra high bits are simply lost. Only the lowest $n$ bits remain, which mathematically is the remainder of the division by $2^{n}$. This is called <b>overflow</b> or <b>wrap-around</b>:</p>`),
        D.CODE(R`unsigned char x = 250;   // 8 bits: 0 ... 255
x = x + 10;              // 260 does not fit
printf("%d\n", x);`),
        D.OUT('4'),
        D.T(R`<p>Indeed $260 = 1\,0000\,0100_{2}$ needs $9$ bits; the lowest $8$ bits are $0000\,0100_{2} = 4$, that is $260 - 256 = 4$. The seconds of a day in Part 1 overflowed in the same way: $86400 - 65536 = 20864$. In assembly the lost ninth bit is not completely lost: it goes to the <b>Carry</b> flag, as you will see in Part 4.</p>`),
        D.num('Values in a nibble', R`<p>How many different values can a nibble hold?</p>`, 16, R`A nibble has $4$ bits: $2^{4} = 16$ values, from $0$ to $15$.`, { hint: R`Use $2^{n}$.` }),
        D.num('Address lines', R`<p>How many address lines are needed to address a memory of $64$ kilobytes? ($1\ \text{kB} = 1024$ bytes.)</p>`, 16, R`$64 \times 1024 = 65536 = 2^{16}$, so $16$ address lines.`, { hint: R`Write $64 \times 1024$ as a power of two: $64 = 2^{6}$ and $1024 = 2^{10}$.` }),
        D.num('A USB stick', R`<p>A USB memory of $4$ gigabytes has $4 \times 2^{30}$ bytes. How many address lines are needed to reach every byte?</p>`, 32, R`$4 \times 2^{30} = 2^{2} \times 2^{30} = 2^{32}$, so $32$ address lines.`, { hint: R`$4 = 2^{2}$; when powers of two are multiplied, the exponents are added.` }),
        D.multi('Last address', R`<p>A memory has $14$ address lines. Give its number of locations and its last address in hexadecimal.</p>`, [{ label: 'Locations:', ans: [16384] }, { label: 'Last address (hex):', ans: ['3FFF'], kind: 'hex' }], R`$2^{14} = 16384$ locations, from $0$ to $16383 = 11\,1111\,1111\,1111_{2} = 3FFF_{16}$.`, { hint: 'The last address is all ones: 14 ones in binary.' }),
        D.mc('Signed range', R`<p>What is the range of a signed $8$-bit number (<code>signed char</code>)?</p>`, ['$-128 \\ldots 127$', '$0 \\ldots 255$', '$-127 \\ldots 128$', '$-255 \\ldots 255$'], 0, R`$-2^{7} \ldots 2^{7} - 1 = -128 \ldots 127$.`, { hint: R`Use $-2^{n-1} \ldots 2^{n-1} - 1$ with $n = 8$.` }),
        D.c('Predict the wrap-around', R`<p>The program below adds to an <code>unsigned char</code>. Complete it so that it also prints the sum of <code>a</code> and <code>b</code> stored in an <code>int</code> variable <code>big</code>. Run it and compare the two numbers. The program should print exactly:</p>`, {
          start: R`#include <stdio.h>

void main(void) {
    unsigned char a = 200;
    unsigned char b = 100;
    unsigned char small = a + b;

    printf("small = %d\n", small);
}
`, sample: R`small = 44
big = 300`,
          tests: [{ name: 'Output', out: 'small = 44\nbig = 300\n' }],
          reqs: [{ re: /int\s+big\s*=\s*a\s*\+\s*b|int\s+big\s*=\s*b\s*\+\s*a|int\s+big\s*;[\s\S]*big\s*=\s*a\s*\+\s*b/, msg: 'Declare int big and store a + b in it.' }],
          forbid: [{ re: /printf\s*\(\s*"big = 300/, msg: 'Print the variable big with %d.' }],
          solution: R`#include <stdio.h>

void main(void) {
    unsigned char a = 200;
    unsigned char b = 100;
    unsigned char small = a + b;
    int big = a + b;

    printf("small = %d\n", small);
    printf("big = %d\n", big);
}
`
        }, '', { hint: R`Add <code>int big = a + b;</code> and a second <code>printf</code>. An <code>int</code> has $16$ bits, so $300$ fits.` }),
        D.num('Wrap-around', R`<p>What does this program print?</p>`, 4, R`$255 + 5 = 260$ does not fit in $8$ bits; $260 - 256 = 4$.`, { snippet: { text: R`unsigned char t = 255;
t = t + 5;
printf("%d\n", t);`, lang: 'c' }, hint: 'Only the lowest 8 bits are kept: subtract 256.' })
      ]
    },
    {
      title: 'Logic operations on bytes',
      objectives: ['You will be able to calculate AND, OR, XOR and NOT on bytes', 'You will know the C operators <code>&amp;</code>, <code>|</code>, <code>^</code> and <code>~</code>', 'You will know how a mask selects some bits of a byte'],
      blocks: [
        D.T(R`<p>Logic gates are the building blocks of every digital circuit: AND, OR, NOT, XOR and their inverted versions. In an 8-bit processor the main logic operations are <b>AND</b>, <b>OR</b> and <b>XOR</b>. They work on a whole byte at once: bit 0 with bit 0, bit 1 with bit 1, and so on.</p>`),
        D.TABLE(['a', 'b', 'a AND b', 'a OR b', 'a XOR b'], [['0', '0', '0', '0', '0'], ['0', '1', '0', '1', '1'], ['1', '0', '0', '1', '1'], ['1', '1', '1', '1', '0']], { mono: [0, 1, 2, 3, 4], small: true, cap: 'AND is 1 only when both bits are 1; OR is 1 when at least one bit is 1; XOR is 1 when the bits are different.' }),
        D.EX('Logic operations on two bytes (Lecture 2)', 'Byte 1          10100001\nByte 2          11011100\nByte 1 AND 2    10000000\nByte 1 OR  2    11111101\nByte 1 XOR 2    01111101', 'text', [], 'Compare the bytes column by column.', { lineNumbers: false }),
        D.H('Bitwise operators in C'),
        D.T(R`<p>C has an operator for each of these operations. They are called <b>bitwise</b> operators because they work on every bit separately:</p>`),
        D.TABLE(['Operator', 'Operation', 'Example', 'Result'], [
          ['<code>&amp;</code>', 'AND', '<code>0b1010 &amp; 0b0110</code>', '<code>0b0010</code>'],
          ['<code>|</code>', 'OR', '<code>0b1010 | 0b0110</code>', '<code>0b1110</code>'],
          ['<code>^</code>', 'XOR', '<code>0b1010 ^ 0b0110</code>', '<code>0b1100</code>'],
          ['<code>~</code>', 'NOT (complement: every bit flipped)', '<code>~0b00001111</code> (as an <code>unsigned char</code>)', '<code>0b11110000</code>']
        ]),
        D.WARN('Do not confuse & with &&', R`<p>C also has the <i>logical</i> operators <code>&amp;&amp;</code> (and), <code>||</code> (or) and <code>!</code> (not), which you will use in conditions in Part 4. They treat a whole value as true (not zero) or false (zero). <code>&amp;</code>, <code>|</code>, <code>^</code> and <code>~</code> work bit by bit.</p>`),
        D.H('Masks'),
        D.T(R`<p>AND is used to keep some bits and clear the others. The second byte is then called a <b>mask</b>: where the mask has a $1$ the bit is kept, where it has a $0$ the bit is cleared. In <b>Activity 7</b> four switches are connected to the lowest four pins of PORTD, and only those bits matter, so the program masks the port:</p>`),
        D.SIDE(R`PORTD_TEMP = PORTD & 0b00001111;`, R`MOVF    PORTD, W
ANDLW   00001111B   ; masking the 4 lowest bits
MOVWF   PORTD_TEMP`, { cap: 'The same masking in C (Activity 7C) and in assembly (Activity 7).' }),
        D.T(R`<p>In the same way OR <i>sets</i> bits (where the mask has a $1$ the result is $1$) and XOR <i>toggles</i> bits (where the mask has a $1$ the bit is inverted). Activity 10 toggles the pin RD0 with an XOR. You will use these three tricks constantly in Part 7.</p>`),
        D.mc('Main logic operations', 'Which three logic operations are the main ones in an 8-bit microcontroller (Lecture 2)?', ['AND, OR and XOR', 'NAND, NOR and NOT', 'ADD, SUB and MUL', 'SHIFT, ROTATE and SWAP'], 0, 'The lecture names AND, OR and XOR, applied byte with byte.', { hint: 'They are the three operations of the worked example with 10100001 and 11011100.' }),
        D.num('AND', R`<p>Calculate <code>1010,0001</code> AND <code>1101,1100</code>. Write the $8$-bit result.</p>`, [b8(0xA1 & 0xDC)], 'The result is 1 only where both bytes have a 1: bit 7 only.', { kind: 'bin', exact: true, hint: 'Compare bit by bit. Bit 7: 1 AND 1 = 1. Bit 6: 0 AND 1 = 0.' }),
        D.num('OR', R`<p>Calculate <code>1010,0001</code> OR <code>1101,1100</code>.</p>`, [b8(0xA1 | 0xDC)], 'The result is 1 wherever at least one of the bits is 1.', { kind: 'bin', exact: true, hint: 'A bit is 1 if it is 1 in either byte.' }),
        D.num('XOR', R`<p>Calculate <code>1010,0001</code> XOR <code>1101,1100</code>.</p>`, [b8(0xA1 ^ 0xDC)], 'XOR is 1 where the two bits are different.', { kind: 'bin', exact: true, hint: 'Equal bits give 0, different bits give 1.' }),
        D.num('AND with 127', R`<p>Calculate $128 \text{ AND } 127$. Give the decimal result.</p>`, 0, R`$128 = 1000\,0000_{2}$ and $127 = 0111\,1111_{2}$ have no common $1$ bit, so the result is $0$.`, { hint: 'Write both numbers in binary first.' }),
        D.num('OR with hex', R`<p>Calculate <code>H'AF'</code> OR <code>B'10100001'</code>. Give the result in hexadecimal.</p>`, [h2(0xAF | 0xA1)], R`$AF_{16} = 1010\,1111_{2}$ already has a $1$ wherever $1010\,0001_{2}$ has one, so the result is $AF_{16}$.`, { kind: 'hex', hint: "Convert H'AF' to binary first." }),
        D.c('Bitwise in C', R`<p>The variables <code>a</code> and <code>b</code> hold two bytes. Write a program which prints <code>a AND b</code>, <code>a OR b</code> and <code>a XOR b</code> in hexadecimal (capital letters, two digits each, use <code>%02X</code>) in the format shown. The tests use other values of <code>a</code> and <code>b</code>.</p>`, {
          start: R`#include <stdio.h>

unsigned char a = 0xA1;
unsigned char b = 0xDC;

void main(void) {

}
`, sample: R`AND: 80
OR: FD
XOR: 7D`,
          tests: [{ name: 'a = 0xA1, b = 0xDC', out: 'AND: 80\nOR: FD\nXOR: 7D\n' }, { name: 'a = 0x0F, b = 0x3C', setGlobals: { a: 0x0F, b: 0x3C }, out: 'AND: 0C\nOR: 3F\nXOR: 33\n' }, { name: 'a = 0xFF, b = 0x00', setGlobals: { a: 0xFF, b: 0 }, out: 'AND: 00\nOR: FF\nXOR: FF\n' }],
          solution: R`#include <stdio.h>

unsigned char a = 0xA1;
unsigned char b = 0xDC;

void main(void) {
    printf("AND: %02X\n", a & b);
    printf("OR: %02X\n", a | b);
    printf("XOR: %02X\n", a ^ b);
}
`
        }, '', { hint: R`<code>%02X</code> prints at least two hexadecimal digits, with a leading zero when needed. Use the operators <code>&amp;</code>, <code>|</code> and <code>^</code>.` }),
        D.c('Keep the low nibble', R`<p>The variable <code>port</code> holds the value read from a port. Only the four lowest bits matter (four switches, as in Activity 7). Store <code>port</code> masked with <code>0b00001111</code> in the variable <code>switches</code> and print it in decimal. The tests change the value of <code>port</code>.</p>`, {
          start: R`#include <stdio.h>

unsigned char port = 0b10101001;

void main(void) {
    unsigned char switches;

    printf("%d\n", switches);
}
`, sample: '9',
          tests: [{ name: 'port = 0b10101001', out: '9\n' }, { name: 'port = 0b11110111', setGlobals: { port: 0xF7 }, out: '7\n' }, { name: 'port = 0b01011100', setGlobals: { port: 0x5C }, out: '12\n' }],
          reqs: [{ re: /&/, msg: 'Use the AND operator & with a mask.' }],
          solution: R`#include <stdio.h>

unsigned char port = 0b10101001;

void main(void) {
    unsigned char switches;
    switches = port & 0b00001111;
    printf("%d\n", switches);
}
`
        }, '', { hint: R`<code>switches = port &amp; 0b00001111;</code> keeps bits 0–3 and clears bits 4–7.` }),
        D.num('Complement', R`<p>The variable <code>unsigned char m = 0b00110101;</code> is complemented: <code>m = ~m;</code>. What is <code>m</code> now, in binary ($8$ bits)?</p>`, [b8(~0x35 & 255)], 'Every bit is flipped: 0 becomes 1 and 1 becomes 0.', { kind: 'bin', exact: true, hint: 'Flip each of the 8 bits.' })
      ]
    },
    {
      title: 'Addition, subtraction and two\'s complement',
      objectives: ['You will be able to add two bytes and find the carry', 'You will know how the PIC subtracts with the two\'s complement', 'You will know how negative numbers are stored in a byte'],
      blocks: [
        D.T(R`<p>Addition of binary numbers starts from the least significant bit (LSB). As in decimal, a <b>carry</b> moves to the next column when a column overflows ($1 + 1 = 10_{2}$: write $0$, carry $1$). When the result of two bytes does not fit in $8$ bits, a ninth bit appears:</p>
$$1010\,0001_{2} + 1101\,1100_{2} = 1\,0111\,1101_{2} \qquad (161 + 220 = 381)$$
<p>The ninth bit is the <b>carry</b>. The processor stores it in a special bit, the <b>Carry flag C</b>, and keeps the lowest $8$ bits ($381 - 256 = 125 = 0111\,1101_{2}$) as the result.</p>`),
        D.H('Subtraction with the two\'s complement'),
        D.T(R`<p>The PIC has no real subtractor circuit; this keeps the chip simple and cheap. It subtracts by adding, using a method called the <b>two's complement</b>. To calculate $\text{Byte1} - \text{Byte2}$:</p>
<ol>
<li>complement Byte2 (flip every bit),</li>
<li>add $1$ to the result,</li>
<li>add Byte1 to the result of step 2.</li>
</ol>
<p>Flipping every bit of an $8$-bit number $x$ gives $255 - x$, and adding $1$ gives $256 - x$. So the processor actually calculates $\text{Byte1} + 256 - \text{Byte2}$, and the extra $256$ is exactly the ninth bit, the carry. The lecture works out three cases:</p>`),
        D.TABLE(['Case', 'Steps 1 and 2', 'Step 3', 'Carry', '8-bit result'], [
          [R`$60 - 50$`, R`$50 \to 205 \to 206$`, R`$60 + 206 = 266$`, '$1$', R`$10$ (positive)`],
          [R`$60 - 60$`, R`$60 \to 195 \to 196$`, R`$60 + 196 = 256$`, '$1$', R`$0$`],
          [R`$50 - 60$`, R`$60 \to 195 \to 196$`, R`$50 + 196 = 246$`, '$0$', R`$246$, which represents $246 - 256 = -10$`]
        ]),
        D.KEY('The carry after a subtraction', R`<p>After $\text{Byte1} - \text{Byte2}$ on the PIC: if $\text{Byte1} \geq \text{Byte2}$ the Carry is $1$; if $\text{Byte1} < \text{Byte2}$ the Carry is $0$ and the $8$-bit result is a negative number, stored as $\text{result} = \text{value} + 256$. Other microcontrollers may subtract differently, and their carry may mean the opposite.</p>`),
        D.T(R`<p>This is also how negative numbers are stored. In an $8$-bit <b>signed</b> variable, the values $128 \ldots 255$ represent $-128 \ldots -1$: the stored pattern of $-x$ is $256 - x$. The highest bit, b7, is then $1$ for every negative number and is called the <b>sign bit</b>. C shows the same bits in two ways, depending on the type:</p>`),
        D.CODE(R`signed char s = -10;
unsigned char u = s;          // the same 8 bits
printf("%d %d %X\n", s, u, u);`),
        D.OUT('-10 246 F6'),
        D.mc('No subtractor', 'How does the PIC perform a subtraction?', ['With a dedicated subtractor circuit', 'By adding the two\'s complement of the second number', 'It cannot subtract', 'By dividing'], 1, 'There is no real subtractor: the PIC adds the two\'s complement of Byte2 to Byte1.', { hint: 'The lecture calls the method the two\'s complement.' }),
        D.order('Subtraction steps', R`<p>Put the three steps of $\text{Byte1} - \text{Byte2}$ in the correct order.</p>`, ['Flip every bit of Byte2 (complement)', 'Add 1 to the result', 'Add Byte1 to the result of the previous step'], 'Complement Byte2, add 1, then add Byte1.', { hint: 'First you need the two\'s complement of Byte2.' }),
        D.multi('Adding two bytes', R`<p>Add <code>1010,0001</code> + <code>1101,1100</code> starting from the LSB. Give the $8$-bit result and the carry out of bit 7.</p>`, [{ label: 'Result byte:', ans: [b8((0xA1 + 0xDC) & 255)], kind: 'bin', exact: true, width: 11 }, { label: 'Carry:', ans: [1] }], R`$161 + 220 = 381 = 256 + 125$. The $8$ bits hold $125 = 0111\,1101_{2}$ and the carry is $1$.`, { hint: 'Anything above 255 produces a carry.' }),
        D.multi('Case Byte1 = Byte2', R`<p>Calculate $60 - 60$ with the two's complement. Byte2 flipped is $195$ and adding $1$ gives $196$.</p>`, [{ label: R`$60 + 196 =$`, ans: [256] }, { label: '8-bit value:', ans: [0] }, { label: 'Carry:', ans: [1] }], R`$60 + 196 = 256 = 1\,0000\,0000_{2}$: the $8$-bit value is $0$ and the carry is $1$.`, { hint: '256 needs 9 bits.' }),
        D.multi('Case Byte1 < Byte2', R`<p>Calculate $50 - 60$ with the two's complement ($60$ flipped is $195$, plus $1$ is $196$).</p>`, [{ label: R`$50 + 196 =$`, ans: [246] }, { label: 'Carry:', ans: [0] }, { label: R`Value represented ($246 - 256$):`, ans: [-10] }], R`$50 + 196 = 246$ with no carry, so the result is negative: $246 - 256 = -10$.`, { hint: 'The sum does not exceed 255.' }),
        D.mc('Carry after subtraction', R`<p>The PIC calculates $\text{Byte1} - \text{Byte2}$ with Byte1 $= 20$ and Byte2 $= 35$. What are the carry and the meaning of the $8$-bit result?</p>`, ['Carry = 1 and the result is positive', R`Carry = 0 and the result is negative: $241 - 256 = -15$`, 'Carry = 0 and the result is $0$', R`Carry = 1 and the result is $-15$`], 1, R`$20 < 35$, so the carry is $0$; the result is $20 + (256 - 35) = 241$, which represents $241 - 256 = -15$.`, { hint: R`Is $\text{Byte1} \geq \text{Byte2}$?` }),
        D.multi('128 − H\'1F\'', R`<p>Calculate $128 - 1F_{16}$ with the two's complement. $1F_{16} = 0001\,1111_{2} = 31$.</p>`, [{ label: 'Flipped (decimal):', ans: [224] }, { label: 'After adding 1:', ans: [225] }, { label: R`8-bit result of $128 + 225$:`, ans: [97] }, { label: 'Carry:', ans: [1] }], R`$31$ flipped is $1110\,0000_{2} = 224$; $224 + 1 = 225$; $128 + 225 = 353 = 256 + 97$, so the result is $97$ with carry $1$.`, { hint: 'Flip 0001,1111 to get 1110,0000.' }),
        D.txt('The overflow bit', R`<p>Which bit of the $8$-bit STATUS register shows that the result of an arithmetic operation does not fit in $8$ bits? Write its name.</p>`, [/^(the )?carry( bit| flag)?$/i, /^c$/i, /^c bit$/i, /^c flag$/i], 'The Carry (C) flag receives the ninth bit.', { hint: 'It is the ninth bit that appears when 255 is exceeded.', solText: 'Carry (C)', solInput: 'Carry' }),
        D.c('Two views of a byte', R`<p>The variable <code>s</code> is a <code>signed char</code>. Print its value as a signed number, then the same $8$ bits as an unsigned number and in hexadecimal, exactly in the format shown. The tests use other values.</p>`, {
          start: R`#include <stdio.h>

signed char s = -10;

void main(void) {

}
`, sample: R`signed: -10
unsigned: 246
hex: F6`,
          tests: [{ name: 's = -10', out: 'signed: -10\nunsigned: 246\nhex: F6\n' }, { name: 's = -128', setGlobals: { s: -128 }, out: 'signed: -128\nunsigned: 128\nhex: 80\n' }, { name: 's = 100', setGlobals: { s: 100 }, out: 'signed: 100\nunsigned: 100\nhex: 64\n' }],
          solution: R`#include <stdio.h>

signed char s = -10;

void main(void) {
    unsigned char u = s;
    printf("signed: %d\n", s);
    printf("unsigned: %d\n", u);
    printf("hex: %X\n", u);
}
`
        }, '', { hint: [R`Copy <code>s</code> into an <code>unsigned char</code> variable: the bits stay the same, only the meaning changes.`, R`Print the unsigned copy with <code>%d</code> and with <code>%X</code>.`] })
      ]
    }
  ]
});
})();
