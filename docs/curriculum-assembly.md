# Curriculum: Assembly Programming (PIC16F887)

Goal: become a confident assembly programmer on the PIC16F887, starting from zero, and be ready for exams
that ask you to read, trace and write assembly code. The course keeps only the assembly language of the
Assembly and C course and adds a part on the instruction set, more tracing and timing exercises, and two
sections of exam practice. Every program runs in the PIC16F887 simulator of the page.

Parts 1–7 form the **Introduction to Assembly Programming** and parts 8–14 the **Advanced Assembly
Programming**. The last column is the number of exercises.

| Part | Title | Sections | Exercises |
|---|---|---|---|
| 1 | Numbers inside the computer | Decimal, binary and hexadecimal · Converting between the systems · Bits, bytes and ranges · Logic operations on bytes · Addition, subtraction and two's complement · *Challenge: subtract without subtracting* | 51 |
| 2 | First steps in assembly | How the processor runs a program · Literal instructions and the W register · File registers and the destination · Anatomy of an assembly program · *Challenge: rotate by one hexadecimal digit* | 34 |
| 3 | The instruction set | The 35 instructions at a glance · Moving data and the Z flag · Arithmetic and the STATUS flags · Logic instructions and rotations · Tracing practice · *Challenge: parity without a loop* | 39 |
| 4 | Making decisions | Skip instructions: if and else in assembly · Comparing numbers · Several cases (Activity 7) · *Challenge: sort three numbers* | 18 |
| 5 | Loops and time | Loops in assembly · How fast is an instruction? · Delay loops · Activity 6: the blinking LED · *Challenge: integer square root* | 28 |
| 6 | Subroutines and tables | CALL, RETURN and the stack · Returning values and look-up tables · The structure of a complete program · *Challenge: a byte as hexadecimal text* | 20 |
| 7 | Memory, ports and buttons | The RAM banks · Output pins: PORT, TRIS and ANSEL (Activity 2) · Reading push buttons (Activities 3 to 5) · Bit operations on ports · *Challenge: three buttons and a counter* | 31 |
| 8 | Arithmetic beyond 8 bits | 16-bit numbers · 16-bit subtraction and comparison · Multiplication and division · Decimal digits and BCD · *Challenge: multiplication in eight rounds* | 19 |
| 9 | Tables, pointers and strings | Indirect addressing: FSR and INDF · Working with blocks of RAM · Strings and ASCII · *Challenge: bubble sort* | 16 |
| 10 | Interrupts | Polling or interrupts? · The external interrupt on RB0 (Activity 8) · Shared variables and the context (Activity 9) · *Challenge: two interrupt sources* | 15 |
| 11 | Timers | Timer0 and the prescaler · Square waves by polling (Activity 10) · Timer interrupts and multitasking (Activity 11) · Timer1 (Activity 12) · *Challenge: measure a pulse* | 22 |
| 12 | PWM and analog input | PWM with Timer2 and the CCP module (Activity 13) · The A/D converter (Activity 14) · From a reading to a decision · *Challenge: a dimmer with a minimum* | 21 |
| 13 | Text output: LCD and serial port | Sending bytes to an LCD (Activity 15) · Messages and numbers on the LCD · The serial port: transmitting (Activity 17) · The serial port: receiving (Activity 18) · *Challenge: a number from the keyboard* | 22 |
| 14 | Putting it together | State machines · Exam practice: reading code · Exam practice: calculations · Final projects · *Challenge: a lock with three tries* | 21 |

Every part ends with a **challenge** (in italics): a harder programming exercise, marked with a star, that may
go beyond the lecture slides.

In total: 14 parts, 67 sections and 357 exercises (120 assembly programming exercises and 237 quizzes).
The lab activities used are Activities 1 to 18 in assembly; Activities 13C and 16C appear as assembly
versions (PWM with Timer2 and CCP, the LM35 thermometer as a threshold).
