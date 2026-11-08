/* Part 3 - First steps in assembly (Lectures 3 and 4, Lab 1 / Activity 1) */
(function () {
const EQ12 = 'REG1 EQU 0x20\nREG2 EQU 0x21';
const ASTART = '; write your instructions here\n\n    GOTO $        ; stop here\n';
D.part({
  title: 'First steps in assembly',
  intro: R`<p>Assembly language names the instructions that the processor really executes. In this part you meet the parts of the PIC16F887 that a programmer works with (the Flash memory, the RAM registers and the W register), the instructions that move and calculate data, and the structure of a complete assembly program. At the end you write Activity 1 of the lectures yourself.</p>`,
  sections: [
    {
      title: 'How the processor runs a program',
      objectives: ['You will know where the program and the data are stored', 'You will know the role of the W register and of the ALU', 'You will know what a register (a file) is'],
      blocks: [
        D.T(R`<p>To program a processor in assembly you have to know the places where it keeps the program and the data. The lecture describes the inside of the PIC16F887 as a workshop with a worker (the processor) who follows the instructions one by one. Five parts matter for programming:</p>`),
        D.TABLE(['Part', 'What it holds', 'Size on the PIC16F887'], [
          ['<b>Flash memory</b> (program memory)', 'The instructions of the program, one instruction in each location (a "drawer"). It is non-volatile: the program stays when the power is off.', R`$8192$ locations of $14$ bits ("8K words")`],
          ['<b>RAM</b> (data memory)', 'The variables, and the special registers that control the chip. It is volatile: the content is lost without power.', R`$512$ addresses of $8$ bits, of which $368$ are free for variables`],
          ['<b>W register</b> (working register)', 'The "table" on which the work is done: one operand of almost every operation and the place where results can go.', R`$8$ bits: $0 \ldots 255$`],
          ['<b>ALU</b>', 'The calculator: it adds, subtracts, ANDs, ORs, XORs. It cannot multiply or divide.', '—'],
          ['<b>EEPROM</b>', 'Data that must survive a power cut, written while the program runs.', R`$256$ bytes`]
        ]),
        D.T(R`<p>Each memory location of the RAM is called a <b>register</b> or a <b>file</b>, and it has an <b>address</b>. Some registers have a fixed job and a name given by Microchip: they are the <b>special function registers</b> (SFR), such as <code>PORTD</code> or <code>STATUS</code>. The others are free for your variables: the <b>general purpose registers</b> (GPR). In the first bank of the RAM the free registers start at address <code>0x20</code>.</p>
<p>The ALU works like an unusual calculator: the first value is always on the table (in W), the second comes from the instruction or from a register, and the result is placed back on the table or in the register. For example $3 + 4$ is done as: put $3$ in W, add $4$; the result $7$ is now in W and ready for the next operation.</p>`),
        D.KEY('Instructions run one after the other', R`<p>When the chip is powered up, the processor starts at address $0$ of the Flash memory (the <b>reset vector</b>). It executes the instruction stored there, then automatically moves to the next address, and so on. The address of the next instruction is kept in the <b>program counter</b> (PC). A jump instruction such as <code>GOTO</code> simply writes a new address into the PC.</p>`),
        D.match('Who does what?', 'Match each part of the processor with its role.', [['Flash memory', 'Keeps the instructions of the program (non-volatile)'], ['RAM', 'Keeps the variables while the program runs (volatile)'], ['W register', 'The working register: one operand and a place for results'], ['ALU', 'Performs the arithmetic and logic operations'], ['EEPROM', 'Keeps data written by the program after a power cut']], 'The program is in Flash, the data in RAM, the work happens in W and the ALU, and EEPROM keeps data that must survive a power cut.', { hint: 'Two memories keep their content without power; only one of them holds the program.' }),
        D.num('Largest value in W', R`<p>What is the largest value that the W register can hold?</p>`, 255, R`W has $8$ bits: $2^{8} - 1 = 255$.`, { hint: 'W is an 8-bit register.' }),
        D.mc('Where is the program?', 'The power of the board is switched off and on again. Which statement is true?', ['The program is still in the Flash memory, but the values in RAM are lost', 'The program is lost, the RAM values remain', 'Both are lost', 'Both remain'], 0, 'Flash is non-volatile and keeps the program; RAM is volatile.', { hint: 'Which memory is non-volatile?' }),
        D.multi('Flash memory size', R`<p>The Flash memory has $8192$ locations of $14$ bits. How many bits is that, and how many bytes ($8$ bits per byte)?</p>`, [{ label: 'Bits:', ans: [114688] }, { label: 'Bytes:', ans: [14336] }], R`$8192 \times 14 = 114688$ bits and $\frac{114688}{8} = 14336$ bytes, about $14$ kB.`, { hint: 'Multiply, then divide by 8.' }),
        D.mc('SFR and GPR', 'What is the difference between an SFR and a GPR?', ['An SFR has a fixed job and name (for example PORTD); a GPR is free for the program\'s variables', 'An SFR is in Flash, a GPR in RAM', 'An SFR holds 16 bits, a GPR 8 bits', 'There is no difference'], 0, 'Special function registers control the chip; general purpose registers are free for your data.', { hint: 'Special function / general purpose.' })
      ]
    },
    {
      title: 'Literal instructions and the W register',
      objectives: ['You will be able to use MOVLW, ADDLW, SUBLW, ANDLW, IORLW and XORLW', 'You will know that SUBLW calculates $k - W$', 'You will be able to follow the value of W through a program'],
      blocks: [
        D.T(R`<p>The assembly language of the PIC16F887 has only <b>35 instructions</b>. Each one is a short word (a <i>mnemonic</i>) followed by its operands. A <b>literal</b> is a constant number written inside the instruction itself; it is called <code>k</code> and must fit in $8$ bits ($0 \ldots 255$). The literal instructions work between the literal and W:</p>`),
        D.TABLE(['Instruction', 'Name', 'Operation'], [
          ['<code>MOVLW k</code>', 'Move literal to W', '$W \\leftarrow k$'],
          ['<code>ADDLW k</code>', 'Add literal and W', '$W \\leftarrow W + k$'],
          ['<code>SUBLW k</code>', 'Subtract W from literal', '$W \\leftarrow k - W$'],
          ['<code>ANDLW k</code>', 'AND literal with W', '$W \\leftarrow W \\text{ AND } k$'],
          ['<code>IORLW k</code>', 'Inclusive OR literal with W', '$W \\leftarrow W \\text{ OR } k$'],
          ['<code>XORLW k</code>', 'Exclusive OR literal with W', '$W \\leftarrow W \\text{ XOR } k$']
        ]),
        D.T(R`<p>The arrow $\leftarrow$ means "receives". Pay special attention to <code>SUBLW</code>: it subtracts W <i>from</i> the literal. To calculate $60 - 25$, first put $25$ in W, then <code>SUBLW 60</code>.</p>`),
        D.SIDE(R`unsigned char w;
w = 20;        // put 20 in w
w = w + 10;    // w is now 30
w = 50 - w;    // w is now 20`, R`MOVLW   20     ; W = 20
ADDLW   10     ; W = 30
SUBLW   50     ; W = 50 - 30 = 20
GOTO    $      ; stop here`, { cap: R`In assembly there is only one working register, W. The last line, <code>GOTO $</code>, jumps to itself forever: it is the usual way to stop a program that has nothing more to do.` }),
        D.T(R`<p>The exercises below run in the simulator of the PIC16F887. Press <b>Run</b> to see the registers at the end of your program, and <b>Test</b> to check it.</p>`),
        D.num('SUBLW order', R`<p>After <code>MOVLW 20</code> and then <code>SUBLW 30</code>, what is W?</p>`, 10, R`SUBLW subtracts W from the literal: $30 - 20 = 10$.`, { hint: R`The literal comes first: $k - W$.`, fb: [{ m: -10, msg: R`The result is $k - W$, not $W - k$.` }] }),
        D.fill('AND, OR and XOR with W', 'Old W = <code>0001,1110</code> and k = <code>1111,0000</code>. Write the new W (8 bits) for each instruction.', 'ANDLW  ->  {{00010000}}\nIORLW  ->  {{11111110}}\nXORLW  ->  {{11101110}}', 'AND keeps the common 1 bits, OR keeps the 1 bits of either number, XOR keeps the bits that differ.', { lang: 'text', hint: 'Compare the two bytes bit by bit: 0001 1110 and 1111 0000.' }),
        D.num('A negative result', R`<p>After <code>MOVLW 30</code> and then <code>SUBLW 20</code>, what is W as an $8$-bit value (decimal)?</p>`, 246, R`$20 - 30 = -10$, which the $8$-bit W holds as $256 - 10 = 246$. The carry is $0$ because $20 < 30$.`, { hint: R`Remember Part 2: a negative result is stored as $256 - x$.` }),
        D.mc('Which line is illegal?', 'One line of this program cannot be assembled. Which one?', ['Line 1', 'Line 2', 'Line 3'], 2, R`The literal must fit in $8$ bits. Line 2 is legal (the result exceeds $255$ and sets the carry) but $256$ in line 3 does not fit.`, { snippet: { text: 'MOVLW 200\nADDLW 100\nMOVLW 256', lang: 'asm', lines: true }, hint: 'What is the range of the literal k?' }),
        D.trace('Trace W', 'Follow the program and write the value of W after each instruction.', { code: 'MOVLW 15\nANDLW 12\nIORLW 64\nXORLW 255', watch: ['W'] }, R`ANDLW 12 keeps $0000\,1100_{2} = 12$; IORLW 64 adds bit 6: $76$; XORLW 255 flips all bits: $255 - 76 = 179$.`, { hint: R`Work in binary: $15 = 0000\,1111_{2}$, $12 = 0000\,1100_{2}$, $64 = 0100\,0000_{2}$.` }),
        D.asm('Add with literals', R`<p>Write a program that leaves <b>75</b> in the W register using only <code>MOVLW</code> and <code>ADDLW</code>, and then stops with <code>GOTO $</code>.</p>`, {
          start: ASTART, tests: [{ expect: { W: 75 } }], reqs: [{ re: /\bADDLW\b/i, msg: 'Use ADDLW.' }], solution: 'MOVLW 50\nADDLW 25\nGOTO $'
        }, R`MOVLW 50 puts $50$ in W and ADDLW 25 adds $25$: $W = 75$.`, { hint: R`For example $50 + 25$.` }),
        D.asm('60 minus 25', R`<p>Leave $60 - 25 = 35$ in W. Use <code>SUBLW</code>: remember that it calculates $k - W$, so put $25$ in W first.</p>`, {
          start: ASTART, tests: [{ expect: { W: 35 } }], reqs: [{ re: /\bSUBLW\b/i, msg: 'Use SUBLW.' }], solution: 'MOVLW 25\nSUBLW 60\nGOTO $'
        }, R`$W = 25$ first; then SUBLW 60 gives $60 - 25 = 35$.`, { hint: 'The literal of SUBLW is the number you subtract from.' }),
        D.asm('Mask with a literal', R`<p>Put the value <code>0x5A</code> in W, then keep only its lowest four bits with a mask (as in Activity 7), so that W ends up as <code>0x0A</code>.</p>`, {
          start: ASTART, tests: [{ expect: { W: 0x0A } }], reqs: [{ re: /\bANDLW\b/i, msg: 'Use ANDLW with a mask.' }, { re: /0x5A|5AH|01011010B|H'5A'/i, msg: 'Start by loading 0x5A into W.' }], solution: 'MOVLW 0x5A\nANDLW 0x0F\nGOTO $'
        }, R`$0101\,1010_{2} \text{ AND } 0000\,1111_{2} = 0000\,1010_{2} = 0A_{16}$.`, { hint: 'The mask has 1s where the bits are kept: 0x0F or 00001111B.' })
      ]
    },
    {
      title: 'File registers and the destination',
      objectives: ['You will be able to move values between W and the RAM registers', 'You will know what the destination W or F of an instruction means', 'You will be able to write Activity 1: adding two numbers stored in RAM'],
      blocks: [
        D.T(R`<p>Most instructions work with a register of the RAM, called <code>f</code> (for <i>file</i>). Before using a register, give its address a name with the directive <code>EQU</code>. The first free address of the RAM is <code>0x20</code>:</p>`),
        D.CODE(R`REGA  EQU 0x20       ; REGA is the register at address 0x20
REGB  EQU 0x21
REGC  EQU 0x22`, 'asm'),
        D.T(R`<p>Two instructions move data between W and a register:</p>`),
        D.TABLE(['Instruction', 'Operation', 'Example'], [
          ['<code>MOVWF f</code>', '$f \\leftarrow W$ (copy W into the register)', '<code>MOVWF REGA</code>'],
          ['<code>MOVF f, d</code>', 'copy the register into the destination', '<code>MOVF REGA, W</code>'],
          ['<code>CLRF f</code>', '$f \\leftarrow 0$', '<code>CLRF REGA</code>'],
          ['<code>CLRW</code>', '$W \\leftarrow 0$', '<code>CLRW</code>']
        ]),
        D.WARN('There is no MOVLF', R`<p>A literal cannot go directly from the program into a RAM register: the PIC16 has no instruction such as <code>MOVLF 25, REGA</code>. Use W as a temporary place: <code>MOVLW 25</code> and then <code>MOVWF REGA</code>.</p>`),
        D.H('The destination bit'),
        D.T(R`<p>Many instructions read a register, calculate something and must store the result somewhere. The second operand <code>d</code> (the <b>destination</b>) chooses the place: <code>W</code> puts the result in the W register, <code>F</code> puts it back into the register f. The other one is not changed.</p>`),
        D.TABLE(['Instruction', 'Operation'], [
          ['<code>ADDWF f, d</code>', '$d \\leftarrow f + W$'],
          ['<code>SUBWF f, d</code>', '$d \\leftarrow f - W$'],
          ['<code>ANDWF f, d</code>, <code>IORWF f, d</code>, <code>XORWF f, d</code>', '$d \\leftarrow f \\text{ AND / OR / XOR } W$'],
          ['<code>INCF f, d</code>', '$d \\leftarrow f + 1$'],
          ['<code>DECF f, d</code>', '$d \\leftarrow f - 1$'],
          ['<code>COMF f, d</code>', '$d \\leftarrow$ the complement of $f$ (every bit flipped)'],
          ['<code>SWAPF f, d</code>', '$d \\leftarrow f$ with its two nibbles exchanged (the lecture writes <code>SWAP</code>)']
        ]),
        D.EX('The destination W or F', 'REG1  EQU 0x20\n\n    MOVLW  20\n    MOVWF  REG1      ; REG1 = 20\n    MOVLW  10        ; W = 10\n    ADDWF  REG1, F   ; REG1 = 30, W = 10\n    ADDWF  REG1, W   ; W = 40, REG1 = 30\n    GOTO   $', 'asm', [
          ['ADDWF REG1, F', R`$f + W = 30$ goes back into the <b>file</b>: REG1 becomes $30$, W stays $10$`],
          ['ADDWF REG1, W', R`$f + W = 40$ goes into <b>W</b>: W becomes $40$, REG1 stays $30$`]], 'F keeps the result in the register; W puts it in the working register.'),
        D.H('Activity 1: adding two numbers'),
        D.T(R`<p>The first lab activity calculates $\text{REGC} = \text{REGA} + \text{REGB}$ with $\text{REGA} = 25$ and $\text{REGB} = 30$. In C it is one line; in assembly every step goes through W:</p>`),
        D.SIDE(R`unsigned char rega, regb, regc;

rega = 25;
regb = 30;
regc = rega + regb;`, R`MOVLW   25       ; move literal 25 to W
MOVWF   REGA     ; REGA = 25
MOVLW   30
MOVWF   REGB     ; REGB = 30
MOVF    REGA, W  ; W = REGA
ADDWF   REGB, W  ; W = REGB + W = 55
MOVWF   REGC     ; REGC = 55
GOTO    $        ; do nothing`, { cap: 'Activity 1 in C and in assembly. The assembly version uses the registers declared above with EQU.' }),
        D.mc('The destination d', 'What does the destination <code>d</code> of an instruction like <code>ADDWF REG1, d</code> select?', ['Where the result is stored: in W or back in the register', 'Which bit of REG1 is added', 'The address of REG1', 'The next instruction'], 0, 'd is W or F: it chooses where the result goes.', { hint: 'd stands for destination.' }),
        D.trace('ADDWF with F', R`<p>REG1 $= 10$ and W $= 20$ at the start. Follow <code>ADDWF REG1, F</code>.</p>`, { pre: EQ12, code: 'ADDWF REG1, F', watch: ['W', 'REG1'], init: { REG1: 10, W: 20 } }, R`With destination F the sum $f + W = 30$ is stored in REG1; W stays $20$.`, { hint: 'The result is stored where d says: F is the file.', note: R`Start: REG1 $= 10$ and W $= 20$.` }),
        D.trace('SUBWF', R`<p>REG1 $= 50$ and W $= 20$ at the start. Follow <code>SUBWF REG1, F</code>. Remember $d \leftarrow f - W$.</p>`, { pre: EQ12, code: 'SUBWF REG1, F', watch: ['W', 'REG1'], init: { REG1: 50, W: 20 } }, R`SUBWF calculates $f - W = 50 - 20 = 30$ and stores it in REG1.`, { hint: R`The file comes first: $50 - 20$.`, note: R`Start: REG1 $= 50$ and W $= 20$.` }),
        D.num('COMF', R`<p>Calculate <code>COMF</code> of $127$: flip every bit of $127 = 0111\,1111_{2}$. Give the decimal result.</p>`, 128, R`$0111\,1111_{2}$ flipped is $1000\,0000_{2} = 128$.`, { hint: 'Flip each bit: 0 becomes 1 and 1 becomes 0.' }),
        D.num('Swap a hex byte', R`<p>What is the result of swapping the nibbles of <code>H'AB'</code>? (hexadecimal)</p>`, ['BA'], 'The nibbles A and B change places: BA.', { kind: 'hex', hint: 'A is the high nibble and B the low nibble.' }),
        D.num('Swap a binary byte', R`<p>What is the result of swapping the nibbles of <code>B'11010001'</code>?</p>`, ['00011101'], R`The high nibble $1101$ and the low nibble $0001$ change places: $0001\,1101_{2}$.`, { kind: 'bin', exact: true, hint: 'Split it into two nibbles: 1101 and 0001.' }),
        D.multi('DECF with destination W', R`<p>REG1 $= 128$. After <code>DECF REG1, W</code>, what are REG1 and W?</p>`, [{ label: 'REG1 =', ans: [128] }, { label: 'W =', ans: [127] }], R`DECF puts $f - 1 = 127$ in the destination W; REG1 itself is not changed.`, { hint: 'Where does the result go when d is W?' }),
        D.multi('COMF with destination W', R`<p>REG1 $= 13_{16}$ and W $= C2_{16}$. After <code>COMF REG1, 0</code> (d $= 0$ means W), give both values in hexadecimal.</p>`, [{ label: 'REG1 =', ans: ['13'], kind: 'hex' }, { label: 'W =', ans: ['EC'], kind: 'hex' }], R`$13_{16} = 0001\,0011_{2}$ flipped is $1110\,1100_{2} = EC_{16}$. The result goes to W, so REG1 stays $13_{16}$.`, { hint: 'd = 0 is W and d = 1 is F.' }),
        D.trace('Trace with REG1', 'Follow the program. Write W and REG1 after every instruction.', { pre: EQ12, code: 'MOVLW 20\nMOVWF REG1\nINCF REG1, F\nDECF REG1, W\nCOMF REG1, F', watch: ['W', 'REG1'] }, R`REG1 $= 20$, then $21$ (INCF, F), then $W = 20$ (DECF into W), then COMF flips $21 = 0001\,0101_{2}$ into $1110\,1010_{2} = 234$.`, { hint: R`DECF REG1, W writes into W without changing REG1. $21$ flipped is $255 - 21$.` }),
        D.asm('Store a literal in RAM', R`<p>Put the value $100$ in the register REG1 (already declared at address <code>0x20</code>).</p>`, {
          pre: 'REG1 EQU 0x20', start: ASTART, tests: [{ expect: { REG1: 100 } }], solution: 'MOVLW 100\nMOVWF REG1\nGOTO $'
        }, 'There is no instruction that moves a literal into RAM directly: put it in W with MOVLW, then copy W with MOVWF.', { hint: 'Two instructions: first MOVLW, then MOVWF.' }),
        D.asm('Fix the program', R`<p>This program tries to put $25$ in REGA, but it does not assemble. Fix it. Read the message of the assembler when you press Run.</p>`, {
          pre: 'REGA EQU 0x20', start: 'MOVLF 25, REGA\nGOTO $', tests: [{ expect: { REGA: 25 } }], solution: 'MOVLW 25\nMOVWF REGA\nGOTO $'
        }, 'There is no MOVLF: a literal cannot go straight to RAM. W is the temporary place.', { hint: 'W is the temporary place for values.' }),
        D.asm('Activity 1', R`<p>Write the program of Activity 1: put $25$ in REGA and $30$ in REGB, then calculate $\text{REGC} = \text{REGA} + \text{REGB}$. The registers are declared for you.</p>`, {
          pre: 'REGA EQU 0x20\nREGB EQU 0x21\nREGC EQU 0x22', start: ASTART, tests: [{ expect: { REGA: 25, REGB: 30, REGC: 55 } }], reqs: [{ re: /\bADDWF\b/i, msg: 'Add the two registers with ADDWF.' }], solution: 'MOVLW 25\nMOVWF REGA\nMOVLW 30\nMOVWF REGB\nMOVF REGA, W\nADDWF REGB, W\nMOVWF REGC\nGOTO $'
        }, 'Load each value through W, then MOVF REGA, W and ADDWF REGB, W leave the sum in W, and MOVWF REGC stores it.', { hint: [R`Store the values with MOVLW and MOVWF.`, R`Then <code>MOVF REGA, W</code>, <code>ADDWF REGB, W</code> and <code>MOVWF REGC</code>.`] }),
        D.asm('Subtract two registers', R`<p>REGA holds $90$ and REGB holds $35$ (the first two lines are given). Calculate $\text{REGC} = \text{REGA} - \text{REGB}$ with <code>SUBWF</code>. Remember that <code>SUBWF f, d</code> calculates $f - W$.</p>`, {
          pre: 'REGA EQU 0x20\nREGB EQU 0x21\nREGC EQU 0x22', start: 'MOVLW 90\nMOVWF REGA\nMOVLW 35\nMOVWF REGB\n; calculate REGC = REGA - REGB\n\nGOTO $\n', tests: [{ expect: { REGC: 55, REGA: 90, REGB: 35, C: 1 } }], reqs: [{ re: /\bSUBWF\b/i, msg: 'Use SUBWF.' }], solution: 'MOVLW 90\nMOVWF REGA\nMOVLW 35\nMOVWF REGB\nMOVF REGB, W\nSUBWF REGA, W\nMOVWF REGC\nGOTO $'
        }, R`Put REGB in W, then <code>SUBWF REGA, W</code> gives $90 - 35 = 55$ in W (carry $1$ because there is no borrow).`, { hint: [R`The value that is subtracted (REGB) must be in W: <code>MOVF REGB, W</code>.`, R`Then <code>SUBWF REGA, W</code> and <code>MOVWF REGC</code>.`] }),
        D.asm('Swap the nibbles', R`<p>REGA holds <code>0x3C</code>. Put its nibble-swapped value in REGB, without changing REGA. Use <code>SWAPF REGA, W</code> and then store W.</p>`, {
          pre: 'REGA EQU 0x20\nREGB EQU 0x21', start: 'MOVLW 0x3C\nMOVWF REGA\n\nGOTO $\n', tests: [{ expect: { REGA: 0x3C, REGB: 0xC3 } }], solution: 'MOVLW 0x3C\nMOVWF REGA\nSWAPF REGA, W\nMOVWF REGB\nGOTO $'
        }, 'SWAPF with destination W leaves REGA unchanged and puts 0xC3 in W; MOVWF copies it into REGB.', { hint: 'Use d = W so that REGA is not modified.' }),
        D.asm('Sum of three', R`<p>Three registers are already loaded: REGA $= 12$, REGB $= 34$ and REGC $= 56$. Store their sum in REGD.</p>`, {
          pre: 'REGA EQU 0x20\nREGB EQU 0x21\nREGC EQU 0x22\nREGD EQU 0x23', start: ASTART, tests: [{ init: { REGA: 12, REGB: 34, REGC: 56 }, expect: { REGD: 102 } }, { name: 'Other values', init: { REGA: 100, REGB: 1, REGC: 7 }, expect: { REGD: 108 } }], solution: 'MOVF REGA, W\nADDWF REGB, W\nADDWF REGC, W\nMOVWF REGD\nGOTO $'
        }, 'Keep the running sum in W: MOVF REGA, W then ADDWF REGB, W and ADDWF REGC, W, and finally MOVWF REGD.', { hint: 'After the first addition the sum is in W; just add the next register to it.' })
      ]
    },
    {
      title: 'Anatomy of an assembly program',
      objectives: ['You will know the elements of an assembly line: label, instruction, operands, comment', 'You will know the main directives (EQU, ORG, #define, #include, CONFIG)', 'You will know the order of the parts of a complete program'],
      blocks: [
        D.T(R`<p>A complete assembly program contains more than instructions. Every line can have up to four elements:</p>`),
        D.CODE(R`REPEAT:  MOVLW   25     ; load the first value
; ^label  ^instr  ^operand  ^comment`, 'asm'),
        D.TABLE(['Element', 'Rules'], [
          ['<b>Label</b>', 'A name for the address of a line, so that the program can jump to it (<code>GOTO REPEAT</code>). In the pic-as assembler a label ends with a colon <code>:</code>.'],
          ['<b>Instruction</b>', 'One of the 35 mnemonics, such as <code>MOVLW</code> or <code>GOTO</code>. The case does not matter.'],
          ['<b>Operands</b>', 'Registers (<code>PORTD</code>), variables (<code>REGA</code>) or constants: decimal (<code>23</code>, <code>23D</code>), hexadecimal (<code>0x17</code>, <code>17H</code>), binary (<code>00010111B</code>) or an ASCII character (<code>\'A\'</code>).'],
          ['<b>Comment</b>', 'Everything after a semicolon <code>;</code>. The assembler ignores it.'],
          ['<b>Directive</b>', 'An order for the assembler rather than for the processor. It produces no instruction.']
        ]),
        D.T(R`<p>The directives you will use most:</p>`),
        D.TABLE(['Directive', 'Meaning'], [
          ['<code>#include &lt;xc.inc&gt;</code>', 'Reads the file with the names of all registers and bits of the chip (PORTD, STATUS, RP0...).'],
          ['<code>CONFIG FOSC = INTRC_NOCLKOUT</code>', 'Sets a configuration bit: the clock source, the watchdog timer, code protection... (you meet them in Part 6).'],
          ['<code>REGA EQU 0x20</code>', 'Gives the name REGA to the number <code>0x20</code>.'],
          ['<code>#define LED RD0</code>', 'Replaces the word LED by RD0 everywhere in the program.'],
          ['<code>ORG 0</code>', 'Places the following instructions from address 0 of the Flash memory.'],
          ['<code>PSECT ...</code>', 'Defines the program section; the pic-as assembler requires this line.']
        ]),
        D.H('Activity 1 as a complete file'),
        D.T(R`<p>This is the full source of Activity 1 as it is typed in MPLAB X. The simulator of this course accepts the same file (it ignores the CONFIG and PSECT lines):</p>`),
        D.CODE(R`; Activity 1
; This code will do the summation of two numbers
; PIC used is the PIC16F887

    #include <xc.inc>

; CONFIG1
  CONFIG  FOSC = INTRC_NOCLKOUT ; internal oscillator
  CONFIG  WDTE = OFF            ; watchdog timer disabled
  CONFIG  MCLRE = OFF           ; RE3/MCLR pin is a digital input
  CONFIG  LVP = OFF             ; low voltage programming disabled

REGA  EQU 0X020
REGB  EQU 0X021
REGC  EQU 0x022

PSECT BLABLA,CLASS=CODE, DELTA=2,ABS

    ORG     0       ; start at the reset vector

    MOVLW   25      ; move literal 25 to W
    MOVWF   REGA    ; move the content of W to REGA
    MOVLW   30
    MOVWF   REGB
    MOVF    REGA, W ; move the content of REGA to W
    ADDWF   REGB, W ; add it to REGB (the result is in W)
    MOVWF   REGC    ; then move W to REGC

    GOTO    $       ; do nothing`, 'asm'),
        D.T(R`<p>The dollar sign <code>$</code> means "the address of this instruction", so <code>GOTO $</code> jumps to itself forever. In the same way <code>GOTO $-1</code> jumps one instruction back. A program must never "fall off" the end of the code: after the last instruction, the processor would continue into the empty part of the Flash memory.</p>`),
        D.INFO('Building and debugging in MPLAB X (Lab 1)', R`<p>In MPLAB X you create a <i>standalone project</i> for the PIC16F887 with the pic-as assembler, add an assembly file and paste the code. <b>Build</b> (F11) translates it; the message BUILD SUCCESSFUL means that the <code>.hex</code> file (the machine code) has been created. With the <b>simulator</b> as debug tool you can execute the program one instruction at a time (<i>Step over</i>) and watch REGA, REGB and REGC change from $0$ to $25$, $30$ and $55$. The <b>Program Memory</b> window shows each instruction at its address; the unused locations contain <code>ADDLW 0xFF</code>, whose code is $11\,1111\,1111\,1111_{2}$: the empty Flash is all ones.</p>`),
        D.match('Elements of a line', 'Match each part of the line <code>LOOP:  DECFSZ  COUNT, F  ; count down</code> with its element.', [['LOOP:', 'Label'], ['DECFSZ', 'Instruction'], ['COUNT, F', 'Operands'], ['; count down', 'Comment']], 'Label, instruction, operands and comment, in this order.', { hint: 'The label ends with a colon; the comment starts with a semicolon.' }),
        D.mc('Directive or instruction?', 'Which of these is a directive, not an instruction?', ['<code>ORG 0</code>', '<code>MOVLW 0</code>', '<code>GOTO $</code>', '<code>CLRF REGA</code>'], 0, 'ORG tells the assembler where to place the code; it is not executed by the processor.', { hint: 'Which one produces no machine code?' }),
        D.mc('Number formats', 'Which operand is NOT the number 23?', ['<code>23</code>', '<code>0x17</code>', '<code>00010111B</code>', '<code>23H</code>'], 3, R`<code>23H</code> is hexadecimal: $2 \times 16 + 3 = 35$. The others are all $23$.`, { hint: 'The letter H after a number means hexadecimal.' }),
        D.num('Where does GOTO $-1 go?', R`<p>The instruction <code>GOTO $-1</code> is at address $15$ of the Flash memory. To which address does it jump?</p>`, 14, R`<code>$</code> is the address of the instruction itself, $15$, so $15 - 1 = 14$.`, { hint: 'The dollar sign is the current address.' }),
        D.asm('Labels and GOTO', R`<p>Complete the program: after the label <code>START</code>, load $7$ into W and store it in REG1, then jump to the label <code>FINISH</code> with <code>GOTO</code>. The instructions between are skipped. At <code>FINISH</code> the program stops.</p>`, {
          pre: 'REG1 EQU 0x20\nREG2 EQU 0x21', start: 'START:\n    ; load 7 into REG1 and jump to FINISH\n\n    MOVLW 99\n    MOVWF REG2      ; must be skipped\nFINISH:\n    GOTO $\n', tests: [{ expect: { REG1: 7, REG2: 0 } }], reqs: [{ re: /GOTO\s+FINISH/i, msg: 'Jump with GOTO FINISH.' }], solution: 'START:\n    MOVLW 7\n    MOVWF REG1\n    GOTO FINISH\n    MOVLW 99\n    MOVWF REG2\nFINISH:\n    GOTO $\n'
        }, 'GOTO FINISH writes the address of FINISH into the program counter, so the two instructions in between never execute.', { hint: 'Insert MOVLW 7, MOVWF REG1 and GOTO FINISH before MOVLW 99.' })
      ]
    },
{
      title: 'Challenge: rotate by one hexadecimal digit',
      objectives: ['You will combine SWAPF, masks and IORWF to move digits between two registers'],
      blocks: [
        D.T(R`<p>A 16-bit number is stored in two registers, HI and LO, as four hexadecimal digits: $1234_{16}$ is HI $= 12_{16}$ and LO $= 34_{16}$. <b>Rotating</b> it by one digit to the left moves every digit one place left and brings the first digit round to the end: $1234_{16}$ becomes $2341_{16}$. Each new byte is made of one digit of HI and one digit of LO, so you must take the nibbles apart and put them back together.</p>`),
        D.asm('Rotate by one hexadecimal digit', R`<p>Rotate the 16-bit number HI:LO by one hexadecimal digit to the left, as described above, and leave the result in HI:LO. TMPH and TMPL are free for intermediate results. Use <code>SWAPF</code>, <code>ANDLW</code>, <code>IORWF</code>, <code>MOVF</code> and <code>MOVWF</code>.</p>`, {
          start: 'HI   EQU 0x20\nLO   EQU 0x21\nTMPH EQU 0x22\nTMPL EQU 0x23\n\n; write your instructions here\n\n    GOTO $\n',
          tests: [0x1234, 0xABCD, 0x00FF, 0xF00F, 0x5A3C].map(v => { const r = ((v << 4) | (v >> 12)) & 0xFFFF; const hx = (x) => x.toString(16).toUpperCase().padStart(4, '0'); return { name: R`$` + hx(v) + R`_{16} \to ` + hx(r) + R`_{16}$`, init: { HI: v >> 8, LO: v & 255 }, expect: { HI: r >> 8, LO: r & 255 } }; }),
          reqs: [{ re: /\bSWAPF\b/i, msg: 'Use SWAPF to move the nibbles.' }],
          solution: 'HI   EQU 0x20\nLO   EQU 0x21\nTMPH EQU 0x22\nTMPL EQU 0x23\n\n    SWAPF HI, W       ; 12 -> 21\n    ANDLW 0xF0        ; 20: the 2nd digit, now high\n    MOVWF TMPH\n    SWAPF LO, W       ; 34 -> 43\n    ANDLW 0x0F        ; 03: the 3rd digit, now low\n    IORWF TMPH, F     ; TMPH = 23\n    SWAPF LO, W       ; 43\n    ANDLW 0xF0        ; 40: the 4th digit, now high\n    MOVWF TMPL\n    SWAPF HI, W       ; 21\n    ANDLW 0x0F        ; 01: the 1st digit, now low\n    IORWF TMPL, W     ; 41\n    MOVWF LO\n    MOVF  TMPH, W\n    MOVWF HI          ; HI:LO = 2341\n    GOTO $\n'
        }, R`For $1234_{16}$ the new high byte is the 2nd and 3rd digits ($23_{16}$) and the new low byte the 4th and 1st digits ($41_{16}$). <code>SWAPF</code> moves a digit to the other half of the byte, <code>ANDLW</code> keeps only the wanted half, and <code>IORWF</code> joins two halves. Build both new bytes in TMPH and TMPL before you overwrite HI and LO.`, { challenge: true, hint: [R`Write the four digits $1, 2, 3, 4$: the new HI is $23$ and the new LO is $41$.`, R`The new HI is (HI with its nibbles swapped, AND $F0_{16}$) OR (LO with its nibbles swapped, AND $0F_{16}$). Build it in TMPH; then build the new LO in the same way.`] })
      ]
    }
  ]
});
})();
