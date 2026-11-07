/* Part 1 - Numbers inside the computer (Lecture 2: numbering systems and logic operations) */
(function () {
const b8 = H.b8, h2 = H.h2;
const table16 = []; for (let i = 0; i < 16; i++) table16.push([H.b4(i), i.toString(16).toUpperCase(), String(i)]);
const dec = (s) => parseInt(s, 2);
const NUMRES = 'NUM    EQU 0x20\nRESULT EQU 0x21\n\n; write your instructions here\n\n    GOTO $\n';

D.part({
  title: 'Numbers inside the computer',
  intro: R`<p>A processor stores every value as a pattern of bits. In this part you learn the three numbering systems used in assembly programming (decimal, binary and hexadecimal), how many values fit in a given number of bits, and the logic and arithmetic operations that the processor performs on bytes. Along the way you write your first lines of assembly: putting a number in a register.</p>`,
  sections: [
    {
      title: 'Decimal, binary and hexadecimal',
      objectives: ['You will know the three numbering systems and their digits', 'You will know what a bit, a nibble, a byte and a word are', 'You will be able to write numbers in binary, hexadecimal and decimal in assembly'],
      blocks: [
        D.T(R`<p>Three numbering systems are needed to write and understand assembly code:</p>
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
        D.H('Writing numbers in assembly'),
        D.T(R`<p>The pic-as assembler lets you write a number in any of the three systems. The value is the same; only the way of writing it changes. A number written without a prefix or a suffix is <b>decimal</b>.</p>`),
        D.TABLE(['System', 'How to write it in pic-as', 'Example: the value $25$'], [
          ['Decimal', 'plain, or with <code>D</code>', '<code>25</code>, <code>25D</code> or <code>D\'25\'</code>'],
          ['Hexadecimal', 'prefix <code>0x</code>, suffix <code>H</code> or <code>H\'…\'</code>', '<code>0x19</code>, <code>19H</code> or <code>H\'19\'</code>'],
          ['Binary', 'suffix <code>B</code> or <code>B\'…\'</code>', '<code>00011001B</code> or <code>B\'00011001\'</code>'],
          ['Character (ASCII code)', 'between single quotes', '<code>\'A\'</code> is the value $65$']
        ]),
        D.T(R`<p>Here are your first two instructions. <code>MOVLW k</code> (<i>move literal to W</i>) puts the number $k$ in <b>W</b>, the working register of the processor. <code>MOVWF f</code> (<i>move W to f</i>) copies W into the RAM register at address $f$. A name for an address is given with <code>EQU</code>, so that the program can say <code>COUNT</code> instead of <code>0x20</code>:</p>`),
        D.CODE(R`COUNT   EQU 0x20       ; the name COUNT means address 0x20

        MOVLW   25         ; decimal 25 into W
        MOVLW   0x19       ; hexadecimal 19: the same value
        MOVLW   00011001B  ; binary: the same value again
        MOVWF   COUNT      ; copy W (25) into COUNT
        GOTO    $          ; stop here`, 'asm'),
        D.T(R`<p>The lecture activities use these forms all the time: <code>MOVLW 01100000B</code> selects the $4\ \mathrm{MHz}$ clock and <code>MOVLW 0X70</code> is an address. You will meet the instructions properly in Part 2; for now, use them to store numbers.</p>`),
        D.match('Base of each system', 'Match each numbering system with its base.', [['Decimal', 'Base 10'], ['Binary', 'Base 2'], ['Hexadecimal', 'Base 16']], R`The base is the number of different digits: $10$, $2$ and $16$.`, { hint: 'Binary has only two digits.' }),
        D.num('The letter F', R`<p>In hexadecimal the letters A to F stand for $10$ to $15$. Which decimal value does <b>F</b> stand for?</p>`, 15, R`$A = 10$, $B = 11$, $C = 12$, $D = 13$, $E = 14$, $F = 15$.`, { hint: 'A is 10; count up A, B, C, D, E, F.' }),
        D.multi('Nibble and byte', 'How many bits are in each group?', [{ label: 'Nibble =', ans: [4], unit: 'bits' }, { label: 'Byte =', ans: [8], unit: 'bits' }], R`A nibble is $4$ bits and a byte is $8$ bits: a byte is two nibbles.`, { hint: 'A byte is two nibbles.' }),
        D.mc('Word', R`<p>The binary group <code>0010,0000,1111</code> has $12$ bits. According to the lecture it is called a …</p>`, ['bit', 'nibble', 'byte', 'word'], 3, R`A group of more than $8$ bits is a word; this one is a $12$-bit word.`, { hint: 'More than 8 bits.', fb: { 2: 'A byte has exactly 8 bits. This group has 12.' } }),
        D.num('Weighted sum', R`<p>Use the weights: what is the decimal value of the binary number <code>1101</code>?</p>`, dec('1101'), R`$1 \times 8 + 1 \times 4 + 0 \times 2 + 1 \times 1 = 13$.`, { hint: 'The weights from the right are 1, 2, 4 and 8.' }),
        D.fill('Weights of a byte', 'Write the missing weights of the 8 bits of a byte, from b7 down to b0.', 'b7=128  b6=64  b5=32  b4=16  b3={{8}}  b2={{4}}  b1={{2}}  b0={{1}}', R`The weights are the powers of two, from $2^{7} = 128$ down to $2^{0} = 1$.`, { lang: 'text', hint: 'Each weight is half of the one before it.' }),
        D.fill('Counting in binary', 'Complete these 4-bit values.', 'decimal 5  = {{0101}}\ndecimal 9  = {{1001}}\ndecimal 12 = {{1100}}\ndecimal 15 = {{1111}}', R`From the table: $5 = 0101_{2}$, $9 = 1001_{2}$, $12 = 1100_{2}$, $15 = 1111_{2}$.`, { lang: 'text', hint: 'Decimal 8 is 1000. Add the smaller weights.' }),
        D.num('Bits to hex', R`<p>Hexadecimal expresses the bits in nibbles. Convert <code>0010,0000,1111</code> to hexadecimal.</p>`, ['20F'], R`The nibbles are $0010 = 2$, $0000 = 0$ and $1111 = F$, so the number is $20F_{16}$.`, { kind: 'hex', hint: 'Convert each nibble separately: 0010, 0000, 1111.' }),
        D.num('Hex to bits', R`<p>Write the hexadecimal number <code>FAB3</code> in binary ($16$ bits).</p>`, ['1111101010110011'], R`$F = 1111$, $A = 1010$, $B = 1011$ and $3 = 0011$.`, { kind: 'bin', exact: true, hint: 'Replace each hexadecimal digit with its 4-bit group.' }),
        D.asm('Three ways to write a number', R`<p>Store the value $165$ in the three registers <code>VAL_B</code>, <code>VAL_H</code> and <code>VAL_D</code>. Write the number in <b>binary</b> for <code>VAL_B</code>, in <b>hexadecimal</b> for <code>VAL_H</code> and in <b>decimal</b> for <code>VAL_D</code>, each time with <code>MOVLW</code> followed by <code>MOVWF</code>.</p>`, {
          start: 'VAL_B   EQU 0x20\nVAL_H   EQU 0x21\nVAL_D   EQU 0x22\n\n; write your instructions here\n\n        GOTO $\n',
          tests: [{ expect: { VAL_B: 165, VAL_H: 165, VAL_D: 165 } }],
          reqs: [{ re: /MOVLW\s+(?:10100101B\b|B'10100101')/i, msg: R`Write $165$ in binary once: MOVLW 10100101B.` }, { re: /MOVLW\s+(?:0x0*A5\b|0[0-9A-F]*A5H\b|H'0*A5')/i, msg: R`Write $165$ in hexadecimal once: MOVLW 0xA5.` }, { re: /MOVLW\s+(?:165\b|165D\b|D'165')/i, msg: R`Write $165$ in decimal once: MOVLW 165.` }],
          solution: 'VAL_B   EQU 0x20\nVAL_H   EQU 0x21\nVAL_D   EQU 0x22\n\n        MOVLW   10100101B   ; binary\n        MOVWF   VAL_B\n        MOVLW   0xA5        ; hexadecimal\n        MOVWF   VAL_H\n        MOVLW   165         ; decimal\n        MOVWF   VAL_D\n        GOTO    $\n'
        }, R`All three registers receive the same $8$ bits, $1010\,0101_{2} = A5_{16} = 165$. The assembler converts the number; the chip only ever sees bits.`, { hint: [R`$165 = 128 + 32 + 4 + 1$, so in binary it is $1010\,0101_{2}$; in hexadecimal it is $A5_{16}$.`, R`For each register: <code>MOVLW</code> with the number, then <code>MOVWF</code> with the name of the register.`] })
      ]
    },
    {
      title: 'Converting between the systems',
      objectives: ['You will be able to convert between binary and decimal by hand', 'You will be able to convert between binary and hexadecimal by hand', 'You will know why you should convert between decimal and hexadecimal through binary'],
      blocks: [
        D.T(R`<p>While programming in assembly you convert numbers in your head all the time: a register value shown in hexadecimal, a bit pattern for a port, a decimal setting from a formula. The lecture gives one important rule: <b>do not convert directly between hexadecimal and decimal; always pass through binary.</b></p>
<ul>
<li><b>Binary to decimal:</b> add the weights of the bits that are $1$.</li>
<li><b>Decimal to binary:</b> go through the weights from $128$ down to $1$. If the weight fits in what is left, write $1$ and subtract it; otherwise write $0$.</li>
<li><b>Binary and hexadecimal:</b> replace each nibble with its hexadecimal digit, or each hexadecimal digit with its nibble.</li>
</ul>`),
        D.EX('Binary 1101,0110 to decimal', '1101,0110', 'text', [], R`$1101\,0110_{2} = 1 \times 128 + 1 \times 64 + 0 \times 32 + 1 \times 16 + 0 \times 8 + 1 \times 4 + 1 \times 2 + 0 \times 1 = 214$. Remember the weights $2^{7} = 128$, $2^{6} = 64$, $2^{5} = 32$, $2^{4} = 16$, $2^{3} = 8$, $2^{2} = 4$, $2^{1} = 2$, $2^{0} = 1$.`, { lineNumbers: false }),
        D.T(R`<p>And the other way round, decimal $214$ to binary:</p>`),
        D.TABLE(['Question', 'Answer', 'Bit', 'What is left'], [
          [R`Does $214$ contain $128$?`, 'yes', R`$b_{7} = 1$`, R`$214 - 128 = 86$`],
          [R`Does $86$ contain $64$?`, 'yes', R`$b_{6} = 1$`, R`$86 - 64 = 22$`],
          [R`Does $22$ contain $32$?`, 'no', R`$b_{5} = 0$`, R`$22$`],
          [R`Does $22$ contain $16$?`, 'yes', R`$b_{4} = 1$`, R`$22 - 16 = 6$`],
          [R`Does $6$ contain $8$?`, 'no', R`$b_{3} = 0$`, R`$6$`],
          [R`Does $6$ contain $4$?`, 'yes', R`$b_{2} = 1$`, R`$6 - 4 = 2$`],
          [R`Does $2$ contain $2$?`, 'yes', R`$b_{1} = 1$`, R`$2 - 2 = 0$`],
          [R`Does $0$ contain $1$?`, 'no', R`$b_{0} = 0$`, R`$0$`]
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
        D.mc('Same value?', R`<p>Three of these instructions load the same number into W. Which one loads a <b>different</b> number?</p>`, ['<code>MOVLW 0x64</code>', '<code>MOVLW 100</code>', '<code>MOVLW 01100100B</code>', '<code>MOVLW 64</code>'], 3, R`$64_{16} = 0110\,0100_{2} = 64 + 32 + 4 = 100$. A plain number is decimal in pic-as, so <code>MOVLW 64</code> loads $64 = 40_{16}$, a different value.`, { hint: 'Convert <code>0x64</code> to decimal through binary. Which system does a plain number use?' })
      ]
    },
    {
      title: 'Bits, bytes and ranges',
      objectives: [R`You will know how many different values fit in $n$ bits`, 'You will know the ranges of unsigned and signed numbers', 'You will know what happens when a result does not fit in a byte'],
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
          ['$16$', '$2^{16} = 65536$', '$0 \\ldots 65535$', 'Timer1, a pair of registers (Part 8)']
        ]),
        D.T(R`<p>The same rule tells how many <b>address lines</b> a memory needs. The Flash memory of the PIC16F887 has $8192$ locations (the lecture calls them drawers), and $2^{13} = 8192$, so $13$ address lines are needed: the first address is $0$ and the last is $8191 = 1FFF_{16}$. Each location holds an instruction of $14$ bits, so the memory holds $8192 \times 14 = 114688$ bits.</p>`),
        D.H('Negative numbers'),
        D.T(R`<p>To store negative numbers, the processor uses the <b>two's complement</b> form, which you will meet in the last section of this part. In short, half of the combinations are used for negative numbers, and a <b>signed</b> number of $n$ bits holds the range</p>
$$-2^{n-1} \ldots 2^{n-1} - 1.$$
<p>For $8$ bits that is $-128 \ldots 127$, and for $16$ bits $-32768 \ldots 32767$.</p>`),
        D.H('Overflow'),
        D.T(R`<p>When the result of a calculation needs more bits than the register has, the extra high bits do not fit. Only the lowest $8$ bits stay in the register, which mathematically is the remainder of the division by $2^{8} = 256$. This is called <b>overflow</b> or <b>wrap-around</b>. <code>ADDLW k</code> adds the number $k$ to W:</p>`),
        D.CODE(R`        MOVLW   250        ; W = 250
        ADDLW   10         ; 250 + 10 = 260 does not fit: W = 4, C = 1
        GOTO    $`, 'asm'),
        D.T(R`<p>Indeed $260 = 1\,0000\,0100_{2}$ needs $9$ bits; the lowest $8$ bits are $0000\,0100_{2} = 4$, that is $260 - 256 = 4$. The ninth bit is not completely lost: it goes to the <b>Carry</b> flag C, a single bit of the STATUS register. Parts 3 and 4 show how programs use it.</p>`),
        D.num('Values in a nibble', R`<p>How many different values can a nibble hold?</p>`, 16, R`A nibble has $4$ bits: $2^{4} = 16$ values, from $0$ to $15$.`, { hint: R`Use $2^{n}$.` }),
        D.num('Address lines', R`<p>How many address lines are needed to address a memory of $64$ kilobytes? ($1\ \text{kB} = 1024$ bytes.)</p>`, 16, R`$64 \times 1024 = 65536 = 2^{16}$, so $16$ address lines.`, { hint: R`Write $64 \times 1024$ as a power of two: $64 = 2^{6}$ and $1024 = 2^{10}$.` }),
        D.num('A USB stick', R`<p>A USB memory of $4$ gigabytes has $4 \times 2^{30}$ bytes. How many address lines are needed to reach every byte?</p>`, 32, R`$4 \times 2^{30} = 2^{2} \times 2^{30} = 2^{32}$, so $32$ address lines.`, { hint: R`$4 = 2^{2}$; when powers of two are multiplied, the exponents are added.` }),
        D.multi('Last address', R`<p>A memory has $14$ address lines. Give its number of locations and its last address in hexadecimal.</p>`, [{ label: 'Locations:', ans: [16384] }, { label: 'Last address (hex):', ans: ['3FFF'], kind: 'hex' }], R`$2^{14} = 16384$ locations, from $0$ to $16383 = 11\,1111\,1111\,1111_{2} = 3FFF_{16}$.`, { hint: 'The last address is all ones: 14 ones in binary.' }),
        D.mc('Signed range', R`<p>What is the range of a signed $8$-bit number?</p>`, ['$-128 \\ldots 127$', '$0 \\ldots 255$', '$-127 \\ldots 128$', '$-255 \\ldots 255$'], 0, R`$-2^{7} \ldots 2^{7} - 1 = -128 \ldots 127$.`, { hint: R`Use $-2^{n-1} \ldots 2^{n-1} - 1$ with $n = 8$.` }),
        D.num('Wrap-around', R`<p>What is in W after these two instructions?</p>`, 4, R`$255 + 5 = 260$ does not fit in $8$ bits; W keeps $260 - 256 = 4$ and the Carry flag becomes $1$.`, { snippet: { text: 'MOVLW 255\nADDLW 5', lang: 'asm' }, hint: 'Only the lowest 8 bits are kept: subtract 256.' }),
        D.trace('Wrap-around in W', R`<p>Follow W and the Carry flag C through the program. Each <code>ADDLW</code> sets C to $1$ when the sum does not fit in a byte and to $0$ when it fits; <code>MOVLW</code> does not change C.</p>`, { code: 'MOVLW 250\nADDLW 10\nADDLW 252\nADDLW 7', watch: ['W', 'C'] }, R`$250 + 10 = 260$: W keeps $4$ and C becomes $1$. $4 + 252 = 256$: W is $0$ and C is $1$. $0 + 7 = 7$ fits, so C goes back to $0$.`, { hint: 'When a sum is 256 or more, W keeps the sum minus 256 and C is 1; otherwise W is the sum and C is 0.' })
      ]
    },
    {
      title: 'Logic operations on bytes',
      objectives: ['You will be able to calculate AND, OR, XOR and NOT on bytes', 'You will know how a mask keeps, sets, clears or toggles some bits of a byte', 'You will be able to use ANDLW, IORLW and XORLW with a mask'],
      blocks: [
        D.T(R`<p>Logic gates are the building blocks of every digital circuit: AND, OR, NOT, XOR and their inverted versions. In an 8-bit processor the main logic operations are <b>AND</b>, <b>OR</b> and <b>XOR</b>. They work on a whole byte at once: bit 0 with bit 0, bit 1 with bit 1, and so on.</p>`),
        D.TABLE(['a', 'b', 'a AND b', 'a OR b', 'a XOR b'], [['0', '0', '0', '0', '0'], ['0', '1', '0', '1', '1'], ['1', '0', '0', '1', '1'], ['1', '1', '1', '1', '0']], { mono: [0, 1, 2, 3, 4], small: true, cap: 'AND is 1 only when both bits are 1; OR is 1 when at least one bit is 1; XOR is 1 when the bits are different.' }),
        D.EX('Logic operations on two bytes (Lecture 2)', 'Byte 1          10100001\nByte 2          11011100\nByte 1 AND 2    10000000\nByte 1 OR  2    11111101\nByte 1 XOR 2    01111101', 'text', [], 'Compare the bytes column by column.', { lineNumbers: false }),
        D.H('Logic instructions'),
        D.T(R`<p>The PIC has an instruction for each operation. The <i>literal</i> versions combine W with a number written in the instruction, and leave the result in W:</p>`),
        D.TABLE(['Instruction', 'Operation', 'Typical use'], [
          ['<code>ANDLW k</code>', R`$W \leftarrow W \text{ AND } k$`, 'keep the bits where $k$ has a $1$, clear the others'],
          ['<code>IORLW k</code>', R`$W \leftarrow W \text{ OR } k$`, 'set the bits where $k$ has a $1$ (IOR means <i>inclusive OR</i>)'],
          ['<code>XORLW k</code>', R`$W \leftarrow W \text{ XOR } k$`, 'toggle the bits where $k$ has a $1$'],
          ['<code>COMF f, d</code>', 'NOT: every bit of register $f$ flipped', 'complement a register']
        ]),
        D.H('Masks'),
        D.T(R`<p>The number $k$ that selects bits is called a <b>mask</b>. With AND, where the mask has a $1$ the bit is kept, where it has a $0$ the bit is cleared. In <b>Activity 7</b> four switches are connected to the lowest four pins of PORTD, and only those bits matter, so the program masks the port. <code>MOVF f, W</code> copies the register $f$ into W:</p>`),
        D.CODE(R`        MOVF    PORTD, W       ; read the port into W
        ANDLW   00001111B      ; masking the 4 lowest bits
        MOVWF   PORTD_TEMP     ; keep the result`, 'asm', { cap: 'Activity 7: only the four switches on RD0 to RD3 are kept.' }),
        D.T(R`<p>In the same way OR <i>sets</i> bits (where the mask has a $1$ the result is $1$) and XOR <i>toggles</i> bits (where the mask has a $1$ the bit is inverted). Activity 10 toggles the pin RD0 with an XOR. You will use these three tricks constantly in Part 7.</p>`),
        D.mc('Main logic operations', 'Which three logic operations are the main ones in an 8-bit microcontroller (Lecture 2)?', ['AND, OR and XOR', 'NAND, NOR and NOT', 'ADD, SUB and MUL', 'SHIFT, ROTATE and SWAP'], 0, 'The lecture names AND, OR and XOR, applied byte with byte.', { hint: 'They are the three operations of the worked example with 10100001 and 11011100.' }),
        D.num('AND', R`<p>Calculate <code>1010,0001</code> AND <code>1101,1100</code>. Write the $8$-bit result.</p>`, [b8(0xA1 & 0xDC)], 'The result is 1 only where both bytes have a 1: bit 7 only.', { kind: 'bin', exact: true, hint: R`Compare bit by bit. Bit 7: $1 \text{ AND } 1 = 1$. Bit 6: $0 \text{ AND } 1 = 0$.` }),
        D.num('OR', R`<p>Calculate <code>1010,0001</code> OR <code>1101,1100</code>.</p>`, [b8(0xA1 | 0xDC)], 'The result is 1 wherever at least one of the bits is 1.', { kind: 'bin', exact: true, hint: 'A bit is 1 if it is 1 in either byte.' }),
        D.num('XOR', R`<p>Calculate <code>1010,0001</code> XOR <code>1101,1100</code>.</p>`, [b8(0xA1 ^ 0xDC)], 'XOR is 1 where the two bits are different.', { kind: 'bin', exact: true, hint: 'Equal bits give 0, different bits give 1.' }),
        D.num('AND with 127', R`<p>Calculate $128 \text{ AND } 127$. Give the decimal result.</p>`, 0, R`$128 = 1000\,0000_{2}$ and $127 = 0111\,1111_{2}$ have no common $1$ bit, so the result is $0$.`, { hint: 'Write both numbers in binary first.' }),
        D.num('OR with hex', R`<p>Calculate <code>H'AF'</code> OR <code>B'10100001'</code>. Give the result in hexadecimal.</p>`, [h2(0xAF | 0xA1)], R`$AF_{16} = 1010\,1111_{2}$ already has a $1$ wherever $1010\,0001_{2}$ has one, so the result is $AF_{16}$.`, { kind: 'hex', hint: "Convert H'AF' to binary first." }),
        D.num('Complement', R`<p>The register <code>M</code> holds <code>00110101B</code>. The instruction <code>COMF M, F</code> complements it: every bit is flipped. What does M hold now, in binary ($8$ bits)?</p>`, [b8(~0x35 & 255)], 'Every bit is flipped: 0 becomes 1 and 1 becomes 0.', { kind: 'bin', exact: true, hint: 'Flip each of the 8 bits.' }),
        D.asm('Keep the low nibble', R`<p>The register <code>NUM</code> holds a value read from a port. Only its four lowest bits matter (four switches, as in Activity 7). Store <code>NUM</code> masked with <code>00001111B</code> in <code>RESULT</code>. Copy NUM into W with <code>MOVF NUM, W</code>, mask it with <code>ANDLW</code>, and store W with <code>MOVWF</code>. The tests put other values in NUM.</p>`, {
          start: NUMRES,
          tests: [{ name: R`$\text{NUM} = 1010\,1001_{2}$`, init: { NUM: 0xA9 }, expect: { RESULT: 9 } }, { name: R`$\text{NUM} = 1111\,0111_{2}$`, init: { NUM: 0xF7 }, expect: { RESULT: 7 } }, { name: R`$\text{NUM} = 0101\,1100_{2}$`, init: { NUM: 0x5C }, expect: { RESULT: 12 } }],
          reqs: [{ re: /\bANDLW\b/i, msg: 'Use ANDLW with a mask.' }],
          solution: 'NUM    EQU 0x20\nRESULT EQU 0x21\n\n        MOVF    NUM, W        ; copy NUM into W\n        ANDLW   00001111B     ; keep bits 0 to 3\n        MOVWF   RESULT\n        GOTO    $\n'
        }, R`<code>ANDLW 00001111B</code> keeps bits $0$ to $3$ and clears bits $4$ to $7$.`, { hint: R`Three instructions: <code>MOVF NUM, W</code>, <code>ANDLW 00001111B</code>, <code>MOVWF RESULT</code>.` }),
        D.asm('Set, clear and toggle', R`<p>The register <code>NUM</code> holds any value. Using one mask instruction each time, calculate:</p>
<ul><li><code>SET_HI</code>: NUM with its four <b>highest</b> bits set to $1$ (the others unchanged),</li>
<li><code>CLR_B0</code>: NUM with bit $0$ (the lowest significant bit) cleared to $0$ (the others unchanged),</li>
<li><code>TOG_ALL</code>: NUM with <b>every</b> bit toggled.</li></ul>
<p>Start each calculation with <code>MOVF NUM, W</code>. The tests put other values in NUM.</p>`, {
          start: 'NUM     EQU 0x20\nSET_HI  EQU 0x21\nCLR_B0  EQU 0x22\nTOG_ALL EQU 0x23\n\n; write your instructions here\n\n        GOTO $\n',
          tests: [0x35, 0xA6, 0x00, 0xFF].map(v => ({ name: R`$\text{NUM} = ` + H.b8(v).slice(0, 4) + R`\,` + H.b8(v).slice(4) + R`_{2}$`, init: { NUM: v }, expect: { SET_HI: v | 0xF0, CLR_B0: v & 0xFE, TOG_ALL: (~v) & 255 } })),
          reqs: [{ re: /\bIORLW\b/i, msg: 'Use IORLW to set bits.' }, { re: /\bANDLW\b/i, msg: 'Use ANDLW to clear a bit.' }, { re: /\bXORLW\b/i, msg: 'Use XORLW to toggle bits.' }],
          solution: 'NUM     EQU 0x20\nSET_HI  EQU 0x21\nCLR_B0  EQU 0x22\nTOG_ALL EQU 0x23\n\n        MOVF    NUM, W\n        IORLW   11110000B     ; set bits 4 to 7\n        MOVWF   SET_HI\n        MOVF    NUM, W\n        ANDLW   11111110B     ; clear bit 0\n        MOVWF   CLR_B0\n        MOVF    NUM, W\n        XORLW   11111111B     ; toggle every bit\n        MOVWF   TOG_ALL\n        GOTO    $\n'
        }, R`OR with $1111\,0000_{2}$ sets the high nibble; AND with $1111\,1110_{2}$ clears only bit $0$; XOR with $1111\,1111_{2}$ flips every bit.`, { hint: [R`IORLW sets the bits where the mask has a $1$; ANDLW clears the bits where the mask has a $0$; XORLW toggles the bits where the mask has a $1$.`, R`The masks are <code>11110000B</code>, <code>11111110B</code> and <code>11111111B</code>.`] })
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
        D.T(R`<p>This is also how negative numbers are stored. In a <b>signed</b> byte, the values $128 \ldots 255$ represent $-128 \ldots -1$: the stored pattern of $-x$ is $256 - x$. The highest bit, b7, is then $1$ for every negative number and is called the <b>sign bit</b>. The processor does not know whether a byte is signed: the same $8$ bits can be read in two ways, and it is the program that decides.</p>`),
        D.TABLE(['Bits', 'Hexadecimal', 'Read as unsigned', 'Read as signed'], [
          ['<code>0000,1010</code>', '$0A_{16}$', '$10$', '$10$'],
          ['<code>0111,1111</code>', '$7F_{16}$', '$127$', '$127$'],
          ['<code>1000,0000</code>', '$80_{16}$', '$128$', '$128 - 256 = -128$'],
          ['<code>1111,0110</code>', '$F6_{16}$', '$246$', '$246 - 256 = -10$'],
          ['<code>1111,1111</code>', '$FF_{16}$', '$255$', '$255 - 256 = -1$']
        ], { small: true }),
        D.mc('No subtractor', 'How does the PIC perform a subtraction?', ['With a dedicated subtractor circuit', 'By adding the two\'s complement of the second number', 'It cannot subtract', 'By dividing'], 1, 'There is no real subtractor: the PIC adds the two\'s complement of Byte2 to Byte1.', { hint: 'The lecture calls the method the two\'s complement.' }),
        D.order('Subtraction steps', R`<p>Put the three steps of $\text{Byte1} - \text{Byte2}$ in the correct order.</p>`, ['Flip every bit of Byte2 (complement)', 'Add 1 to the result', 'Add Byte1 to the result of the previous step'], 'Complement Byte2, add 1, then add Byte1.', { hint: 'First you need the two\'s complement of Byte2.' }),
        D.multi('Adding two bytes', R`<p>Add <code>1010,0001</code> + <code>1101,1100</code> starting from the LSB. Give the $8$-bit result and the carry out of bit 7.</p>`, [{ label: 'Result byte:', ans: [b8((0xA1 + 0xDC) & 255)], kind: 'bin', exact: true, width: 11 }, { label: 'Carry:', ans: [1] }], R`$161 + 220 = 381 = 256 + 125$. The $8$ bits hold $125 = 0111\,1101_{2}$ and the carry is $1$.`, { hint: 'Anything above 255 produces a carry.' }),
        D.multi('Case Byte1 = Byte2', R`<p>Calculate $60 - 60$ with the two's complement. Byte2 flipped is $195$ and adding $1$ gives $196$.</p>`, [{ label: R`$60 + 196 =$`, ans: [256] }, { label: '8-bit value:', ans: [0] }, { label: 'Carry:', ans: [1] }], R`$60 + 196 = 256 = 1\,0000\,0000_{2}$: the $8$-bit value is $0$ and the carry is $1$.`, { hint: '256 needs 9 bits.' }),
        D.multi('Case Byte1 < Byte2', R`<p>Calculate $50 - 60$ with the two's complement ($60$ flipped is $195$, plus $1$ is $196$).</p>`, [{ label: R`$50 + 196 =$`, ans: [246] }, { label: 'Carry:', ans: [0] }, { label: R`Value represented ($246 - 256$):`, ans: [-10] }], R`$50 + 196 = 246$ with no carry, so the result is negative: $246 - 256 = -10$.`, { hint: 'The sum does not exceed 255.' }),
        D.mc('Carry after subtraction', R`<p>The PIC calculates $\text{Byte1} - \text{Byte2}$ with Byte1 $= 20$ and Byte2 $= 35$. What are the carry and the meaning of the $8$-bit result?</p>`, ['Carry = 1 and the result is positive', R`Carry = 0 and the result is negative: $241 - 256 = -15$`, 'Carry = 0 and the result is $0$', R`Carry = 1 and the result is $-15$`], 1, R`$20 < 35$, so the carry is $0$; the result is $20 + (256 - 35) = 241$, which represents $241 - 256 = -15$.`, { hint: R`Is $\text{Byte1} \geq \text{Byte2}$?` }),
        D.multi('Two\'s complement of H\'1F\'', R`<p>Calculate $128 - 1F_{16}$ with the two's complement. $1F_{16} = 0001\,1111_{2} = 31$.</p>`, [{ label: 'Flipped (decimal):', ans: [224] }, { label: 'After adding 1:', ans: [225] }, { label: R`8-bit result of $128 + 225$:`, ans: [97] }, { label: 'Carry:', ans: [1] }], R`$31$ flipped is $1110\,0000_{2} = 224$; $224 + 1 = 225$; $128 + 225 = 353 = 256 + 97$, so the result is $97$ with carry $1$.`, { hint: 'Flip 0001,1111 to get 1110,0000.' }),
        D.txt('The overflow bit', R`<p>Which bit of the $8$-bit STATUS register shows that the result of an arithmetic operation does not fit in $8$ bits? Write its name.</p>`, [/^(the )?carry( bit| flag)?$/i, /^c$/i, /^c bit$/i, /^c flag$/i], 'The Carry (C) flag receives the ninth bit.', { hint: 'It is the ninth bit that appears when 255 is exceeded.', solText: 'Carry (C)', solInput: 'Carry' }),
        D.num('Signed or unsigned', R`<p>A register holds <code>1110,1100</code>. Which negative number does it represent when it is read as a signed byte?</p>`, -20, R`$1110\,1100_{2} = 236$ and $236 - 256 = -20$.`, { hint: 'Convert to decimal, then subtract 256 because the sign bit is 1.' }),
        D.asm('Negate a number', R`<p>Store $-\text{NUM}$ in <code>RESULT</code>: the two's complement of NUM, calculated as in the lecture by complementing NUM and adding $1$. Use <code>COMF NUM, W</code> (it puts the complement of NUM in W and leaves NUM unchanged), then <code>ADDLW 1</code>, then <code>MOVWF RESULT</code>. The tests put other values in NUM.</p>`, {
          start: NUMRES,
          tests: [{ name: R`$\text{NUM} = 10$`, init: { NUM: 10 }, expect: { RESULT: 246 } }, { name: R`$\text{NUM} = 1$`, init: { NUM: 1 }, expect: { RESULT: 255 } }, { name: R`$\text{NUM} = 0$`, init: { NUM: 0 }, expect: { RESULT: 0 } }, { name: R`$\text{NUM} = 100$`, init: { NUM: 100 }, expect: { RESULT: 156 } }],
          solution: 'NUM    EQU 0x20\nRESULT EQU 0x21\n\n        COMF    NUM, W        ; W = NUM with every bit flipped\n        ADDLW   1             ; plus one: the two\'s complement\n        MOVWF   RESULT\n        GOTO    $\n'
        }, R`Flipping gives $255 - \text{NUM}$ and adding $1$ gives $256 - \text{NUM}$, the stored pattern of $-\text{NUM}$: $10$ becomes $246$, which reads as $-10$. For $\text{NUM} = 0$ the sum $255 + 1 = 256$ wraps to $0$, as it should.`, { hint: R`Three instructions: <code>COMF NUM, W</code>, <code>ADDLW 1</code>, <code>MOVWF RESULT</code>.` })
      ]
    }
  ]
});
})();
