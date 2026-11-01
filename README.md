# Assembly and C Programming MOOC (PIC16F887)

An offline, interactive course for learning to program in **C** and in **assembly language** from zero.
The look and feel copies the mooc.fi course pages
(Python Programming MOOC 2026).

## Using the course

1. Download **`index.html`** from this repository.
2. Double-click it to open it in Chrome, Edge, Firefox or Safari.

That is all: the file contains everything (the course text, the fonts, KaTeX for the mathematics, the C
interpreter and the PIC16F887 simulator). No server, no account and no internet connection are needed.

### Saving your progress

* Every answer you check is **saved automatically in your browser** (localStorage).
* **Save progress** (top right of every page) writes your progress to a small `.json` file on your
  computer. In Chrome and Edge you choose the file once, and the same file is updated each time you press
  the button; other browsers download the file to your Downloads folder.
* **Load progress** reads such a file back. You can *combine* it with the progress in the browser or
  *replace* it. Use this to move to another computer or browser, or after clearing the browser data.
* The page **My progress and saving** shows your points per part, when you last saved to a file, and a
  reset button.

## What is inside

| | |
|---|---|
| 14 parts, 55 sections | Parts 1–7: introduction to programming; parts 8–14: advanced course |
| 319 exercises | 139 programming exercises (91 in C, 48 in assembly) checked by automatic tests, and 180 quizzes |
| C interpreter | XC8 rules: 8-bit unsigned `char`, 16-bit `int`, 24-bit `short long`, 32-bit `long`/`float`; `<xc.h>` registers and bits, `__delay_ms`, `__interrupt()`; `printf`/`scanf` on a simulated serial terminal |
| PIC16F887 simulator | all 35 instructions with exact cycle counts, RAM banks, indirect addressing, ports with TRIS/ANSEL, Timer0/1/2, PWM, A/D converter, USART, RB0 interrupt and an HD44780 LCD |
| Mathematics | every calculation and symbol is written in LaTeX and rendered with KaTeX |

The curriculum is described in [`docs/curriculum.md`](docs/curriculum.md).

## For developers

The single file is generated from the sources:

```
src/js/pic.js          PIC16F887 machine model (memory, peripherals, LCD)
src/js/asm.js          assembler and CPU
src/js/cinterp.js      C interpreter
src/js/util.js         helpers, highlighting, LaTeX rendering, progress storage
src/js/dsl.js          the small language used to write the content
src/js/exercises.js    exercise types and cards
src/js/app.js          pages, navigation, saving, self-test
src/content/*.js       the course text and exercises, one file per part
src/css/style.css      the mooc.fi look
vendor/                KaTeX and the fonts (with their licences)
```

Build and test (Python 3 and Node.js; the browser checks use Playwright with Chromium):

```
python build.py               # writes index.html
node tests/test_asm.js        # assembler/simulator unit tests (lecture activities)
node tests/test_c.js          # C interpreter unit tests (lecture activities in C)
node tools/check.js /tmp/shots   # self-test of all exercises in the browser
node tools/latex_audit.js     # finds maths written outside LaTeX
```

The self-test checks that every model solution passes its tests and that a wrong answer is rejected.
Open `index.html#selftest` and look at the browser console to run it by hand.

## Licences

Fonts: Open Sans, Roboto, Roboto Slab and Roboto Mono (SIL Open Font License 1.1).
KaTeX: MIT License. The licence files are in `vendor/`.
