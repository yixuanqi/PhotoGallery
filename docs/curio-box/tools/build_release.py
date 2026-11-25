#!/usr/bin/env python3
"""
Curio Box (云海空中花房) - TapTap Bundle 构建脚本
将 index.html 按序引用的全部 src/*.js 合并并安全精简为单文件 game.bundle.js，
产出可直接上传 TapTap 的单顶层文件夹 ZIP 包（curio-box/index.html + style.css + game.bundle.js）。

用法：
  python tools/build_release.py
  python tools/build_release.py --out ../curio-box-taptap-v8.0-bundle.zip
"""

import argparse
import os
import re
import zipfile


def strip_js_comments_safely(code: str) -> str:
    """使用词法状态机安全剥离 JS 注释与多余空行，严格保留字符串、模板字符串与正则字面量。"""
    out = []
    i = 0
    n = len(code)
    in_template = False
    brace_stack = []
    last_sig = ''

    while i < n:
        ch = code[i]
        nxt = code[i + 1] if i + 1 < n else ''

        if in_template:
            if ch == '\\':
                out.append(code[i:i + 2])
                i += 2
                continue
            if ch == '`':
                in_template = False
                out.append(ch)
                last_sig = 'str'
                i += 1
                continue
            if ch == '$' and nxt == '{':
                brace_stack.append('${')
                in_template = False
                out.append('${')
                last_sig = '('
                i += 2
                continue
            out.append(ch)
            i += 1
            continue

        # Single-line comment
        if ch == '/' and nxt == '/':
            i += 2
            while i < n and code[i] != '\n':
                i += 1
            continue

        # Multi-line comment
        if ch == '/' and nxt == '*':
            i += 2
            while i < n and not (code[i] == '*' and i + 1 < n and code[i + 1] == '/'):
                i += 1
            i += 2
            out.append(' ')
            continue

        # String literal
        if ch in ("'", '"'):
            quote = ch
            out.append(ch)
            i += 1
            while i < n:
                if code[i] == '\\':
                    out.append(code[i:i + 2])
                    i += 2
                    continue
                out.append(code[i])
                if code[i] == quote:
                    i += 1
                    break
                i += 1
            last_sig = 'str'
            continue

        # Template literal
        if ch == '`':
            in_template = True
            out.append(ch)
            i += 1
            continue

        # Regex literal heuristic
        if ch == '/' and last_sig in ('', '(', '[', '{', ',', ';', ':', '=', '!', '?', '&', '|', 'return', 'op'):
            j = i + 1
            in_class = False
            closed = False
            while j < n and code[j] != '\n':
                if code[j] == '\\':
                    j += 2
                    continue
                if code[j] == '[':
                    in_class = True
                elif code[j] == ']':
                    in_class = False
                elif code[j] == '/' and not in_class:
                    closed = True
                    j += 1
                    while j < n and code[j].isalpha():
                        j += 1
                    break
                j += 1
            if closed:
                out.append(code[i:j])
                last_sig = 're'
                i = j
                continue

        if ch in '([{':
            brace_stack.append(ch)
            out.append(ch)
            last_sig = ch
            i += 1
            continue

        if ch in ')]}':
            if brace_stack:
                top = brace_stack.pop()
                if ch == '}' and top == '${':
                    in_template = True
                    out.append('}')
                    last_sig = ')'
                    i += 1
                    continue
            out.append(ch)
            last_sig = ch
            i += 1
            continue

        if ch.isalpha() or ch in '_$':
            start = i
            while i < n and (code[i].isalnum() or code[i] in '_$'):
                i += 1
            ident = code[start:i]
            out.append(ident)
            last_sig = 'return' if ident == 'return' else 'id'
            continue

        if ch.isdigit():
            start = i
            while i < n and (code[i].isalnum() or code[i] == '.'):
                i += 1
            out.append(code[start:i])
            last_sig = 'num'
            continue

        out.append(ch)
        if not ch.isspace():
            last_sig = ch if ch in ',;:=!?&|' else 'op'
        i += 1

    # Trim trailing spaces and collapse empty lines while preserving newlines for safe ASI
    lines = []
    for raw_line in ''.join(out).splitlines():
        stripped = raw_line.strip()
        if stripped:
            lines.append(stripped)
    return '\n'.join(lines)


