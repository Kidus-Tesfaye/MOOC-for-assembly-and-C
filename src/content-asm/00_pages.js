/* Pages that are not part of a numbered part: the home page text and "About the material". */
(function () {
D.page({
  slug: 'home', title: 'About this course',
  blocks: [
    D.T(R`<p>This is the course material for learning to <b>program in assembly language</b>, starting from zero. You do not need any previous programming experience, and you do not need to know anything about electronics. Every new idea is explained with small examples, and you practise it straight away with exercises that run in your browser.</p>
<p>The programs are written for the <b>PIC16F887</b>, a small 8-bit processor made by Microchip, with the <b>pic-as</b> assembler used in the course <i>Microcontroller Systems ELE3614</i>. The examples and lab activities of that course appear throughout the material. The PIC16F887 has only <b>35 instructions</b>; by the end of the course you will know every one of them, what it does to the flags and how long it takes, and you will have used them to drive LEDs, read buttons, react to interrupts, generate signals with timers, measure voltages, write on an LCD and talk to a computer over a serial line.</p>`),
    D.H('How the course works'),
    D.T(R`<p>The course has 14 parts. Parts 1–7 form the <b>Introduction to Assembly Programming</b> and parts 8–14 the <b>Advanced Assembly Programming</b>. Each part has a few sections: read the text, try the examples, and solve the exercises at the end of each topic.</p>
<ul>
<li><b>Programming exercises</b> (the cards with a pencil) ask you to write assembly code. Press <b>Run</b> to try your program and <b>Test</b> to check it with the automatic tests. Your program runs in a simulator of the PIC16F887 with its registers, ports, timers, A/D converter, serial port and an LCD.</li>
<li><b>Quizzes</b> (the cards with a question mark) check that you understood the ideas: multiple choice, short answers, filling in code, and <b>tracing</b> a program instruction by instruction.</li>
<li>Every exercise is worth <b>1 point</b>. Wrong answers cost nothing; try as many times as you need. A hint is always available, and the model solution can be opened after your first attempt.</li>
</ul>`),
    D.KEY('Practising for an exam', R`<p>Exams on assembly ask you to read code as much as to write it. That is why every part has many tracing questions (what is in W, in a register and in the flags after each instruction), cycle counting, delay and timer calculations, and register settings. Part 14 collects mixed exam-style practice. Try to answer on paper first, then check your answer here.</p>`),
    D.H('Saving your progress'),
    D.T(R`<p>You do not need a server or an account. Your answers are saved <b>automatically in this browser</b> as soon as you check them. To keep a copy that you can move to another computer or browser, press <b>Save progress</b> at the top of any page: your progress is written to a small file on your computer. <b>Load progress</b> reads that file back. See <a href="#/progress">My progress and saving</a> for the details.</p>`),
    D.INFO('Mathematics in this course', R`<p>All calculations and mathematical symbols are written with mathematical notation, for example $2^{8} = 256$, $T_{\text{ins}} = \frac{4}{F_{\text{osc}}}$ or $\text{cycles} = 3n + 1$. You do not need advanced mathematics: the course explains every formula when it is used.</p>`),
    D.H('Running your programs on a real PIC'),
    D.T(R`<p>Everything in the course can be done in the browser. If you also have the hardware, the programs can be built with <b>MPLAB X IDE</b> and the <b>pic-as</b> assembler, and loaded into a PIC16F887 with a <b>PICkit</b> programmer. The page <a href="#/about-the-material">About the material and its tools</a> explains how the simulator of this course relates to the real tools.</p>`)
  ]
});

D.page({
  slug: 'about-the-material', title: 'About the material and its tools', nav: false,
  blocks: [
    D.T(R`<p>The course follows the lecture slides <i>Microcontroller Systems ELE3614</i> (Nabil Karami, PhD) and the lab activities written for them, keeping only the assembly language. The order of the topics has been rearranged so that programming ideas come first and hardware details are introduced only when a program needs them.</p>`),
    D.H('From your code to the chip'),
    D.TABLE(['Tool', 'What it does'], [
      ['<b>MPLAB X IDE</b>', 'The official Microchip program for writing, building and debugging code. IDE means <i>Integrated Development Environment</i>.'],
      ['<b>Assembler</b> (pic-as)', 'Translates assembly code into machine code: the binary numbers (0s and 1s) that are stored in the Flash memory of the PIC.'],
      ['<b>Programmer</b> (PICkit)', 'Copies the machine code (the <code>.hex</code> file) into the Flash memory of the chip, using 5 wires.'],
      ['<b>Simulator</b>', 'Runs the program on a model of the chip, so you can check it before using real hardware. MPLAB X and Proteus have simulators; this course has its own.']
    ]),
    D.H('The simulator of this course'),
    D.T(R`<p>The simulator implements all 35 instructions of the PIC16F887 with their flags and exact cycle counts, the four RAM banks, indirect addressing, the I/O ports (including the analog/digital selection with ANSEL), Timer0, Timer1, Timer2 and PWM, the A/D converter, the USART, the RB0 interrupt and an HD44780 LCD connected to PORTD. It understands the pic-as syntax used in the activities: labels with a colon, <code>EQU</code>, <code>#define</code>, <code>ORG</code>, <code>BANKSEL</code>, <code>GOTO $</code>, and numbers such as <code>01100000B</code>, <code>0X70</code> or <code>H'1F'</code>.</p>
<p>It is a teaching tool: it models what the course uses, but it is not a complete emulator. For example, the configuration bits are not simulated (the clock is always the internal oscillator, chosen with OSCCON), and the watchdog timer is not modelled (<code>CLRWDT</code> does nothing).</p>`),
    D.H('Fonts and licences'),
    D.T(R`<p>The pages use the fonts Inter, Space Grotesk and JetBrains Mono (SIL Open Font License) and the KaTeX library for mathematics (MIT License). All of them are included in this file, so the course works without an internet connection.</p>`)
  ]
});
})();
