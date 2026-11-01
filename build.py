"""Builds the two offline courses. Each one is a single HTML file with the fonts, KaTeX, styles, simulators
and course content inlined:

  index.html     Assembly and C Programming MOOC   (content in src/content)
  assembly.html  Assembly Programming MOOC         (content in src/content-asm)

Usage:  python build.py          build both courses
        python build.py asm      build only assembly.html   (python build.py c: only index.html)
Open the HTML file in any modern browser. No server and no internet connection are needed.
"""
import base64
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
VENDOR = os.path.join(HERE, 'vendor')

COURSES = [
    {
        'key': 'c',
        'out': 'index.html',
        'content': 'content',
        'theme': 'indigo',
        'js': ['pic.js', 'asm.js', 'cinterp.js', 'util.js', 'dsl.js', 'exercises.js'],
        'description': 'Learn C and assembly programming from zero on the PIC16F887: explanations, worked examples and '
                       'hundreds of exercises that run in your browser. Progress is saved on your own computer.',
        'config': {
            'id': 'asm-c',
            'title': 'Assembly and C Programming MOOC',
            'short': 'Assembly and C',
            'tagline': 'Learn to program in C and assembly from zero',
            'eyebrow': 'PIC16F887 · C and assembly · works offline',
            'lead': 'Variables, decisions, loops, functions, bits, interrupts, timers and serial communication, '
                    'first in C and then in the 35 instructions of the PIC assembly language. Every exercise runs '
                    'and is checked in your browser.',
            'storageKey': 'asm-c-mooc-progress-v1',
            'appId': 'assembly-and-c-mooc',
            'filePrefix': 'asm-c-mooc-progress-',
            'groups': {'1': 'Introduction to Programming', '2': 'Advanced Course in Programming'},
            'footer': 'This course was made for learning <b>C</b> and <b>assembly</b> programming on the <b>PIC16F887</b>. '
                      'It follows the lecture slides <i>Microcontroller Systems ELE3614</i> by Nabil Karami, PhD, and the lab '
                      'activities that come with them.',
            'engine': 'the C interpreter and the PIC16F887 simulator are part of this single file',
            'heroCode': {'lang': 'c', 'title': 'blink.c', 'text': '#include <xc.h>\n#define _XTAL_FREQ 4000000\n\nvoid main(void) {\n    TRISD = 0x00;      // PORTD: outputs\n    while (1) {\n        RD0 = !RD0;    // toggle the LED\n        __delay_ms(500);\n    }\n}'},
            'sibling': {'title': 'Assembly Programming MOOC', 'href': 'assembly.html', 'appId': 'assembly-mooc',
                        'blurb': 'The same material without C: every assembly topic of this course, more tracing and '
                                 'timing practice, and exam-style questions.'},
        },
    },
    {
        'key': 'asm',
        'out': 'assembly.html',
        'content': 'content-asm',
        'theme': 'emerald',
        'js': ['pic.js', 'asm.js', 'util.js', 'dsl.js', 'exercises.js'],
        'description': 'Learn PIC16F887 assembly programming from zero: the 35 instructions, flags, loops and delays, '
                       'subroutines, ports, interrupts, timers, PWM, the A/D converter, the LCD and the serial port, with '
                       'exam-style practice. Everything runs in your browser and progress is saved on your own computer.',
        'config': {
            'id': 'asm',
            'title': 'Assembly Programming MOOC',
            'short': 'Assembly',
            'tagline': 'Learn PIC16F887 assembly from zero',
            'eyebrow': 'PIC16F887 · assembly only · works offline',
            'lead': 'The 35 instructions and their flags, loops and exact delays, subroutines and tables, ports and '
                    'buttons, interrupts, timers, PWM, the A/D converter, the LCD and the serial port. Every program '
                    'runs on a simulated PIC in your browser, with exam-style practice in every part.',
            'storageKey': 'asm-mooc-progress-v1',
            'appId': 'assembly-mooc',
            'filePrefix': 'asm-mooc-progress-',
            'groups': {'1': 'Introduction to Assembly Programming', '2': 'Advanced Assembly Programming'},
            'footer': 'This course was made for learning <b>assembly</b> programming on the <b>PIC16F887</b>. '
                      'It follows the lecture slides <i>Microcontroller Systems ELE3614</i> by Nabil Karami, PhD, and the lab '
                      'activities that come with them.',
            'engine': 'the PIC16F887 simulator is part of this single file',
            'heroCode': {'lang': 'asm', 'title': 'blink.s', 'text': '; blink the LED on RD0\nMAIN:   BANKSEL TRISD\n        CLRF    TRISD       ; PORTD: outputs\n        BANKSEL PORTD\nLOOP:   BSF     PORTD, 0    ; LED on\n        CALL    DELAY\n        BCF     PORTD, 0    ; LED off\n        CALL    DELAY\n        GOTO    LOOP'},
            'sibling': {'title': 'Assembly and C Programming MOOC', 'href': 'index.html', 'appId': 'assembly-and-c-mooc',
                        'blurb': 'The full course: C and assembly side by side, with a C interpreter that follows the '
                                 'rules of XC8.'},
        },
    },
]


