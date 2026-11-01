"""Builds the course into ONE offline file: index.html (fonts, KaTeX, styles, simulators and content inlined).

Usage:  python build.py
Open index.html in any modern browser. No server and no internet connection are needed.
"""
import base64
import glob
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'src')
VENDOR = os.path.join(HERE, 'vendor')


def read(path, mode='r'):
    with open(path, mode, **({} if 'b' in mode else {'encoding': 'utf-8'})) as f:
        return f.read()


def b64(path):
    return base64.b64encode(read(path, 'rb')).decode('ascii')


def font_css():
    faces = [
        ('Open Sans', 'open-sans-latin-400-normal', 400, 'normal'), ('Open Sans', 'open-sans-latin-400-italic', 400, 'italic'),
        ('Open Sans', 'open-sans-latin-600-normal', 600, 'normal'), ('Open Sans', 'open-sans-latin-700-normal', 700, 'normal'),
        ('Open Sans', 'open-sans-latin-700-italic', 700, 'italic'),
        ('Roboto Slab', 'roboto-slab-latin-300-normal', 300, 'normal'), ('Roboto Slab', 'roboto-slab-latin-400-normal', 400, 'normal'),
        ('Roboto Slab', 'roboto-slab-latin-500-normal', 500, 'normal'), ('Roboto Slab', 'roboto-slab-latin-700-normal', 700, 'normal'),
        ('Roboto', 'roboto-latin-400-normal', 400, 'normal'), ('Roboto', 'roboto-latin-400-italic', 400, 'italic'),
        ('Roboto', 'roboto-latin-500-normal', 500, 'normal'), ('Roboto', 'roboto-latin-700-normal', 700, 'normal'),
        ('Roboto Mono', 'roboto-mono-latin-400-normal', 400, 'normal'), ('Roboto Mono', 'roboto-mono-latin-700-normal', 700, 'normal'),
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


def doodle(color):
    svg = read(os.path.join(SRC, 'assets', 'doodles.svg')).replace('#STROKE#', color)
    return 'data:image/svg+xml;base64,' + base64.b64encode(svg.encode('utf-8')).decode('ascii')


def js_bundle():
    order = ['pic.js', 'asm.js', 'cinterp.js', 'util.js', 'dsl.js', 'exercises.js']
    parts = [read(os.path.join(SRC, 'js', n)) for n in order]
    content = sorted(glob.glob(os.path.join(SRC, 'content', '*.js')))
    parts += ['/* ---- %s ---- */\n' % os.path.basename(p) + read(p) for p in content]
    parts.append(read(os.path.join(SRC, 'js', 'app.js')))
    return '\n'.join(parts), len(content)


def safe_script(js):
    # a literal </script> or <!-- inside the JS would end or confuse the inline script block
    js = re.sub(r'</(script)', r'<\\/\1', js, flags=re.I)
    return js.replace('<!--', '<\\!--')


def main():
    css = read(os.path.join(SRC, 'css', 'style.css'))
    css = css.replace('/*__DOODLE_RED__*/', doodle('#ef8b80')).replace('/*__DOODLE_GREY__*/', doodle('#d9d9d9'))
    js, n_content = js_bundle()
    html = read(os.path.join(SRC, 'template.html'))
    html = (html.replace('/*__FONTS__*/', font_css())
                .replace('/*__KATEX_CSS__*/', katex_css())
                .replace('/*__CSS__*/', css)
                .replace('/*__KATEX_JS__*/', safe_script(read(os.path.join(VENDOR, 'katex', 'katex.min.js'))))
                .replace('/*__JS__*/', safe_script(js)))
    out = os.path.join(HERE, 'index.html')
    with open(out, 'w', encoding='utf-8', newline='\n') as f:
        f.write(html)
    print('built %s  %.0f KB  (%d content files)' % (out, len(html.encode('utf-8')) / 1024.0, n_content))


if __name__ == '__main__':
    main()
