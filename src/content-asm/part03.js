/* Part 3 - The instruction set (Lecture 4: the 35 instructions, their flags, cycles and machine code) */
(function () {
const ASTART = '; write your instructions here\n\n    GOTO $\n';
const EQ12 = 'REG1 EQU 0x20\nREG2 EQU 0x21';
/* 14-bit machine code of an instruction: answers are computed here, never typed by hand */
const BYTE_OPS = { ADDWF: 7, ANDWF: 5, COMF: 9, DECF: 3, DECFSZ: 11, INCF: 10, INCFSZ: 15, IORWF: 4, MOVF: 8, RLF: 13, RRF: 12, SUBWF: 2, SWAPF: 14, XORWF: 6 };
const BIT_OPS = { BCF: 0, BSF: 1, BTFSC: 2, BTFSS: 3 };
const LIT_OPS = { MOVLW: 0x3000, RETLW: 0x3400, IORLW: 0x3800, ANDLW: 0x3900, XORLW: 0x3A00, SUBLW: 0x3C00, ADDLW: 0x3E00 };
const enc = {
  byte: (op, f, d) => (BYTE_OPS[op] << 8) | (d << 7) | (f & 0x7F),
  bit: (op, f, b) => 0x1000 | (BIT_OPS[op] << 10) | (b << 7) | (f & 0x7F),
  lit: (op, k) => LIT_OPS[op] | (k & 0xFF),
  jump: (op, k) => (op === 'CALL' ? 0x2000 : 0x2800) | (k & 0x7FF)
};
const bin14 = n => n.toString(2).padStart(14, '0');
const hex4 = n => n.toString(16).toUpperCase().padStart(4, '0');
const grp = s => s.slice(0, 2) + '\\,' + s.slice(2, 6) + '\\,' + s.slice(6, 10) + '\\,' + s.slice(10);
const SKIP = '$1$ ($2$ when it skips)';
const BYTE_SET = [
  ['ADDWF f, d', 'Add W and f', '$1$', 'C, DC, Z'], ['ANDWF f, d', 'AND W with f', '$1$', 'Z'], ['CLRF f', 'Clear f', '$1$', 'Z'], ['CLRW', 'Clear W', '$1$', 'Z'],
  ['COMF f, d', 'Complement f', '$1$', 'Z'], ['DECF f, d', 'Decrement f', '$1$', 'Z'], ['DECFSZ f, d', 'Decrement f, skip if 0', SKIP, '—'], ['INCF f, d', 'Increment f', '$1$', 'Z'],
  ['INCFSZ f, d', 'Increment f, skip if 0', SKIP, '—'], ['IORWF f, d', 'Inclusive OR W with f', '$1$', 'Z'], ['MOVF f, d', 'Move f', '$1$', 'Z'], ['MOVWF f', 'Move W to f', '$1$', '—'],
  ['NOP', 'No operation', '$1$', '—'], ['RLF f, d', 'Rotate left f through carry', '$1$', 'C'], ['RRF f, d', 'Rotate right f through carry', '$1$', 'C'], ['SUBWF f, d', 'Subtract W from f', '$1$', 'C, DC, Z'],
  ['SWAPF f, d', 'Swap the nibbles of f', '$1$', '—'], ['XORWF f, d', 'Exclusive OR W with f', '$1$', 'Z']];
const BIT_SET = [['BCF f, b', 'Bit clear f', '$1$', '—'], ['BSF f, b', 'Bit set f', '$1$', '—'], ['BTFSC f, b', 'Bit test f, skip if clear', SKIP, '—'], ['BTFSS f, b', 'Bit test f, skip if set', SKIP, '—']];
const LIT_SET = [
  ['ADDLW k', 'Add literal and W', '$1$', 'C, DC, Z'], ['ANDLW k', 'AND literal with W', '$1$', 'Z'], ['CALL k', 'Call subroutine', '$2$', '—'], ['CLRWDT', 'Clear the watchdog timer', '$1$', 'TO, PD'],
  ['GOTO k', 'Go to address', '$2$', '—'], ['IORLW k', 'Inclusive OR literal with W', '$1$', 'Z'], ['MOVLW k', 'Move literal to W', '$1$', '—'], ['RETFIE', 'Return from interrupt', '$2$', '—'],
  ['RETLW k', 'Return with literal in W', '$2$', '—'], ['RETURN', 'Return from subroutine', '$2$', '—'], ['SLEEP', 'Go into standby mode', '$1$', 'TO, PD'], ['SUBLW k', 'Subtract W from literal', '$1$', 'C, DC, Z'],
  ['XORLW k', 'Exclusive OR literal with W', '$1$', 'Z']];
const rows = set => set.map(r => ['<code>' + r[0] + '</code>', r[1], r[2], r[3]]);
const HEAD = ['Instruction', 'Description', 'Cycles', 'Flags changed'];

D.part({
  title: 'The instruction set',
  intro: R`<p>The PIC16F887 has only $35$ instructions. In this part you meet all of them in one place: their operands, what each one does to the flags Z, C and DC, how many cycles it takes and how it is coded in the Flash memory. Exams often show a few lines of code and ask for W, a register and the flags after each line; the exercises of this part train exactly that.</p>`,
  sections: [
    {
      title: 'The 35 instructions at a glance',
      objectives: ['You will know the three groups of instructions and the meaning of the operands f, d, b and k', 'You will know which instructions take two cycles', 'You will be able to find the 14-bit machine code of an instruction'],
      blocks: [
        D.T(R`<p>Every instruction is one word of the Flash memory, $14$ bits long. The datasheet sorts them into three groups. Their operands are always one of four kinds:</p>`),
        D.TABLE(['Operand', 'Meaning', 'Size in the code'], [
          ['<code>f</code>', 'the address of a register (a <i>file</i>) in the RAM', '$7$ bits'],
          ['<code>d</code>', 'the destination of the result: <code>W</code> ($d = 0$) or the register itself, <code>F</code> ($d = 1$)', '$1$ bit'],
          ['<code>b</code>', 'the number of a bit inside the register, $0$ to $7$', '$3$ bits'],
          ['<code>k</code>', 'a literal: a constant written in the instruction ($8$ bits), or an address for <code>CALL</code> and <code>GOTO</code> ($11$ bits)', '$8$ or $11$ bits']
        ]),
        D.H('Byte-oriented operations'),
        D.T(R`<p>These instructions work on a whole register f, and most of them also use W.</p>`),
        D.TABLE(HEAD, rows(BYTE_SET), { small: true }),
        D.H('Bit-oriented operations'),
        D.TABLE(HEAD, rows(BIT_SET), { small: true }),
        D.H('Literal and control operations'),
        D.TABLE(HEAD, rows(LIT_SET), { small: true, cap: R`TO and PD are two STATUS bits used by the watchdog timer and the sleep mode; this course does not use them.` }),
        D.KEY('Cycles in one sentence', R`<p>Every instruction takes $1$ instruction cycle, except those that change the program counter: <code>GOTO</code>, <code>CALL</code>, <code>RETURN</code>, <code>RETLW</code> and <code>RETFIE</code> always take $2$, and the four skip instructions take $2$ when they skip. Part 5 turns this rule into exact delays.</p>`),
        D.H('Machine code'),
        D.T(R`<p>The assembler translates each line into its $14$-bit code. The first bits tell the group, and the operands fill the remaining bits:</p>`),
        D.TABLE(['Group', 'Format of the 14 bits', 'Example'], [
          ['byte-oriented', R`$00\,oooo\,dfff\,ffff$`, R`<code>ADDWF 0x20, F</code> $= 00\,0111\,1010\,0000_{2} = 07A0_{16}$`],
          ['bit-oriented', R`$01\,oobb\,bfff\,ffff$`, R`<code>BSF 0x03, 5</code> $= 01\,0110\,1000\,0011_{2} = 1683_{16}$`],
          ['literal', R`$11\,oooo\,kkkk\,kkkk$`, R`<code>MOVLW 0x3F</code> $= 11\,0000\,0011\,1111_{2} = 303F_{16}$`],
          ['CALL and GOTO', R`$10\,okkk\,kkkk\,kkkk$`, R`<code>GOTO 0x005</code> $= 10\,1000\,0000\,0101_{2} = 2805_{16}$`]
        ], { cap: R`o are the bits of the operation code. For example <code>BTFSS</code> is $01\,11bb\,bfff\,ffff$ and <code>MOVLW</code> is $11\,00xx\,kkkk\,kkkk$ (the bits x may be $0$ or $1$).` }),
        D.num('How many instructions?', R`<p>How many assembly instructions are used to program the PIC16F887?</p>`, 35, R`The PIC16F887 is a RISC processor with $35$ instructions: $18$ byte-oriented, $4$ bit-oriented and $13$ literal and control instructions.`, { hint: 'Count the rows of the three tables.' }),
        D.mc('The L of MOVLW', R`<p>In the instruction <code>MOVLW</code>, what is L?</p>`, ['A literal: a constant number written in the instruction', 'A label', 'The low byte of W', 'A register of the RAM'], 0, R`MOVLW means <i>move literal to W</i>: the number written after the instruction, such as $25$ in <code>MOVLW 25</code>.`, { hint: 'The letter k in the table stands for the same thing.' }),
        D.tf('Move or copy?', R`<p>True or false: after <code>MOVWF REG1</code> the value has left W, which is now empty.</p>`, false, R`The "move" instructions <b>copy</b>: after <code>MOVWF REG1</code> both W and REG1 hold the value.`, { hint: 'Does W change when it is copied into a register?' }),
        D.match('Operand letters', 'Match each operand letter with its meaning.', [['f', 'The address of a register in RAM'], ['d', 'The destination: W or the register'], ['b', 'The number of a bit, 0 to 7'], ['k', 'A constant written in the instruction']], 'f is a file register, d a destination, b a bit number and k a literal.', { hint: 'd for destination, b for bit.' }),
        D.mc('Two-cycle instructions', 'Which instructions ALWAYS take two instruction cycles?', ['<code>GOTO</code>, <code>CALL</code>, <code>RETURN</code>, <code>RETLW</code> and <code>RETFIE</code>', '<code>ADDWF</code> and <code>SUBWF</code>', '<code>BTFSS</code> and <code>BTFSC</code>', 'Every instruction with a literal'], 0, 'The instructions that load a new address into the program counter take two cycles. The skips take two cycles only when they skip.', { hint: 'Which instructions change the program counter?' }),
        D.multi('Machine code', R`<p>The instruction <code>BTFSS f, b</code> is coded as $01\,11bb\,bfff\,ffff$ ($3$ bits for the bit number b, $7$ for the address f). Write the $14$-bit code of <code>BTFSS 0x3A, 5</code> in binary and in hexadecimal.</p>`, [{ label: 'Binary (14 bits):', ans: ['01111010111010'], kind: 'bin', exact: true, width: 13 }, { label: 'Hexadecimal:', ans: ['1EBA'], kind: 'hex' }], R`$b = 5 = 101_{2}$ and $f = 3A_{16} = 011\,1010_{2}$: $01\,11\,101\,0111010 = 01\,1110\,1011\,1010_{2} = 1EBA_{16}$.`, { hint: [R`Write $5$ with $3$ bits and $3A_{16}$ with $7$ bits.`, R`Group the $14$ bits in nibbles from the right to get the hexadecimal digits.`] }),
        D.multi('Encode two instructions', R`<p>Using the formats above, write the $14$-bit codes in hexadecimal.</p>`, [{ label: '<code>MOVLW 0xA5</code>:', ans: [hex4(enc.lit('MOVLW', 0xA5))], kind: 'hex' }, { label: '<code>GOTO 0x012</code>:', ans: [hex4(enc.jump('GOTO', 0x12))], kind: 'hex' }], R`<code>MOVLW</code> is $11\,0000$ followed by the literal: $30A5_{16}$. <code>GOTO</code> is $10\,1$ followed by the $11$-bit address: $10\,1000\,0001\,0010_{2} = 2812_{16}$.`, { hint: R`MOVLW: $3000_{16}$ plus the literal. GOTO: $2800_{16}$ plus the address.` }),
        D.multi('Encode DECF', R`<p>Write the code of <code>DECF 0x21, W</code> in binary ($14$ bits) and in hexadecimal. The operation bits of DECF are $0011$.</p>`, [{ label: 'Binary:', ans: [bin14(enc.byte('DECF', 0x21, 0))], kind: 'bin', exact: true, width: 13 }, { label: 'Hex:', ans: [hex4(enc.byte('DECF', 0x21, 0))], kind: 'hex' }], R`$00$, then $0011$, then $d = 0$ for W, then $f = 21_{16} = 010\,0001_{2}$: $` + grp(bin14(enc.byte('DECF', 0x21, 0))) + R`_{2} = ` + hex4(enc.byte('DECF', 0x21, 0)) + R`_{16}$.`, { hint: R`$00\,0011\,dfff\,ffff$ with $d = 0$ and $f$ written with $7$ bits.` }),
        D.mc('Decode', R`<p>Which instruction is coded as $` + hex4(enc.bit('BSF', 3, 5)) + R`_{16}$?</p>`, ['<code>BSF 0x03, 5</code> (set bit 5 of STATUS)', '<code>BCF 0x03, 5</code>', '<code>BTFSS 0x03, 5</code>', '<code>MOVLW 0x83</code>'], 0, R`$` + grp(bin14(enc.bit('BSF', 3, 5))) + R`_{2}$: $01$ is a bit operation, $01$ is BSF, $b = 101_{2} = 5$ and $f = 000\,0011_{2} = 3$, the address of STATUS. It selects bank $1$ (Part 7).`, { hint: R`Write the code in binary and split it as $01\,oo\,bbb\,fffffff$.` }),
        D.mc('The empty Flash', R`<p>An empty location of the Flash memory contains all ones: $11\,1111\,1111\,1111_{2} = 3FFF_{16}$. Which instruction is that?</p>`, ['<code>ADDLW 0xFF</code>', '<code>NOP</code>', '<code>GOTO 0x7FF</code>', '<code>RETURN</code>'], 0, R`$11\,111x$ is ADDLW, and the literal is $FF_{16}$. That is why MPLAB X shows <code>ADDLW 0xFF</code> in the unused part of the program memory.`, { hint: 'The code starts with 11: it is a literal instruction.' })
      ]
    },
    {
      title: 'Moving data and the Z flag',
      objectives: ['You will know exactly which moving instructions change Z', 'You will be able to test a register for zero with MOVF', 'You will be able to exchange the contents of two registers'],
      blocks: [
        D.T(R`<p>Six instructions only move data. They look alike, but they do not treat the Z flag (zero) the same way:</p>`),
        D.TABLE(['Instruction', 'Operation', 'Z'], [
          ['<code>MOVLW k</code>', R`$W \leftarrow k$`, 'not changed'],
          ['<code>MOVWF f</code>', R`$f \leftarrow W$`, 'not changed'],
          ['<code>MOVF f, d</code>', R`$d \leftarrow f$`, R`$1$ if the value moved is $0$`],
          ['<code>CLRF f</code>', R`$f \leftarrow 0$`, R`always $1$`],
          ['<code>CLRW</code>', R`$W \leftarrow 0$`, R`always $1$`],
          ['<code>SWAPF f, d</code>', R`$d \leftarrow$ f with its nibbles exchanged`, 'not changed'],
          ['<code>NOP</code>', 'nothing (one cycle passes)', 'not changed']
        ]),
        D.T(R`<p>A surprising but very common line is <code>MOVF f, F</code>: it copies the register onto itself, so nothing changes, except the Z flag. It is the standard way to ask "is this register zero?" without touching W:</p>`),
        D.CODE(R`        MOVF    COUNT, F    ; COUNT unchanged, Z = 1 if COUNT is 0
        BTFSC   STATUS, 2   ; Z = 0? skip the next line (Part 4)
        GOTO    IS_ZERO`, 'asm'),
        D.T(R`<p>To <b>exchange</b> two registers you need a third one, exactly as you need an empty glass to exchange the contents of two glasses: copy A to TEMP, B to A, and TEMP to B. Each copy goes through W.</p>`),
        D.trace('Moves and Z', R`<p>Follow W and the Z flag. Watch which instructions change Z and which do not.</p>`, { pre: EQ12, code: 'MOVLW 0\nMOVWF REG1\nMOVF REG1, F\nMOVLW 5\nMOVWF REG2\nMOVF REG2, W\nCLRW', watch: ['W', 'Z'] }, R`<code>MOVLW 0</code> puts $0$ in W but does not touch Z. <code>MOVF REG1, F</code> moves a $0$, so Z becomes $1$, and <code>MOVLW 5</code> and <code>MOVWF</code> leave it at $1$. <code>MOVF REG2, W</code> moves $5$: Z $= 0$. <code>CLRW</code> always sets Z.`, { hint: 'Only MOVF, CLRF and CLRW change Z among the moving instructions.' }),
        D.mc('Test for zero', R`<p>Which single instruction tells whether REG1 is $0$ (through the Z flag) without changing REG1 or W?</p>`, ['<code>MOVF REG1, F</code>', '<code>MOVF REG1, W</code>', '<code>MOVWF REG1</code>', '<code>CLRF REG1</code>'], 0, R`<code>MOVF REG1, F</code> copies REG1 onto itself and sets Z. <code>MOVF REG1, W</code> would also set Z, but it changes W.`, { hint: 'The destination F writes the value back where it came from.' }),
        D.num('SWAPF in the lecture', R`<p>REG1 $= F3_{16}$. What is REG1 after <code>SWAPF REG1, 1</code>? (hexadecimal)</p>`, ['3F'], R`$d = 1$ means F: the nibbles $F$ and $3$ change places in REG1 itself, giving $3F_{16}$.`, { kind: 'hex', hint: 'd = 1 is the register; exchange the two hexadecimal digits.' }),
        D.num('Swap a decimal value', R`<p>What is the result of swapping the nibbles of <code>D'127'</code>? Give it in decimal.</p>`, 247, R`$127 = 0111\,1111_{2}$; swapped: $1111\,0111_{2} = 247$.`, { hint: 'Convert 127 to binary first.' }),
        D.asm('Exchange two registers', R`<p>Exchange the contents of the registers A and B, using TEMP as the third "glass". The tests put different values in A and B.</p>`, {
          start: 'A    EQU 0x20\nB    EQU 0x21\nTEMP EQU 0x22\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [{ name: R`$\text{A} = 12$, $\text{B} = 34$`, init: { A: 12, B: 34 }, expect: { A: 34, B: 12 } }, { name: R`$\text{A} = 255$, $\text{B} = 0$`, init: { A: 255, B: 0 }, expect: { A: 0, B: 255 } }],
          solution: 'A    EQU 0x20\nB    EQU 0x21\nTEMP EQU 0x22\n\n    MOVF  A, W\n    MOVWF TEMP      ; TEMP = A\n    MOVF  B, W\n    MOVWF A         ; A = B\n    MOVF  TEMP, W\n    MOVWF B         ; B = old A\n    GOTO $\n'
        }, 'Three copies, each through W: A to TEMP, B to A, TEMP to B.', { hint: [R`Copy A into TEMP first: <code>MOVF A, W</code> and <code>MOVWF TEMP</code>.`, R`Then copy B into A, and TEMP into B, in the same way.`] }),
        D.asm('Exchange with XOR', R`<p>A classic puzzle: exchange A and B <b>without a third register</b>, using only W and the XOR instructions. With $\oplus$ for XOR, the three steps are $B \leftarrow A \oplus B$, $A \leftarrow A \oplus B$ and $B \leftarrow A \oplus B$ (each step uses the new values). Use <code>MOVF</code> and <code>XORWF</code>.</p>`, {
          start: 'A    EQU 0x20\nB    EQU 0x21\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [{ name: R`$\text{A} = 12$, $\text{B} = 34$`, init: { A: 12, B: 34 }, expect: { A: 34, B: 12 } }, { name: R`$\text{A} = 170$, $\text{B} = 85$`, init: { A: 170, B: 85 }, expect: { A: 85, B: 170 } }],
          reqs: [{ re: /\bXORWF\b/i, msg: 'Use XORWF.' }],
          forbid: [{ re: /\b(?:MOVWF|CLRF)\s+(?!A\b|B\b)\w+/i, msg: 'Only A and B may be written: no third register.' }],
          solution: 'A    EQU 0x20\nB    EQU 0x21\n\n    MOVF  A, W\n    XORWF B, F      ; B = A xor B\n    MOVF  B, W\n    XORWF A, F      ; A = A xor (A xor B) = old B\n    MOVF  A, W\n    XORWF B, F      ; B = (A xor B) xor old B = old A\n    GOTO $\n'
        }, R`$A \oplus A = 0$ and $x \oplus 0 = x$, so $A \oplus (A \oplus B) = B$: each value is recovered from the XOR of both.`, { hint: R`Step 1: <code>MOVF A, W</code> and <code>XORWF B, F</code>. Step 2 does the same with A and B exchanged.` })
      ]
    },
    {
      title: 'Arithmetic and the STATUS flags',
      objectives: ['You will know the flags Z, C and DC of the STATUS register', 'You will know which instructions change which flags', 'You will be able to predict W, the registers and the flags after an arithmetic instruction'],
      blocks: [
        D.T(R`<p>The processor has no instruction that compares two numbers and jumps. Instead, after many operations the ALU records facts about the result in three bits of the <b>STATUS</b> register, called <b>flags</b>:</p>`),
        D.TABLE(['Flag', 'Bit of STATUS', 'Set to 1 when'], [
          ['<b>Z</b> (zero)', '2', 'the result of the operation is zero'],
          ['<b>C</b> (carry)', '0', R`an addition produces a ninth bit (the result exceeded $255$), or a subtraction does <i>not</i> need a borrow (the first number was $\geq$ the second)`],
          ['<b>DC</b> (digit carry)', '1', 'a carry passed from bit 3 to bit 4 (from the low nibble to the high nibble)']
        ]),
        D.T(R`<p>Not every instruction changes every flag. <code>ADDLW</code>, <code>ADDWF</code>, <code>SUBLW</code> and <code>SUBWF</code> change Z, C and DC. The logic instructions (<code>ANDLW</code>, <code>IORWF</code>, <code>XORLW</code>...), <code>MOVF</code>, <code>INCF</code>, <code>DECF</code>, <code>COMF</code>, <code>CLRF</code> and <code>CLRW</code> change only Z. <code>RLF</code> and <code>RRF</code> change only C. <code>MOVLW</code>, <code>MOVWF</code>, <code>SWAPF</code> and the bit and jump instructions change no flag at all.</p>`),
        D.WARN('INCF and DECF do not touch the carry', R`<p>Incrementing $255$ gives $0$ and decrementing $0$ gives $255$, but <code>INCF</code> and <code>DECF</code> change only Z: C keeps its old value. To detect that a counter wrapped around, test Z after <code>INCF</code> (the result became $0$).</p>`),
        D.H('DC, the digit carry'),
        D.T(R`<p>DC works like C, but for the low nibble: after an addition it is $1$ when the sum of the two low nibbles exceeds $15$. For example $3A_{16} + 06_{16}$: $A + 6 = 16$, so a carry passes from bit 3 to bit 4 and DC $= 1$; the result is $40_{16}$. DC is used for decimal (BCD) arithmetic. After a subtraction, as for C, DC $= 1$ means "no borrow" from the high nibble.</p>`),
        D.H('The subtraction rules again'),
        D.T(R`<p>For <code>SUBWF f, d</code> ($f - W$) and <code>SUBLW k</code> ($k - W$), as in Part 1:</p>
$$C = 1 \iff \text{no borrow (the result is } \geq 0\text{)}, \qquad C = 0 \iff \text{borrow (the result is negative)}.$$
<p>A useful consequence: <code>SUBLW 0</code> calculates $0 - W$, the two's complement of W, so it <b>negates</b> W in one instruction.</p>`),
        D.mc('Which flag?', 'Which flag tells you that the result of the last operation was zero?', ['Z', 'C', 'DC', 'RP0'], 0, 'Z is the zero flag (bit 2 of STATUS).', { hint: 'Z for zero.' }),
        D.trace('Flags after additions', 'Follow the program and write W, Z and C after each instruction.', { code: 'MOVLW 200\nADDLW 56\nADDLW 10\nMOVLW 0', watch: ['W', 'Z', 'C'] }, R`$200 + 56 = 256$: W $= 0$, Z $= 1$, C $= 1$. Then $0 + 10 = 10$: Z $= 0$, C $= 0$. MOVLW changes no flag, so Z and C stay $0$ even though W becomes $0$.`, { hint: 'MOVLW does not change any flag.' }),
        D.trace('Compare with XORLW', R`<p>REG1 $= 9$. Follow the program and write W and Z after each instruction.</p>`, { pre: 'REG1 EQU 0x20', code: 'MOVF REG1, W\nXORLW 9\nMOVF REG1, W\nXORLW 7', watch: ['W', 'Z'], init: { REG1: 9 } }, R`$9 \text{ XOR } 9 = 0$ sets Z; $9 \text{ XOR } 7 = 0000\,1110_{2} = 14$ clears Z.`, { hint: 'XOR of two equal values is zero.', note: R`Start: REG1 $= 9$.` }),
        D.multi('SUBWF and the carry', R`<p>REG1 $= 40$ and W $= 55$. After <code>SUBWF REG1, W</code>, what are W, Z and C?</p>`, [{ label: 'W =', ans: [241] }, { label: 'Z =', ans: [0] }, { label: 'C =', ans: [0] }], R`$40 - 55 = -15$, stored as $256 - 15 = 241$. The result is not zero and $40 < 55$, so $C = 0$.`, { hint: R`Is $f \geq W$?` }),
        D.mc('Which instruction keeps the flags?', 'Which instruction never changes the Z flag?', ['<code>MOVWF</code>', '<code>MOVF</code>', '<code>INCF</code>', '<code>ANDLW</code>'], 0, 'MOVWF only copies W into a register; MOVF, INCF and ANDLW set Z according to their result.', { hint: 'Moving W into a register does not involve the ALU.' }),
        D.trace('INCF and DECF keep C', R`<p>Follow W, REG1, Z and C. Notice which instructions change C.</p>`, { pre: 'REG1 EQU 0x20', code: 'MOVLW 255\nMOVWF REG1\nINCF REG1, F\nDECF REG1, F\nADDLW 1', watch: ['W', 'REG1', 'Z', 'C'] }, R`<code>INCF</code> turns $255$ into $0$ and sets Z, but C stays $0$. <code>DECF</code> turns $0$ into $255$: Z $= 0$, C still $0$. <code>ADDLW 1</code> adds $255 + 1 = 256$: W $= 0$, Z $= 1$ and C $= 1$.`, { hint: 'INCF and DECF change only Z; ADDLW changes Z, C and DC.' }),
        D.multi('Digit carry', R`<p>W $= 3A_{16}$. After <code>ADDLW 0x06</code>, what are W (hexadecimal), DC and C?</p>`, [{ label: 'W =', ans: ['40'], kind: 'hex' }, { label: 'DC =', ans: [1] }, { label: 'C =', ans: [0] }], R`$3A_{16} + 06_{16} = 40_{16}$. The low nibbles give $A + 6 = 16$, which carries into bit 4: DC $= 1$. The result is below $256$: C $= 0$.`, { hint: R`Add the low nibbles first: $A_{16} + 6 = 10 + 6$.` }),
        D.mc('INCFSZ in the lecture', R`<p>REG1 $= 128$ and W $= 7$. What is W after <code>INCFSZ REG1, F</code>?</p>`, [R`W is still $7$: the result goes to REG1, which becomes $129$, and nothing is skipped`, R`W $= 129$`, R`W $= 0$ and the next instruction is skipped`, R`W $= 128$`], 0, R`The destination is F, so only REG1 changes ($128 + 1 = 129$). The skip happens only when the result is $0$.`, { hint: 'Where does d = F put the result?' }),
        D.multi('One line, all the effects', R`<p>REG1 $= 9C_{16}$, W $= 64_{16}$ and C $= 0$. After <code>ADDWF REG1, W</code>, give every result.</p>`, [{ label: 'W (hex) =', ans: ['00', '0'], kind: 'hex' }, { label: 'REG1 (hex) =', ans: ['9C'], kind: 'hex' }, { label: 'Z =', ans: [1] }, { label: 'C =', ans: [1] }, { label: 'DC =', ans: [1] }], R`$9C_{16} + 64_{16} = 100_{16}$: W keeps the low byte $00$, so Z $= 1$, and the ninth bit gives C $= 1$. The low nibbles $C + 4 = 16$ also carry: DC $= 1$. The destination is W, so REG1 does not change.`, { hint: R`$9C_{16} = 156$ and $64_{16} = 100$.` }),
        D.multi('SUBLW with flags', R`<p>W $= 25_{16}$. After <code>SUBLW 0x20</code>, give W in decimal and the flags.</p>`, [{ label: 'W =', ans: [251] }, { label: 'Z =', ans: [0] }, { label: 'C =', ans: [0] }, { label: 'DC =', ans: [0] }], R`$k - W = 20_{16} - 25_{16} = -5$, stored as $256 - 5 = 251$. The result is negative, so there is a borrow: C $= 0$. The low nibbles $0 - 5$ also borrow: DC $= 0$.`, { hint: 'SUBLW calculates k minus W. A borrow gives C = 0.' }),
        D.asm('A plus B minus C', R`<p>Calculate $\text{RESULT} = \text{A} + \text{B} - \text{C1}$ (the tests keep the result between $0$ and $255$). Remember that <code>SUBWF f, d</code> calculates $f - W$, so the number that is subtracted must be in W.</p>`, {
          start: 'A      EQU 0x20\nB      EQU 0x21\nC1     EQU 0x22\nRESULT EQU 0x23\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [{ name: R`$20 + 30 - 15$`, init: { A: 20, B: 30, C1: 15 }, expect: { RESULT: 35, A: 20, B: 30, C1: 15 } }, { name: R`$200 + 50 - 100$`, init: { A: 200, B: 50, C1: 100 }, expect: { RESULT: 150 } }, { name: R`$5 + 0 - 5$`, init: { A: 5, B: 0, C1: 5 }, expect: { RESULT: 0 } }],
          solution: 'A      EQU 0x20\nB      EQU 0x21\nC1     EQU 0x22\nRESULT EQU 0x23\n\n    MOVF  A, W\n    ADDWF B, W        ; W = A + B\n    MOVWF RESULT\n    MOVF  C1, W\n    SUBWF RESULT, F   ; RESULT = RESULT - C1\n    GOTO $\n'
        }, R`First store $A + B$ in RESULT. Then put C1 in W and <code>SUBWF RESULT, F</code> calculates $\text{RESULT} - W$ in place. A, B and C1 keep their values.`, { hint: [R`Calculate $A + B$ with <code>MOVF A, W</code> and <code>ADDWF B, W</code>, and store it in RESULT.`, R`Then <code>MOVF C1, W</code> and <code>SUBWF RESULT, F</code>.`] })
      ]
    },
    {
      title: 'Logic instructions and rotations',
      objectives: ['You will be able to combine two registers with AND, OR and XOR', 'You will be able to rotate a register through the carry', 'You will be able to multiply and divide by two with RLF and RRF'],
      blocks: [
        D.T(R`<p>Part 1 used the literal versions <code>ANDLW</code>, <code>IORLW</code> and <code>XORLW</code>. The register versions <code>ANDWF f, d</code>, <code>IORWF f, d</code> and <code>XORWF f, d</code> combine W with a register, and the destination chooses where the result goes. <code>COMF f, d</code> flips every bit. All of them change only Z.</p>`),
        D.T(R`<p>For example, to toggle in LEDS exactly the bits that are $1$ in the register MASK:</p>`),
        D.CODE(R`        MOVF    MASK, W
        XORWF   LEDS, F     ; LEDS = LEDS xor MASK`, 'asm'),
        D.H('Rotations through the carry'),
        D.T(R`<p><code>RLF f, d</code> (rotate left through carry) shifts every bit one place to the left: bit 7 goes into C and the old C comes into bit 0. <code>RRF f, d</code> does the same to the right: bit 0 goes into C and C comes into bit 7. The carry is like a ninth bit of the register.</p>`),
        D.TABLE(['Before', 'Instruction', 'After'], [
          [R`f $= 1000\,0101_{2}$, C $= 0$`, '<code>RLF f, F</code>', R`f $= 0000\,1010_{2}$, C $= 1$`],
          [R`f $= 1000\,0101_{2}$, C $= 0$`, '<code>RRF f, F</code>', R`f $= 0100\,0010_{2}$, C $= 1$`],
          [R`f $= 0000\,0011_{2}$, C $= 1$`, '<code>RRF f, F</code>', R`f $= 1000\,0001_{2}$, C $= 1$`]
        ]),
        D.KEY('Multiply and divide by two', R`<p>With C $= 0$ first (<code>BCF STATUS, 0</code>), <code>RLF</code> multiplies an unsigned byte by $2$ and <code>RRF</code> divides it by $2$; the bit that falls out is in C. Forgetting to clear C is a classic bug: the old carry walks into the result.</p>`),
        D.num('IORLW in the lecture', R`<p>W $= 1111\,0000_{2}$. What is W after <code>IORLW 00001111B</code>? (binary, $8$ bits)</p>`, ['11111111'], R`OR keeps every $1$ of both bytes: $1111\,0000 \text{ OR } 0000\,1111 = 1111\,1111_{2}$.`, { kind: 'bin', exact: true, hint: 'A bit of the result is 1 if it is 1 in either byte.' }),
        D.trace('Rotate left', R`<p>REG1 $= 1000\,0101_{2} = 133$ and C $= 0$. Follow the program and write REG1 and C after each instruction.</p>`, { pre: 'REG1 EQU 0x20', code: 'RLF REG1, F\nRLF REG1, F\nRRF REG1, F', watch: ['REG1', 'C'], init: { REG1: 133, C: 0 } }, R`$1000\,0101_{2}$ rotated left gives $0000\,1010_{2} = 10$ with C $= 1$; again: $0001\,0101_{2} = 21$ with C $= 0$; rotated right: $0000\,1010_{2} = 10$ with C $= 1$.`, { hint: 'Bit 7 goes into C, and C comes into bit 0.', note: R`Start: REG1 $= 1000\,0101_{2}$ and C $= 0$.` }),
        D.asm('Multiply by 4', R`<p>Multiply the register X by $4$ with two left rotations (the result is at most $255$). Clear the carry before each rotation so that a $0$ comes into bit 0.</p>`, {
          pre: 'X EQU 0x20', start: ASTART,
          tests: [{ name: R`$X = 13$`, init: { X: 13, C: 1 }, expect: { X: 52 } }, { name: R`$X = 60$`, init: { X: 60, C: 1 }, expect: { X: 240 } }],
          reqs: [{ re: /\bRLF\b/i, msg: 'Use RLF.' }],
          solution: '    BCF STATUS, 0\n    RLF X, F\n    BCF STATUS, 0\n    RLF X, F\n    GOTO $'
        }, R`Each left shift multiplies by $2$: $X \times 2 \times 2 = 4X$. Clearing C makes the new bit 0 a zero.`, { hint: 'BCF STATUS, 0 then RLF X, F, twice.' }),
        D.asm('Halve a number', R`<p>Divide the register X by $2$ with one right rotation (rounding down). The tests start with C $= 1$, so clear the carry first.</p>`, {
          start: 'X EQU 0x20\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [{ name: R`$X = 100$`, init: { X: 100, C: 1 }, expect: { X: 50 } }, { name: R`$X = 255$`, init: { X: 255, C: 1 }, expect: { X: 127 } }, { name: R`$X = 1$`, init: { X: 1, C: 1 }, expect: { X: 0 } }],
          reqs: [{ re: /\bRRF\b/i, msg: 'Use RRF.' }],
          solution: 'X EQU 0x20\n\n    BCF STATUS, 0     ; C = 0\n    RRF X, F          ; X = X / 2\n    GOTO $\n'
        }, R`With C $= 0$ a zero comes into bit 7, so <code>RRF</code> divides by $2$; bit 0, the remainder, goes into C.`, { hint: R`<code>BCF STATUS, 0</code>, then <code>RRF X, F</code>.` }),
        D.asm('Catch the carry', R`<p>Add A and B into SUM ($8$ bits) and store the carry of that addition ($0$ or $1$) in COUT. Trick: clear COUT, then after the addition <code>RLF COUT, F</code> rotates the carry flag into bit 0 of COUT.</p>`, {
          start: 'A     EQU 0x20\nB     EQU 0x21\nSUM   EQU 0x22\nCOUT  EQU 0x23\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [{ name: R`$200 + 100$`, init: { A: 200, B: 100, COUT: 9 }, expect: { SUM: 44, COUT: 1 } }, { name: R`$20 + 30$`, init: { A: 20, B: 30, COUT: 9 }, expect: { SUM: 50, COUT: 0 } }, { name: R`$255 + 1$`, init: { A: 255, B: 1, COUT: 9 }, expect: { SUM: 0, COUT: 1 } }],
          reqs: [{ re: /\bRLF\b/i, msg: 'Use RLF to bring the carry into COUT.' }],
          solution: 'A     EQU 0x20\nB     EQU 0x21\nSUM   EQU 0x22\nCOUT  EQU 0x23\n\n    CLRF  COUT\n    MOVF  A, W\n    ADDWF B, W        ; W = A + B, C = carry\n    MOVWF SUM         ; MOVWF keeps C\n    RLF   COUT, F     ; COUT = 0000 000C\n    GOTO $\n'
        }, R`Clear COUT before the addition: between the addition and <code>RLF</code> only instructions that keep C may run. <code>MOVWF</code> changes no flag, so C survives until <code>RLF</code> shifts it into bit 0 of COUT.`, { hint: [R`Order: <code>CLRF COUT</code>, the addition, <code>MOVWF SUM</code>, then <code>RLF COUT, F</code>.`, R`<code>RLF</code> moves C into bit 0: with COUT $= 0$ the result is exactly C.`] }),
        D.asm('Toggle with a mask register', R`<p>Toggle in LEDS the bits that are $1$ in MASK, as in the example above. The tests use several values.</p>`, {
          start: 'LEDS EQU 0x20\nMASK EQU 0x21\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [{ name: R`$\text{LEDS} = 0000\,1111_{2}$, $\text{MASK} = 0011\,1100_{2}$`, init: { LEDS: 0x0F, MASK: 0x3C }, expect: { LEDS: 0x33, MASK: 0x3C } }, { name: R`$\text{LEDS} = 1010\,1010_{2}$, $\text{MASK} = 1111\,1111_{2}$`, init: { LEDS: 0xAA, MASK: 0xFF }, expect: { LEDS: 0x55 } }],
          reqs: [{ re: /\bXORWF\b/i, msg: 'Use XORWF.' }],
          solution: 'LEDS EQU 0x20\nMASK EQU 0x21\n\n    MOVF  MASK, W\n    XORWF LEDS, F\n    GOTO $\n'
        }, 'XOR with 1 inverts a bit and XOR with 0 keeps it; the destination F writes the result back into LEDS.', { hint: R`<code>MOVF MASK, W</code> and <code>XORWF LEDS, F</code>.` })
      ]
    },
    {
      title: 'Tracing practice',
      objectives: ['You will be able to follow W, a register and the flags through a mixed sequence of instructions', 'You will be able to answer exam questions on single instructions quickly'],
      blocks: [
        D.T(R`<p>This section is pure practice. For each exercise, take a sheet of paper and write a table with one row per instruction and one column per register or flag, exactly as an exam asks. Then type your answers. Three rules solve most questions:</p>
<ul>
<li>the <b>destination</b> decides what changes: with <code>W</code> the register keeps its value, with <code>F</code> W keeps its value;</li>
<li>look up which <b>flags</b> the instruction changes; all other flags keep their old values;</li>
<li>work in <b>binary</b> for the logic instructions, swaps and rotations.</li>
</ul>`),
        D.trace('Exam trace: moves and logic', R`<p>Follow W, REG1 and Z.</p>`, { pre: 'REG1 EQU 0x20', code: 'MOVLW 0x0F\nMOVWF REG1\nADDWF REG1, F\nSWAPF REG1, W\nANDLW 0xF0\nXORWF REG1, W', watch: ['W', 'REG1', 'Z'] }, R`REG1 becomes $15$, then $15 + 15 = 30 = 1E_{16}$. <code>SWAPF REG1, W</code> gives $E1_{16} = 225$ in W; <code>ANDLW 0xF0</code> keeps $E0_{16} = 224$; XOR with $1E_{16}$ gives $FE_{16} = 254$. No result is zero, so Z stays $0$.`, { hint: 'Write REG1 in hexadecimal: 0x1E. SWAPF exchanges the two hexadecimal digits.' }),
        D.trace('Exam trace: subtractions', R`<p>Follow W, REG1, Z and C. Remember: C $= 0$ means a borrow.</p>`, { pre: 'REG1 EQU 0x20', code: 'MOVLW 30\nMOVWF REG1\nMOVLW 40\nSUBWF REG1, W\nSUBLW 0\nSUBWF REG1, F', watch: ['W', 'REG1', 'Z', 'C'] }, R`$30 - 40 = -10$ is stored as $246$ with C $= 0$. <code>SUBLW 0</code> calculates $0 - 246$, which is $10$ after wrapping, with C $= 0$ again: it negated W. Finally $30 - 10 = 20$ goes into REG1 with C $= 1$.`, { hint: 'SUBWF is f minus W; SUBLW is k minus W. A negative result x is stored as 256 + x.' }),
        D.trace('Exam trace: rotations', R`<p>REG1 $= 1011\,0011_{2} = 179$ and C $= 1$ at the start. Follow W, REG1 and C.</p>`, { pre: 'REG1 EQU 0x20', init: { REG1: 179, C: 1 }, code: 'RRF REG1, F\nRRF REG1, W\nRLF REG1, F\nCOMF REG1, W\nINCF REG1, F', watch: ['W', 'REG1', 'C'] }, R`<code>RRF</code> brings C $= 1$ into bit 7: $1101\,1001_{2} = 217$, C $=$ old bit 0 $= 1$. <code>RRF REG1, W</code> puts $1110\,1100_{2} = 236$ in W. <code>RLF</code> rotates REG1 back to $179$ with C $= 1$. <code>COMF</code> gives $255 - 179 = 76$ in W, and <code>INCF</code> makes REG1 $180$ without touching C.`, { hint: 'Write REG1 in binary and move the bits one place; the carry is the ninth bit.', note: R`Start: REG1 $= 1011\,0011_{2}$ and C $= 1$.` }),
        D.multi('Four questions from the lecture', R`<p>Answer each question separately (decimal values).</p><ol><li>REG1 $= 128$: what is REG1 after <code>DECF REG1, W</code>?</li><li>REG1 $= 128$: what is W after <code>DECF REG1, W</code>?</li><li>What is <code>COMF</code> of $127$?</li><li>What is $127$ with its nibbles swapped?</li></ol>`, [{ label: '1.', ans: [128] }, { label: '2.', ans: [127] }, { label: '3.', ans: [128] }, { label: '4.', ans: [247] }], R`1 and 2: the result $127$ goes to W and REG1 stays $128$. 3: $0111\,1111_{2}$ flipped is $1000\,0000_{2} = 128$. 4: $1111\,0111_{2} = 247$.`, { hint: 'Destination W leaves the register unchanged.' }),
        D.mc('Which program leaves 0 in REG1?', R`<p>REG1 holds $5$ at the start. Which program leaves $0$ in REG1?</p>`, ['<code>MOVF REG1, W</code> then <code>SUBWF REG1, F</code>', '<code>MOVF REG1, F</code>', '<code>MOVLW 0</code>', '<code>DECF REG1, W</code> five times'], 0, R`<code>MOVF REG1, W</code> puts $5$ in W and <code>SUBWF REG1, F</code> stores $5 - 5 = 0$ in REG1 (setting Z and C). <code>MOVF REG1, F</code> does not change REG1, <code>MOVLW</code> does not touch REG1, and <code>DECF REG1, W</code> writes into W each time.`, { hint: 'Check where each result is written.' })
      ]
    }
  ]
});
})();
