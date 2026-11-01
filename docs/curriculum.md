# Curriculum: Assembly and C Programming (PIC16F887)

Goal: become a confident programmer in **C** and **assembly**, starting from zero.
The examples follow the ELE3614 lectures (Nabil Karami) and the lab activities, but every
page is organised around a *programming* idea; hardware is introduced only when the code needs it.
Every concept is shown in C and in assembly side by side.

## Introduction to Programming (Parts 1–7)

| Part | Title | Sections | Lecture / activity sources |
|---|---|---|---|
| 1 | Getting started with C | Your first program · Printing numbers and arithmetic · Variables · Information from the user | Lec 8 (C template, `main`) |
| 2 | Numbers inside the computer | Decimal, binary, hexadecimal · Converting between bases · Bits, bytes and ranges · Logic operations on bytes · Addition, subtraction and two's complement | Lec 2 |
| 3 | First steps in assembly | How a processor runs a program · Literal instructions and W · File registers and the destination bit · Anatomy of an assembly program (Activity 1) | Lec 3, Lec 4, Lab 1 |
| 4 | Making decisions | Conditions in C · The STATUS flags · Skips: if/else in assembly · Several cases (Activity 7) | Lec 4, 5, 9 |
| 5 | Loops and time | `while` and `for` in C · Loops in assembly · Instruction timing · Delay loops (Activity 6) | Lec 5, 8, Lab 3 |
| 6 | Functions and subroutines | Functions in C · `CALL`/`RETURN` and the stack · Returning values and look-up tables · Program templates | Lec 4, 6, 8, 9 |
| 7 | Bits and registers: input and output | Memory map and banks · Ports and TRIS (Activity 2) · Reading buttons (Activities 3–5) · Bit manipulation in C | Lec 5, 6, 7 |

## Advanced Course (Parts 8–14)

| Part | Title | Sections | Sources |
|---|---|---|---|
| 8 | Data types and arithmetic | XC8 types and sizes · Overflow, promotion and casts · Floating point and fixed point · Multi-byte arithmetic in assembly | Lec 8 (data types), Lec 2 |
| 9 | Arrays, strings and pointers | Arrays · Characters and strings · Pointers · Tables and indirect addressing in assembly | Lec 16–20 (buffers, ASCII) |
| 10 | Interrupts | Polling or interrupts · RB0/INT in assembly and C (Activities 8, 8C) · Shared variables and context saving (Activity 9) | Lec 10, Lab 4 |
| 11 | Timers | Timer0 and the prescaler · Square waves (Activities 10, 10C) · Timer interrupts and multitasking (Activity 11) · Timer1 (Activity 12) | Lec 11, 12, Lab 5 |
| 12 | PWM and analog input | PWM with Timer2 and CCP (Activity 13C) · The A/D converter (Activity 14) · Scaling sensor values (Activity 16C) | Lec 13, 15, 17 |
| 13 | Text output: LCD and serial port | Sending bytes to an LCD (Activity 15) · LCD in C · USART transmit (Activity 17) · USART receive and buffers (Activities 18, 19C) | Lec 16, 18, 19 |
| 14 | Putting it together | Parsing commands (Activity 20C) · State machines · Final projects | Lec 20, Labs 8–9 |

Simulators used by the exercises:
* `src/js/asm.js` + `src/js/pic.js` — PIC16F887 assembler/CPU with timers, ADC, USART, PWM and an HD44780 LCD.
* `src/js/cinterp.js` — C interpreter with XC8 rules (8-bit unsigned `char`, 16-bit `int`, 24-bit `short long`, 32-bit `long`/`float`), SFR access, `__delay_ms`, `__interrupt()`, `printf`/`scanf` on the simulated serial terminal.
