/* Pages that are not part of a numbered part: the home page text and "About the material". */
(function () {
D.page({
  slug: 'home', title: 'About this course',
  blocks: [
    D.T(R`<p>This is the course material for learning to <b>program in C and in assembly language</b>, starting from zero. You do not need any previous programming experience, and you do not need to know anything about electronics. Every new idea is explained with small examples, and you practise it straight away with exercises that run in your browser.</p>
<p>The programs in this course are written for the <b>PIC16F887</b>, a small 8-bit processor made by Microchip, using the same tools as the course <i>Microcontroller Systems ELE3614</i>: the <b>pic-as</b> assembler and the <b>XC8</b> C compiler. The examples and lab activities of that course (Activities 1 to 20) appear throughout the material. The focus here, however, is on <i>programming</i>: variables, arithmetic, decisions, loops, functions, bits, arrays, strings and pointers, first in C and then in the 35 instructions of the PIC assembly language.</p>`),
    D.H('How the course works'),
    D.T(R`<p>The course has 14 parts. Parts 1–7 form the <b>Introduction to Programming</b> and parts 8–14 the <b>Advanced Course in Programming</b>. Each part has a few sections: read the text, try the examples, and solve the exercises at the end of each topic.</p>
<ul>
<li><b>Programming exercises</b> (the cards with a pencil) ask you to write C or assembly code. Press <b>Run</b> to try your program and <b>Test</b> to check it with the automatic tests. A C program runs in a C interpreter that follows the rules of XC8; an assembly program runs in a simulator of the PIC16F887 with its ports, timers, A/D converter, serial port and an LCD.</li>
<li><b>Quizzes</b> (the cards with a question mark) check that you understood the ideas: multiple choice, short answers, filling in code, tracing a program step by step.</li>
<li>Every exercise is worth <b>1 point</b>. Wrong answers cost nothing; try as many times as you need. A hint is always available, and the model solution can be opened after your first attempt.</li>
</ul>`),
    D.H('Saving your progress'),
    D.T(R`<p>You do not need a server or an account. Your answers are saved <b>automatically in this browser</b> as soon as you check them. To keep a copy that you can move to another computer or browser, press <b>Save progress</b> at the top of any page: your progress is written to a small file on your computer. <b>Load progress</b> reads that file back. See <a href="#/progress">My progress and saving</a> for the details.</p>`),
    D.INFO('Mathematics in this course', R`<p>All calculations and mathematical symbols are written with mathematical notation, for example $2^{8} = 256$, $1023 \times \frac{2.5\ \mathrm{V}}{5\ \mathrm{V}} \approx 512$ or $T_{\text{ins}} = \frac{4}{F_{\text{osc}}}$. You do not need advanced mathematics: the course explains every formula when it is used.</p>`),
    D.H('Running your programs on a real PIC'),
    D.T(R`<p>Everything in the course can be done in the browser. If you also have the hardware, the programs can be built with <b>MPLAB X IDE</b> (assembly with the pic-as assembler, C with the XC8 compiler) and loaded into a PIC16F887 with a <b>PICkit</b> programmer. The page <a href="#/about-the-material">About the material and its tools</a> explains how the simulators of this course relate to the real tools.</p>`)
  ]
});

D.page({
  slug: 'about-the-material', title: 'About the material and its tools', nav: false,
  blocks: [
    D.T(R`<p>The course follows the lecture slides <i>Microcontroller Systems ELE3614</i> (Nabil Karami, PhD) and the lab activities written for them. The order of the topics has been rearranged so that programming ideas come first and hardware details are introduced only when a program needs them.</p>`),
    D.H('From your code to the chip'),
    D.TABLE(['Tool', 'What it does'], [
      ['<b>MPLAB X IDE</b>', 'The official Microchip program for writing, building and debugging code. IDE means <i>Integrated Development Environment</i>.'],
      ['<b>Assembler</b> (pic-as)', 'Translates assembly code into machine code: the binary numbers (0s and 1s) that are stored in the Flash memory of the PIC.'],
      ['<b>Compiler</b> (XC8)', 'Translates C code into machine code. XC8 is the Microchip compiler for the 8-bit PICs.'],
      ['<b>Programmer</b> (PICkit)', 'Copies the machine code (the <code>.hex</code> file) into the Flash memory of the chip, using 5 wires.'],
      ['<b>Simulator</b>', 'Runs the program on a model of the chip, so you can check it before using real hardware. MPLAB X and Proteus have simulators; this course has its own.']
    ]),
    D.H('The simulators of this course'),
    D.T(R`<p>The <b>assembly simulator</b> implements all 35 instructions of the PIC16F887 with their flags and cycle counts, the four RAM banks, indirect addressing, the I/O ports (including the analog/digital selection with ANSEL), Timer0, Timer1, Timer2 and PWM, the A/D converter, the USART and the RB0 interrupt. It understands the pic-as syntax used in the activities (labels with a colon, <code>EQU</code>, <code>#define</code>, <code>ORG</code>, <code>GOTO $</code>, numbers such as <code>01100000B</code> or <code>0X70</code>).</p>
<p>The <b>C interpreter</b> follows the rules of XC8 for this chip: <code>char</code> is 8 bits and unsigned, <code>int</code> is 16 bits, <code>long</code> and <code>float</code> are 32 bits, and the registers and bits of <code>&lt;xc.h&gt;</code> (<code>PORTD</code>, <code>RD0</code>, <code>GIE</code>...) work as on the chip, together with <code>__delay_ms()</code> and <code>__interrupt()</code>. Programs that print with <code>printf</code> show their output in a terminal, as if the PIC were connected to a computer by its serial port.</p>
<p>Both are teaching tools: they model what the course uses, but they are not complete emulators. The timing of C programs is approximate (as the lecture says, in C we cannot predict exactly how long the code takes); the timing of assembly programs is exact.</p>`),
    D.H('Fonts and licences'),
    D.T(R`<p>The pages use the fonts Inter, Space Grotesk and JetBrains Mono (SIL Open Font License) and the KaTeX library for mathematics (MIT License). All of them are included in this file, so the course works without an internet connection.</p>`)
  ]
});
})();
