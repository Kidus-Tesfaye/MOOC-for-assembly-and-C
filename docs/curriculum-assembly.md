# Curriculum: Assembly Programming (PIC16F887)

Goal: become a confident assembly programmer on the PIC16F887, starting from zero, and be ready for exams
that ask you to read, trace and write assembly code. The course keeps only the assembly language of the
Assembly and C course and adds a part on the instruction set, more tracing and timing exercises, and two
sections of exam practice. Every program runs in the PIC16F887 simulator of the page.

Parts 1–7 form the **Introduction to Assembly Programming** and parts 8–14 the **Advanced Assembly
Programming**. The last column is the number of exercises.

| Part | Title | Sections | Exercises |
|---|---|---|---|
| 1 | Numbers inside the computer | Decimal, binary and hexadecimal · Converting between the systems · Bits, bytes and ranges · Logic operations on bytes · Addition, subtraction and two's complement | 50 |
| 2 | First steps in assembly | How the processor runs a program · Literal instructions and the W register · File registers and the destination · Anatomy of an assembly program | 33 |
| 3 | The instruction set | The 35 instructions at a glance · Moving data and the Z flag · Arithmetic and the STATUS flags · Logic instructions and rotations · Tracing practice | 38 |
| 4 | Making decisions | Skip instructions: if and else in assembly · Comparing numbers · Several cases (Activity 7) | 17 |
| 5 | Loops and time | Loops in assembly · How fast is an instruction? · Delay loops · Activity 6: the blinking LED | 27 |
| 6 | Subroutines and tables | CALL, RETURN and the stack · Returning values and look-up tables · The structure of a complete program | 19 |
| 7 | Memory, ports and buttons | The RAM banks · Output pins: PORT, TRIS and ANSEL (Activity 2) · Reading push buttons (Activities 3 to 5) · Bit operations on ports | 30 |
| 8 | Arithmetic beyond 8 bits | 16-bit numbers · 16-bit subtraction and comparison · Multiplication and division · Decimal digits and BCD | 18 |
| 9 | Tables, pointers and strings | Indirect addressing: FSR and INDF · Working with blocks of RAM · Strings and ASCII | 15 |
| 10 | Interrupts | Polling or interrupts? · The external interrupt on RB0 (Activity 8) · Shared variables and the context (Activity 9) | 14 |
| 11 | Timers | Timer0 and the prescaler · Square waves by polling (Activity 10) · Timer interrupts and multitasking (Activity 11) · Timer1 (Activity 12) | 21 |
| 12 | PWM and analog input | PWM with Timer2 and the CCP module (Activity 13) · The A/D converter (Activity 14) · From a reading to a decision | 20 |
| 13 | Text output: LCD and serial port | Sending bytes to an LCD (Activity 15) · Messages and numbers on the LCD · The serial port: transmitting (Activity 17) · The serial port: receiving (Activity 18) | 21 |
| 14 | Putting it together | State machines · Exam practice: reading code · Exam practice: calculations · Final projects | 20 |

In total: 14 parts, 53 sections and 343 exercises (106 assembly programming exercises and 237 quizzes).
The lab activities used are Activities 1 to 18 in assembly; Activities 13C and 16C appear as assembly
versions (PWM with Timer2 and CCP, the LM35 thermometer as a threshold).
