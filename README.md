# Assembly and C Programming MOOC (PIC16F887)

Two offline, interactive courses for learning to program the PIC16F887 from zero:

| File | Course | Contents |
|---|---|---|
| **`index.html`** | Assembly and C Programming MOOC | C and assembly side by side: 14 parts, 319 exercises |
| **`assembly.html`** | Assembly Programming MOOC | assembly only, with exam-style practice: 14 parts, 343 exercises |

## Using the courses

1. Download `index.html`, `assembly.html` or both. Keep them in the same folder, so that the link from one
   course to the other works.
2. Double-click a file to open it in Chrome, Edge, Firefox or Safari.

That is all: each file contains everything (the course text, the fonts, KaTeX for the mathematics, the PIC16F887
simulator and, in `index.html`, the C interpreter). No server, no account and no internet connection are needed.

### Notes

* Select any text of a course: a small menu appears with **Add note**. Write your note and save it: the
  text is highlighted in yellow with a note icon. Click the highlighted text (or the icon) to read, change
  or delete the note.
* **All notes** in the menu (below *All exercises*) lists every note as *highlighted text: your note*,
  with a link to the exact place in the course where it lives.

### Saving your progress

* Every answer you check is **saved automatically in your browser** (localStorage).
* **Save progress** (top right of every page) writes your progress to a small `.json` file on your
  computer. In Chrome and Edge you choose the file once, and the same file is updated each time you press
  the button; other browsers download the file to your Downloads folder.
* **Load progress** reads such a file back. You can *combine* it with the progress in the browser or
  *replace* it. Use this to move to another computer or browser, or after clearing the browser data.
* The page **My progress and saving** shows your points per part, when you last saved to a file, and a
  reset button.
* The progress file also carries your **notes**. Files saved before notes existed still load in both
  courses: they restore your exercises, and the notes already in the browser are kept.
* The two courses keep **separate progress**: their files are named `asm-c-mooc-progress-….json` and
  `asm-mooc-progress-….json`, and a file of one course cannot be loaded into the other.

## What is inside

| | Assembly and C (`index.html`) | Assembly (`assembly.html`) |
|---|---|---|
| Parts and sections | 14 parts, 55 sections | 14 parts, 53 sections |
| Exercises | 319: 91 in C, 48 in assembly, 180 quizzes | 343: 106 in assembly, 237 quizzes |
| Organisation | parts 1–7 introduction, parts 8–14 advanced course | parts 1–7 introduction, parts 8–14 advanced course |
| Extras | C interpreter with the rules of XC8 | a part on the 35 instructions, their flags, cycles and machine code; tracing and calculation practice for exams |

* **PIC16F887 simulator:** all 35 instructions with exact cycle counts, RAM banks, indirect addressing,
  ports with TRIS/ANSEL, Timer0/1/2, PWM, A/D converter, USART, RB0 interrupt and an HD44780 LCD.
* **C interpreter** (`index.html`): 8-bit unsigned `char`, 16-bit `int`, 24-bit `short long`, 32-bit
  `long`/`float`; `<xc.h>` registers and bits, `__delay_ms`, `__interrupt()`; `printf`/`scanf` on a simulated
  serial terminal.
* **Mathematics:** every calculation and symbol is written in LaTeX and rendered with KaTeX.
* **Look:** Space Grotesk headings, Inter text and JetBrains Mono code, a circuit-board pattern, and an
  accent colour per course (indigo for Assembly and C, emerald for Assembly).
* **Dark mode:** the moon/sun button at the top of every page switches between light and dark. The choice
  is remembered in the browser; until you choose, the course follows the light or dark setting of your computer.

The curricula are described in [`docs/curriculum.md`](docs/curriculum.md) (Assembly and C) and
[`docs/curriculum-assembly.md`](docs/curriculum-assembly.md) (Assembly).

## For developers

The two files are generated from the sources:

```
src/js/pic.js          PIC16F887 machine model (memory, peripherals, LCD)
src/js/asm.js          assembler and CPU
src/js/cinterp.js      C interpreter (index.html only)
src/js/util.js         helpers, highlighting, LaTeX rendering, progress storage
src/js/dsl.js          the small language used to write the content
src/js/exercises.js    exercise types and cards
src/js/notes.js        notes on the course text (select text, Add note)
src/js/app.js          pages, navigation, saving, self-test
src/content/*.js       index.html: the course text and exercises, one file per part
src/content-asm/*.js   assembly.html: the course text and exercises, one file per part
src/css/style.css      the look of both courses (the accent colour depends on the course)
src/assets/            the circuit-board background pattern
vendor/                KaTeX and the fonts (with their licences)
```

`build.py` holds the settings of each course: title, colour theme, content folder, progress key and file name.

Build and test (Python 3 and Node.js; the browser checks use Playwright with Chromium):

```
python build.py               # writes index.html and assembly.html (python build.py asm: only one)
node tests/test_asm.js        # assembler/simulator unit tests
node tests/test_c.js          # C interpreter unit tests
node tools/check.js           # self-test of all exercises of both courses in the browser
node tools/latex_audit.js     # finds maths written outside LaTeX, in both courses
```

The self-test checks that every model solution passes its tests and that a wrong answer is rejected.
Open `index.html#selftest` or `assembly.html#selftest` and look at the browser console to run it by hand.
Some unit tests also run the original lab activity files; they are skipped when those files are not present.

## Licences

Fonts: Inter, Space Grotesk and JetBrains Mono (SIL Open Font License 1.1).
KaTeX: MIT License. The licence files are in `vendor/`.