def minify_css_safely(css: str) -> str:
    """安全移除 CSS 注释与多余空白。"""
    css = re.sub(r'/\*[\s\S]*?\*/', '', css)
    lines = []
    for line in css.splitlines():
        s = line.strip()
        if s:
            lines.append(s)
    return '\n'.join(lines)


def build_taptap_bundle(project_root: str, out_zip: str, folder_name: str = 'curio-box') -> dict:
    index_path = os.path.join(project_root, 'index.html')
    css_path = os.path.join(project_root, 'style.css')

    with open(index_path, 'r', encoding='utf-8') as f:
        html = f.read()
    with open(css_path, 'r', encoding='utf-8') as f:
        css = f.read()

    script_pattern = re.compile(r'^[ \t]*<script\s+src="(\./src/[^"]+\.js)"\s*></script>[ \t]*$', re.MULTILINE)
    script_srcs = script_pattern.findall(html)
    if not script_srcs:
        raise RuntimeError('No ./src/*.js script tags found in index.html')

    parts = [
        '/* Curio Box (云海空中花房) - TapTap Release Bundle (Zero-Build Single File) */',
    ]
    total_src_bytes = 0
    for src in script_srcs:
        rel = src.lstrip('./')
        full = os.path.join(project_root, rel)
        with open(full, 'r', encoding='utf-8') as f:
            raw = f.read()
        total_src_bytes += len(raw.encode('utf-8'))
        cleaned = strip_js_comments_safely(raw)
        if not cleaned.endswith(';'):
            cleaned += ';'
        parts.append(cleaned)

    bundle_js = '\n'.join(parts) + '\n'
    bundle_css = minify_css_safely(css) + '\n'

    # Replace the multi-script block in index.html with a single game.bundle.js tag
    first_match = script_pattern.search(html)
    all_matches = list(script_pattern.finditer(html))
    last_match = all_matches[-1]
    bundle_html = (
        html[:first_match.start()]
        + '  <script src="./game.bundle.js"></script>'
        + html[last_match.end():]
    )
    # Remove HTML comments from production index.html
    bundle_html = re.sub(r'<!--[\s\S]*?-->', '', bundle_html)
    bundle_html = re.sub(r'\n{3,}', '\n\n', bundle_html).strip() + '\n'

    os.makedirs(os.path.dirname(os.path.abspath(out_zip)), exist_ok=True)
    with zipfile.ZipFile(out_zip, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        zf.writestr(f'{folder_name}/index.html', bundle_html.encode('utf-8'))
        zf.writestr(f'{folder_name}/style.css', bundle_css.encode('utf-8'))
        zf.writestr(f'{folder_name}/game.bundle.js', bundle_js.encode('utf-8'))

    return {
        'scripts_merged': len(script_srcs),
        'raw_js_bytes': total_src_bytes,
        'bundle_js_bytes': len(bundle_js.encode('utf-8')),
        'bundle_css_bytes': len(bundle_css.encode('utf-8')),
        'bundle_html_bytes': len(bundle_html.encode('utf-8')),
        'zip_bytes': os.path.getsize(out_zip),
    }


def main():
    parser = argparse.ArgumentParser(description='Build Curio Box TapTap single-file bundle ZIP')
    parser.add_argument('--out', default=None, help='Output ZIP path')
    parser.add_argument('--folder', default='curio-box', help='Single top-level folder inside ZIP')
    parser.add_argument('--verify', action='store_true', help='Run verify_release.py after building')
    args = parser.parse_args()

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    out_zip = args.out or os.path.join(project_root, 'dist', 'curio-box-taptap-bundle.zip')
    stats = build_taptap_bundle(project_root, out_zip, folder_name=args.folder)
    print(f"Built TapTap bundle: {out_zip}")
    print(f"  Scripts merged : {stats['scripts_merged']}")
    print(f"  Raw JS total   : {stats['raw_js_bytes']} bytes")
    print(f"  game.bundle.js : {stats['bundle_js_bytes']} bytes")
    print(f"  style.css      : {stats['bundle_css_bytes']} bytes")
    print(f"  index.html     : {stats['bundle_html_bytes']} bytes")
    print(f"  ZIP size       : {stats['zip_bytes']} bytes")
    if args.verify:
        import verify_release
        verify_release.run_verification(project_root, bundle_zip=out_zip)
        print('  Verification   : PASSED (100% clean)')


if __name__ == '__main__':
    main()
