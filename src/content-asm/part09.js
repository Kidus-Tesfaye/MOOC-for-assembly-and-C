/* Part 9 - Tables, pointers and strings (indirect addressing with FSR and INDF, blocks of RAM, ASCII strings) */
(function () {
const ASTART = '; write your code here\n\n    GOTO $\n';
const block = (base, vals) => { const o = {}; vals.forEach((v, i) => { o['RAM[0x' + (base + i).toString(16) + ']'] = v; }); return o; };
const str = (base, s) => block(base, Array.from(s).map(c => c.charCodeAt(0)).concat([0]));
D.part({
  title: 'Tables, pointers and strings',
  intro: R`<p>Until now every instruction named its register directly. To work through a list of values, such as a buffer of received characters or a series of measurements, the program needs a <b>pointer</b>: a register that holds the address of another register. In this part you use the pointer of the PIC, FSR with INDF, to clear, add, copy and search blocks of RAM, and you handle text as strings of ASCII codes, in RAM and in tables of the program memory.</p>`,
  sections: [
    {
      title: 'Indirect addressing: FSR and INDF',
      objectives: ['You will be able to use FSR and INDF to reach a register through its address', 'You will be able to process a block of registers in a loop'],
      blocks: [
        D.T(R`<p>An instruction such as <code>MOVF 0x30, W</code> names its register directly, so it cannot be used in a loop that walks through <code>0x30</code>, <code>0x31</code>, <code>0x32</code>... For this the PIC has <b>indirect addressing</b>, the assembly version of a pointer:</p>
<ul>
<li>the register <b>FSR</b> (file select register) holds an address;</li>
<li>the register <b>INDF</b> (indirect file) is not a real register: reading or writing INDF reads or writes the register whose address is in FSR.</li>
</ul>
<p>FSR has $8$ bits; the ninth bit of the address comes from the bit IRP of STATUS (IRP $= 0$ for banks 0 and 1).</p>`),
        D.CODE(R`    MOVLW   0x30
    MOVWF   FSR         ; point to 0x30
    MOVLW   16
    MOVWF   COUNT
LOOP:
    CLRF    INDF        ; clear the register FSR points to
    INCF    FSR, F      ; point to the next one
    DECFSZ  COUNT, F
    GOTO    LOOP`, 'asm', { cap: R`Clearing the $16$ registers $30_{16} \ldots 3F_{16}$ with a pointer.` }),
        D.mc('What is INDF?', 'What happens when a program writes to INDF?', ['The value is written to the register whose address is in FSR', 'The value is written to INDF itself, at its own address', 'FSR is incremented', 'Nothing: INDF is read-only'], 0, 'INDF is not a real register: it is a window onto the register that FSR points to.', { hint: 'INDF = indirect file.' }),
        D.trace('Indirect access', R`<p>Follow the program and write W and FSR after each instruction. The registers $40_{16}$ and $41_{16}$ hold $5$ and $9$.</p>`, { pre: 'V0 EQU 0x40\nV1 EQU 0x41', code: 'MOVLW 0x40\nMOVWF FSR\nMOVF INDF, W\nINCF FSR, F\nADDWF INDF, W', watch: ['W', 'FSR'], init: { V0: 5, V1: 9 } }, R`FSR $= 64 = 40_{16}$, INDF reads register $40_{16}$ ($W = 5$), FSR becomes $65$, and INDF now reads register $41_{16}$: $W = 5 + 9 = 14$.`, { hint: 'INDF is the register whose address is in FSR.', note: R`Start: register $40_{16}$ holds $5$ and register $41_{16}$ holds $9$.` }),
        D.asm('Clear a block', R`<p>Clear the eight registers $30_{16} \ldots 37_{16}$ with indirect addressing (FSR, INDF and a counter).</p>`, {
          pre: 'COUNT EQU 0x70', start: ASTART,
          tests: [{ init: { 'RAM[0x30]': 7, 'RAM[0x33]': 9, 'RAM[0x37]': 1, 'RAM[0x38]': 0x55, 'RAM[0x2F]': 0x66 }, expect: { 'RAM[0x30]': 0, 'RAM[0x33]': 0, 'RAM[0x37]': 0, 'RAM[0x38]': 0x55, 'RAM[0x2F]': 0x66 } }],
          solution: '    MOVLW 0x30\n    MOVWF FSR\n    MOVLW 8\n    MOVWF COUNT\nLOOP:\n    CLRF INDF\n    INCF FSR, F\n    DECFSZ COUNT, F\n    GOTO LOOP\n    GOTO $'
        }, R`FSR walks from $30_{16}$ to $37_{16}$ while COUNT counts the $8$ rounds; <code>CLRF INDF</code> clears the register FSR points to.`, { hint: 'Copy the loop shown above, with 8 instead of 16.' }),
        D.asm('Sum of an array', R`<p>Eight bytes are stored at $30_{16} \ldots 37_{16}$. Add them and store the sum (at most $255$) in SUM. Use indirect addressing.</p>`, {
          pre: 'SUM EQU 0x20\nCOUNT EQU 0x70', start: ASTART,
          tests: [{ name: '1, 2, ..., 8', init: { 'RAM[0x30]': 1, 'RAM[0x31]': 2, 'RAM[0x32]': 3, 'RAM[0x33]': 4, 'RAM[0x34]': 5, 'RAM[0x35]': 6, 'RAM[0x36]': 7, 'RAM[0x37]': 8 }, expect: { SUM: 36 } }, { name: 'other values', init: { 'RAM[0x30]': 100, 'RAM[0x31]': 50, 'RAM[0x37]': 20, 'RAM[0x38]': 99 }, expect: { SUM: 170 } }],
          solution: '    CLRF SUM\n    MOVLW 0x30\n    MOVWF FSR\n    MOVLW 8\n    MOVWF COUNT\nLOOP:\n    MOVF INDF, W\n    ADDWF SUM, F\n    INCF FSR, F\n    DECFSZ COUNT, F\n    GOTO LOOP\n    GOTO $'
        }, 'Each round reads the byte FSR points to with MOVF INDF, W, adds it to SUM and moves FSR forward.', { hint: 'MOVF INDF, W reads the current element; ADDWF SUM, F adds it.' }),
        D.trace('Writing through a pointer', R`<p>Follow FSR and the registers $50_{16}$ and $51_{16}$ (named R50 and R51).</p>`, { pre: 'R50 EQU 0x50\nR51 EQU 0x51', code: 'MOVLW 0x50\nMOVWF FSR\nMOVLW 7\nMOVWF INDF\nINCF FSR, F\nMOVWF INDF\nINCF INDF, F', watch: ['FSR', 'R50', 'R51'] }, R`FSR points to $50_{16} = 80$, and <code>MOVWF INDF</code> writes $7$ there. After <code>INCF FSR, F</code> it points to $51_{16}$, which receives $7$ and is then incremented through INDF to $8$.`, { hint: 'Every access to INDF uses the address that FSR holds at that moment.' })
      ]
    },
    {
      title: 'Working with blocks of RAM',
      objectives: ['You will be able to find the maximum of a block', 'You will be able to copy and search blocks', 'You will be able to count the elements that satisfy a condition'],
      blocks: [
        D.T(R`<p>A block of consecutive registers is the assembly version of an array: its <b>first address</b> and its <b>length</b> describe it completely. Every algorithm on a block has the same skeleton: point FSR to the first element, load a counter with the length, and in each round process <code>INDF</code>, then <code>INCF FSR, F</code> and <code>DECFSZ</code> the counter.</p>`),
        D.T(R`<p>When two blocks are needed at once (copying), there is only one FSR. A neat trick works when the two blocks differ in one address bit: the source $30_{16} \ldots 37_{16}$ and the destination $40_{16} \ldots 47_{16}$ differ only in bits 4, 5 and 6, and $30_{16} \text{ XOR } 40_{16} = 70_{16}$. So <code>MOVLW 0x70</code> and <code>XORWF FSR, F</code> switch the pointer between the two blocks. Otherwise, keep the two addresses in two registers and copy them into FSR in turn.</p>`),
        D.asm('Maximum of a block', R`<p>Eight unsigned bytes are stored at $30_{16} \ldots 37_{16}$. Store the biggest one in MAX.</p>`, {
          start: 'MAX   EQU 0x20\nCOUNT EQU 0x70\n\n; write your code here\n\n    GOTO $\n',
          tests: [[3, 9, 1, 200, 7, 7, 0, 199], [255, 1, 2, 3, 4, 5, 6, 7], [1, 2, 3, 4, 5, 6, 7, 250], [0, 0, 0, 0, 0, 0, 0, 0]].map((v, i) => ({ name: 'block ' + (i + 1), init: Object.assign(block(0x30, v), { MAX: 99 }), expect: { MAX: Math.max(...v) } })),
          solution: 'MAX   EQU 0x20\nCOUNT EQU 0x70\n\n    CLRF  MAX\n    MOVLW 0x30\n    MOVWF FSR\n    MOVLW 8\n    MOVWF COUNT\nLOOP:\n    MOVF  INDF, W\n    SUBWF MAX, W      ; MAX - element\n    BTFSC STATUS, 0\n    GOTO  NEXT        ; MAX >= element\n    MOVF  INDF, W\n    MOVWF MAX         ; new maximum\nNEXT:\n    INCF  FSR, F\n    DECFSZ COUNT, F\n    GOTO  LOOP\n    GOTO $\n'
        }, R`Start with MAX $= 0$; in each round, $\text{MAX} - \text{element}$ with C $= 0$ means the element is bigger, and it becomes the new MAX.`, { hint: [R`Clear MAX, point FSR to $30_{16}$, COUNT $= 8$.`, R`In the loop compare with <code>MOVF INDF, W</code> and <code>SUBWF MAX, W</code>; when C $= 0$, copy INDF into MAX.`] }),
        D.asm('Copy a block', R`<p>Copy the eight bytes at $30_{16} \ldots 37_{16}$ to $40_{16} \ldots 47_{16}$. Use the XOR trick to switch FSR between the two blocks.</p>`, {
          start: 'COUNT EQU 0x70\n\n; write your code here\n\n    GOTO $\n',
          tests: [{ init: block(0x30, [11, 22, 33, 44, 55, 66, 77, 88]), expect: block(0x40, [11, 22, 33, 44, 55, 66, 77, 88]) }, { name: 'other values', init: Object.assign(block(0x30, [1, 0, 255, 128, 9, 9, 9, 3]), { 'RAM[0x48]': 0x5A }), expect: Object.assign(block(0x40, [1, 0, 255, 128, 9, 9, 9, 3]), { 'RAM[0x48]': 0x5A }) }],
          solution: 'COUNT EQU 0x70\n\n    MOVLW 0x30\n    MOVWF FSR\n    MOVLW 8\n    MOVWF COUNT\nLOOP:\n    MOVF  INDF, W     ; read from 0x3?\n    MOVWF COUNT+1     ; keep it (0x71)\n    MOVLW 0x70\n    XORWF FSR, F      ; FSR = 0x4?\n    MOVF  COUNT+1, W\n    MOVWF INDF        ; write to 0x4?\n    MOVLW 0x70\n    XORWF FSR, F      ; back to 0x3?\n    INCF  FSR, F\n    DECFSZ COUNT, F\n    GOTO  LOOP\n    GOTO $\n'
        }, R`The value read through INDF is kept in a spare register ($71_{16}$, written <code>COUNT+1</code>) because W is needed for the mask. XOR with $70_{16}$ moves the pointer to the destination and back.`, { hint: [R`Inside the loop: read <code>MOVF INDF, W</code> and save W in a spare register (W is needed for <code>MOVLW 0x70</code>).`, R`<code>MOVLW 0x70</code>, <code>XORWF FSR, F</code>, write the saved value to INDF, XOR again, then <code>INCF FSR, F</code>.`] }),
        D.asm('Count above a limit', R`<p>Count how many of the eight bytes at $30_{16} \ldots 37_{16}$ are greater than $100$, and store the count in N.</p>`, {
          start: 'N     EQU 0x20\nCOUNT EQU 0x70\n\n; write your code here\n\n    GOTO $\n',
          tests: [[150, 100, 101, 7, 255, 0, 99, 200], [1, 2, 3, 4, 5, 6, 7, 8], [101, 101, 101, 101, 101, 101, 101, 101]].map((v, i) => ({ name: 'block ' + (i + 1), init: Object.assign(block(0x30, v), { N: 99 }), expect: { N: v.filter(x => x > 100).length } })),
          solution: 'N     EQU 0x20\nCOUNT EQU 0x70\n\n    CLRF  N\n    MOVLW 0x30\n    MOVWF FSR\n    MOVLW 8\n    MOVWF COUNT\nLOOP:\n    MOVF  INDF, W\n    SUBLW 100         ; 100 - element: C = 0 if element > 100\n    BTFSS STATUS, 0\n    INCF  N, F\n    INCF  FSR, F\n    DECFSZ COUNT, F\n    GOTO  LOOP\n    GOTO $\n'
        }, R`<code>SUBLW 100</code> calculates $100 - \text{element}$, with C $= 0$ exactly when the element is greater than $100$ (Part 4). The test values $100$ and $101$ check the boundary.`, { hint: R`Use the loop skeleton; in the body: <code>MOVF INDF, W</code>, <code>SUBLW 100</code>, <code>BTFSS STATUS, 0</code>, <code>INCF N, F</code>.` }),
        D.asm('Find a value', R`<p>Search the eight bytes at $30_{16} \ldots 37_{16}$ for the value in KEY. Store in POS the position of the first match ($0$ for $30_{16}$, $7$ for $37_{16}$), or $255$ when KEY is not in the block.</p>`, {
          start: 'KEY   EQU 0x20\nPOS   EQU 0x21\nCOUNT EQU 0x70\n\n; write your code here\n\n    GOTO $\n',
          tests: [[[5, 8, 13, 8, 2, 0, 1, 1], 8, 1], [[5, 8, 13, 8, 2, 0, 1, 1], 5, 0], [[5, 8, 13, 8, 2, 0, 1, 99], 99, 7], [[5, 8, 13, 8, 2, 0, 1, 1], 42, 255]].map(([v, k, p], i) => ({ name: R`KEY $= ` + k + R`$`, init: Object.assign(block(0x30, v), { KEY: k, POS: 9 }), expect: { POS: p } })),
          solution: 'KEY   EQU 0x20\nPOS   EQU 0x21\nCOUNT EQU 0x70\n\n    CLRF  POS\n    MOVLW 0x30\n    MOVWF FSR\n    MOVLW 8\n    MOVWF COUNT\nLOOP:\n    MOVF  INDF, W\n    XORWF KEY, W      ; Z = 1 if element == KEY\n    BTFSC STATUS, 2\n    GOTO  DONE\n    INCF  POS, F\n    INCF  FSR, F\n    DECFSZ COUNT, F\n    GOTO  LOOP\n    MOVLW 255         ; not found\n    MOVWF POS\nDONE:\n    GOTO $\n'
        }, R`POS counts the elements that were checked; the loop stops at the first match. If the counter runs out, POS is set to $255$.`, { hint: [R`POS starts at $0$ and is incremented after each element that does not match.`, R`Compare with <code>MOVF INDF, W</code> and <code>XORWF KEY, W</code>; after the loop, set POS to $255$.`] })
      ]
    },
    {
      title: 'Strings and ASCII',
      objectives: ['You will know how text is stored as ASCII codes ending with a zero', 'You will be able to process a string with a pointer', 'You will be able to keep constant text in a RETLW table'],
      blocks: [
        D.T(R`<p>A character is stored as its <b>ASCII code</b>: <code>'A'</code> is $65$, <code>'a'</code> is $97$, the space is $32$ and the digit <code>'0'</code> is $48$. A <b>string</b> is a block of characters followed by the code $0$, the end mark. The word "OK" therefore needs $3$ bytes: $79$, $75$ and $0$. A loop that processes a string stops when it reads the $0$; it does not need to know the length in advance.</p>
<p>Upper-case and lower-case letters differ by $32 = 2^{5}$: <code>'a'</code> $= 97 = 0110\,0001_{2}$ and <code>'A'</code> $= 65 = 0100\,0001_{2}$. So <code>BCF</code> on bit 5 turns a lower-case letter into upper case, and <code>BSF</code> on bit 5 does the opposite, but only for letters.</p>`),
        D.CODE(R`    MOVLW   0x30
    MOVWF   FSR          ; the string starts at 0x30
LOOP:
    MOVF    INDF, F      ; Z = 1 at the end mark
    BTFSC   STATUS, 2
    GOTO    END_OF_TEXT
    ; ... process the character INDF ...
    INCF    FSR, F
    GOTO    LOOP`, 'asm', { cap: R`The skeleton of a string loop. <code>MOVF INDF, F</code> sets Z when the current character is the end mark $0$.` }),
        D.T(R`<p>Constant text, such as a message for the LCD, should not waste RAM: it can stay in the program memory as a look-up table of <code>RETLW</code> instructions (Part 6), ending with <code>RETLW 0</code>. A loop calls the table with the index $0, 1, 2, \ldots$ until the table returns $0$. Activity 15 writes each letter with its own <code>MOVLW</code>; a table makes the message easier to change.</p>`),
        D.num('Upper and lower case', R`<p>How much must be subtracted from the code of a lower-case letter to get the upper-case letter?</p>`, 32, R`<code>'a'</code> $-$ <code>'A'</code> $= 97 - 65 = 32$, the weight of bit 5.`, { hint: R`Compare $97$ and $65$.` }),
        D.num('Bytes of a string', R`<p>How many bytes does the string "PIC16" need in RAM, end mark included?</p>`, 6, R`Five characters plus the end mark $0$.`, { hint: 'Do not forget the end mark.' }),
        D.asm('String length', R`<p>A string starts at $30_{16}$ and ends with $0$. Count its characters (without the end mark) and store the count in LEN.</p>`, {
          start: 'LEN EQU 0x20\n\n; write your code here\n\n    GOTO $\n',
          tests: [['HELLO', 5], ['A', 1], ['', 0], ['PIC 16F887', 10]].map(([s, n]) => ({ name: '"' + s + '"', init: Object.assign(str(0x30, s), { LEN: 99 }), expect: { LEN: n } })),
          solution: 'LEN EQU 0x20\n\n    CLRF  LEN\n    MOVLW 0x30\n    MOVWF FSR\nLOOP:\n    MOVF  INDF, F     ; Z = 1 at the end mark\n    BTFSC STATUS, 2\n    GOTO  DONE\n    INCF  LEN, F\n    INCF  FSR, F\n    GOTO  LOOP\nDONE:\n    GOTO $\n'
        }, R`The loop of the example: test the character for $0$, otherwise count it and move the pointer. The empty string has length $0$: the very first character is the end mark.`, { hint: 'Use the string skeleton shown above and increment LEN for each character.' }),
        D.asm('To upper case', R`<p>A string starts at $30_{16}$ and ends with $0$. Convert every lower-case letter (<code>'a'</code> to <code>'z'</code>) to upper case, in place. Other characters (upper-case letters, digits, spaces) must not change.</p>`, {
          start: '; write your code here\n\n    GOTO $\n',
          tests: [['Hello pic 16!', 'HELLO PIC 16!'], ['abc xyz', 'ABC XYZ'], ['OK [1] @{}', 'OK [1] @{}']].map(([s, r]) => ({ name: '"' + s + '"', init: str(0x30, s), expect: str(0x30, r) })),
          solution: "    MOVLW 0x30\n    MOVWF FSR\nLOOP:\n    MOVF  INDF, W\n    BTFSC STATUS, 2\n    GOTO  DONE        ; end mark\n    SUBLW 'z'         ; 'z' - c: C = 0 if c > 'z'\n    BTFSS STATUS, 0\n    GOTO  NEXT\n    MOVF  INDF, W\n    SUBLW 'a' - 1     ; ('a' - 1) - c: C = 0 if c >= 'a'\n    BTFSC STATUS, 0\n    GOTO  NEXT\n    BCF   INDF, 5     ; lower case: clear bit 5\nNEXT:\n    INCF  FSR, F\n    GOTO  LOOP\nDONE:\n    GOTO $\n"
        }, R`A character is a lower-case letter when $97 \leq c \leq 122$: two comparisons, as for a range in Part 4. Only then is bit 5 cleared. The characters <code>[</code>, <code>@</code>, <code>{</code> and <code>}</code> lie just outside the ranges of the letters, so they check the limits.`, { hint: [R`Use the string loop. For each character test the range: <code>SUBLW 'z'</code> gives C $= 0$ if $c > $ <code>'z'</code>.`, R`Then <code>SUBLW 'a' - 1</code> gives C $= 1$ if $c < $ <code>'a'</code>. Only in between: <code>BCF INDF, 5</code>.`] }),
        D.asm('Message from a table', R`<p>The table <code>MSG</code> returns the characters of a message for the index in W, and $0$ at the end. Copy the message into RAM from $30_{16}$, end mark included, by calling the table with the index $0, 1, 2, \ldots$ until it returns $0$.</p>`, {
          pre: "INDEX EQU 0x70\n    GOTO START\nMSG:\n    ADDWF PCL, F\n    RETLW 'H'\n    RETLW 'C'\n    RETLW 'T'\n    RETLW ' '\n    RETLW 'O'\n    RETLW 'K'\n    RETLW 0\nSTART:",
          start: '; write your code here\n\n    GOTO $\n',
          tests: [{ expect: str(0x30, 'HCT OK') }],
          solution: '    CLRF  INDEX\n    MOVLW 0x30\n    MOVWF FSR\nLOOP:\n    MOVF  INDEX, W\n    CALL  MSG         ; W = character number INDEX\n    MOVWF INDF        ; MOVWF does not change Z\n    IORLW 0           ; Z = 1 if it was the end mark\n    BTFSC STATUS, 2\n    GOTO  DONE\n    INCF  INDEX, F\n    INCF  FSR, F\n    GOTO  LOOP\nDONE:\n    GOTO $\n'
        }, R`RETLW does not change Z, so the returned character is tested with <code>IORLW 0</code> (W stays the same, Z $= 1$ for $0$). Storing it first means the end mark is copied too.`, { hint: [R`Keep the index in INDEX and the destination in FSR.`, R`<code>MOVF INDEX, W</code>, <code>CALL MSG</code>, <code>MOVWF INDF</code>, then <code>IORLW 0</code> to test for the end mark.`] }),
        D.mc('Why tables for text?', 'Why is constant text usually stored as a RETLW table rather than in RAM?', ['The program memory is much larger than the RAM, and the text never changes', 'RAM cannot hold ASCII codes', 'RETLW is faster than MOVF', 'Tables can be changed while the program runs'], 0, 'The PIC16F887 has 8192 words of program memory but only 368 bytes of free RAM.', { hint: 'Compare the sizes of the two memories.' })
      ]
    },
{
      title: 'Challenge: bubble sort',
      objectives: ['You will sort a block of RAM with two nested loops and a pointer'],
      blocks: [
        D.T(R`<p>Three values can be sorted with three compare-and-exchange steps. For a whole block, <b>bubble sort</b> repeats one simple pass: walk through the block and exchange every pair of neighbours that is in the wrong order. After the first pass the biggest value has "bubbled up" to the end of the block; after the second pass the second biggest is in place, and so on. For $n$ values, $n - 1$ passes are always enough.</p>
$$5, 3, 8, 1 \;\to\; 3, 5, 1, 8 \;\to\; 3, 1, 5, 8 \;\to\; 1, 3, 5, 8$$`),
        D.asm('Bubble sort', R`<p>The $8$ bytes at $30_{16} \ldots 37_{16}$ must be sorted in increasing order (unsigned), in place. Walk through the block with FSR and INDF. PASS, CNT and TMP, in the shared area, are free. The byte at $38_{16}$, just after the block, must not change.</p>`, {
          start: 'PASS EQU 0x70\nCNT  EQU 0x71\nTMP  EQU 0x72\n\n; write your code here\n\n    GOTO $\n',
          tests: [[5, 3, 8, 1, 9, 2, 7, 4], [8, 7, 6, 5, 4, 3, 2, 1], [1, 2, 3, 4, 5, 6, 7, 8], [3, 3, 1, 1, 2, 2, 0, 255], [200, 10, 255, 0, 128, 127, 1, 254]].map(a => ({ name: R`$` + a.join(R`,\ `) + R`$`, init: Object.assign(block(0x30, a.concat([0x5A])), { C: 1 }), expect: block(0x30, a.slice().sort((x, y) => x - y).concat([0x5A])) })),
          reqs: [{ re: /\bINDF\b/i, msg: 'Walk through the block with FSR and INDF.' }],
          solution: "PASS EQU 0x70\nCNT  EQU 0x71\nTMP  EQU 0x72\n\n    MOVLW 7\n    MOVWF PASS          ; 7 passes are always enough for 8 values\nOUTER:\n    MOVLW 0x30\n    MOVWF FSR           ; FSR -> the first value\n    MOVLW 7\n    MOVWF CNT           ; 7 neighbouring pairs\nINNER:\n    MOVF  INDF, W\n    MOVWF TMP           ; TMP = the left value\n    INCF  FSR, F        ; FSR -> the right value\n    MOVF  INDF, W       ; W = the right value\n    SUBWF TMP, W        ; left - right: C = 0 if left < right\n    BTFSC STATUS, 2\n    GOTO  NEXT          ; equal: nothing to do\n    BTFSS STATUS, 0\n    GOTO  NEXT          ; left < right: already in order\n    MOVF  INDF, W       ; exchange: W = the right value\n    DECF  FSR, F\n    MOVWF INDF          ; the left place gets the right value\n    INCF  FSR, F\n    MOVF  TMP, W\n    MOVWF INDF          ; the right place gets the old left value\nNEXT:\n    DECFSZ CNT, F       ; FSR already points to the next pair\n    GOTO  INNER\n    DECFSZ PASS, F\n    GOTO  OUTER\n    GOTO  $\n"
        }, R`Each pass compares the $7$ pairs of neighbours and exchanges those in the wrong order; the biggest value that is not yet in place moves to its end position. $7$ passes are enough for $8$ values. After a comparison FSR already points to the right-hand value, which is the left-hand value of the next pair. Equal neighbours stay where they are.`, { challenge: true, hint: [R`Two loops: an outer loop of $7$ passes and an inner loop of $7$ pairs. Each pass starts with <code>MOVLW 0x30</code>, <code>MOVWF FSR</code>.`, R`For one pair: copy INDF into TMP, <code>INCF FSR, F</code>, and compare INDF with TMP. To exchange them: <code>MOVF INDF, W</code>, <code>DECF FSR, F</code>, <code>MOVWF INDF</code>, <code>INCF FSR, F</code>, then TMP into INDF.`] })
      ]
    }
  ]
});
})();