def read(path, mode='r'):
    with open(path, mode, **({} if 'b' in mode else {'encoding': 'utf-8'})) as f:
        return f.read()


def b64(path):
    return base64.b64encode(read(path, 'rb')).decode('ascii')


def font_css():
    faces = [
        ('Inter', 'inter-latin-400-normal', 400, 'normal'), ('Inter', 'inter-latin-400-italic', 400, 'italic'),
        ('Inter', 'inter-latin-500-normal', 500, 'normal'), ('Inter', 'inter-latin-600-normal', 600, 'normal'),
        ('Inter', 'inter-latin-700-normal', 700, 'normal'), ('Inter', 'inter-latin-700-italic', 700, 'italic'),
        ('Space Grotesk', 'space-grotesk-latin-500-normal', 500, 'normal'),
        ('Space Grotesk', 'space-grotesk-latin-600-normal', 600, 'normal'),
        ('Space Grotesk', 'space-grotesk-latin-700-normal', 700, 'normal'),
        ('JetBrains Mono', 'jetbrains-mono-latin-400-normal', 400, 'normal'),
        ('JetBrains Mono', 'jetbrains-mono-latin-700-normal', 700, 'normal'),
    ]
    out = []
    for fam, f, w, st in faces:
        data = b64(os.path.join(VENDOR, 'fonts', f + '.woff2'))
        out.append("@font-face{font-family:'%s';font-style:%s;font-weight:%d;font-display:swap;src:url(data:font/woff2;base64,%s) format('woff2')}" % (fam, st, w, data))
    return '\n'.join(out)


def katex_css():
    css = read(os.path.join(VENDOR, 'katex', 'katex.min.css'))

    def repl(m):
        name = m.group(1)
        return 'src:url(data:font/woff2;base64,%s) format("woff2")' % b64(os.path.join(VENDOR, 'katex', 'fonts', name + '.woff2'))
    css = re.sub(r'src:url\(fonts/(KaTeX_[A-Za-z0-9_-]+)\.woff2\) format\("woff2"\)(?:,url\([^)]*\) format\("[^"]*"\))*', repl, css)
    if 'url(fonts/' in css:
        sys.exit('KaTeX CSS still references external fonts')
    return css


def svg_uri(name, color):
    svg = read(os.path.join(SRC, 'assets', name)).replace('#STROKE#', color)
    return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode('utf-8')).decode('ascii')


def js_bundle(course):
    parts = ['window.MOOC_CONFIG = %s;' % json.dumps(course['config'], ensure_ascii=False)]
    parts += [read(os.path.join(SRC, 'js', n)) for n in course['js']]
    content = sorted(glob.glob(os.path.join(SRC, course['content'], '*.js')))
    parts += ['/* ---- %s ---- */\n' % os.path.basename(p) + read(p) for p in content]
    parts.append(read(os.path.join(SRC, 'js', 'app.js')))
    return '\n'.join(parts), len(content)


def safe_script(js):
    # a literal </script> or <!-- inside the JS would end or confuse the inline script block
    js = re.sub(r'</(script)', r'<\\/\1', js, flags=re.I)
    return js.replace('<!--', '<\\!--')


def esc_attr(s):
    return s.replace('&', '&amp;').replace('"', '&quot;').replace('<', '&lt;')


def build(course, shared):
    css = (read(os.path.join(SRC, 'css', 'style.css'))
           .replace('/*__CIRCUIT_LIGHT__*/', shared['circuit_light'])
           .replace('/*__CIRCUIT_DARK__*/', shared['circuit_dark']))
    js, n_content = js_bundle(course)
    html = read(os.path.join(SRC, 'template.html'))
    html = (html.replace('__THEME__', course['theme'])
                .replace('__TITLE__', esc_attr(course['config']['title']))
                .replace('__DESCRIPTION__', esc_attr(course['description']))
                .replace('/*__FONTS__*/', shared['fonts'])
                .replace('/*__KATEX_CSS__*/', shared['katex_css'])
                .replace('/*__CSS__*/', css)
                .replace('/*__KATEX_JS__*/', shared['katex_js'])
                .replace('/*__JS__*/', safe_script(js)))
    out = os.path.join(HERE, course['out'])
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print('built %-14s %5.0f KB  (%d content files)' % (course['out'], len(html.encode('utf-8')) / 1024.0, n_content))


def main():
    want = sys.argv[1:] or [c['key'] for c in COURSES]
    unknown = [w for w in want if w not in [c['key'] for c in COURSES]]
    if unknown:
        sys.exit('unknown course %s (use: %s)' % (', '.join(unknown), ', '.join(c['key'] for c in COURSES)))
    shared = {
        'fonts': font_css(),
        'katex_css': katex_css(),
        'katex_js': safe_script(read(os.path.join(VENDOR, 'katex', 'katex.min.js'))),
        'circuit_light': svg_uri('circuit.svg', 'rgba(255,255,255,0.16)'),
        'circuit_dark': svg_uri('circuit.svg', 'rgba(148,163,184,0.12)'),
    }
    for c in COURSES:
        if c['key'] in want:
            build(c, shared)


if __name__ == '__main__':
    main()
