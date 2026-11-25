#!/usr/bin/env python3
"""
Curio Box (云海空中花房) - 自动化发布前防回归与合规校验器 (v9.3)
支持校验源码目录与 TapTap 单文件 Bundle ZIP：
  python tools/verify_release.py
  python tools/verify_release.py --bundle dist/curio-box-taptap-bundle.zip
"""

import argparse
import os
import re
import sys
import zipfile


def verify_js_lexer(label: str, code: str, require_iife: bool = True) -> str:
    i, n = 0, len(code)
    stack = []
    line, col = 1, 1
    in_template = False
    last_sig = ''
    stripped = []

    def advance(k=1):
        nonlocal i, line, col
        for _ in range(k):
            if i < n and code[i] == '\n':
                line += 1
                col = 1
            else:
                col += 1
            i += 1

    while i < n:
        ch = code[i]
        nxt = code[i + 1] if i + 1 < n else ''

        if in_template:
            if ch == '\\':
                advance(2)
                continue
            if ch == '`':
                in_template = False
                stripped.append('""')
                last_sig = 'str'
                advance(1)
                continue
            if ch == '$' and nxt == '{':
                stack.append(('${', line, col))
                in_template = False
                stripped.append('(')
                last_sig = '('
                advance(2)
                continue
            advance(1)
            continue

        if ch == '/' and nxt == '/':
            while i < n and code[i] != '\n':
                advance(1)
            continue

        if ch == '/' and nxt == '*':
            start_l = line
            advance(2)
            closed = False
            while i < n:
                if code[i] == '*' and i + 1 < n and code[i + 1] == '/':
                    advance(2)
                    closed = True
                    break
                advance(1)
            assert closed, f"{label}:{start_l}: Unterminated block comment"
            continue

        if ch in ("'", '"'):
            quote = ch
            start_l = line
            advance(1)
            closed = False
            while i < n:
                if code[i] == '\\':
                    advance(2)
                    continue
                if code[i] == quote:
                    advance(1)
                    closed = True
                    break
                assert code[i] != '\n', f"{label}:{start_l}: Unterminated string literal"
                advance(1)
            assert closed, f"{label}:{start_l}: Unterminated string literal"
            stripped.append('""')
            last_sig = 'str'
            continue

        if ch == '`':
            in_template = True
            advance(1)
            continue

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
                advance(j - i)
                stripped.append('/re/')
                last_sig = 're'
                continue

        if ch in '([{':
            stack.append((ch, line, col))
            stripped.append(ch)
            last_sig = ch
            advance(1)
            continue

        if ch in ')]}':
            assert stack, f"{label}:{line}:{col}: Unexpected closing '{ch}'"
            top, tl, tc = stack.pop()
            if ch == '}' and top == '${':
                in_template = True
                stripped.append(')')
                last_sig = ')'
                advance(1)
                continue
            expected = {'(': ')', '[': ']', '{': '}'}[top]
            assert ch == expected, f"{label}:{line}:{col}: Mismatched '{ch}', expected '{expected}' for '{top}' opened at {tl}:{tc}"
            stripped.append(ch)
            last_sig = ch
            advance(1)
            continue

        if ch.isalpha() or ch in '_$':
            start = i
            while i < n and (code[i].isalnum() or code[i] in '_$'):
                advance(1)
            ident = code[start:i]
            stripped.append(ident)
            last_sig = 'return' if ident == 'return' else 'id'
            continue

        if ch.isdigit():
            start = i
            while i < n and (code[i].isalnum() or code[i] == '.'):
                advance(1)
            stripped.append(code[start:i])
            last_sig = 'num'
            continue

        if not ch.isspace():
            stripped.append(ch)
            last_sig = ch if ch in ',;:=!?&|' else 'op'
        else:
            stripped.append(ch)
        advance(1)

    assert not in_template, f"{label}: Unterminated template literal at EOF"
    assert not stack, f"{label}: Unclosed brackets at EOF: {stack}"
    clean = ''.join(stripped)
    assert not re.search(r'\bimport\s+[\{\*\w"]', clean), f"{label}: ES import detected!"
    assert not re.search(r'\bexport\s+(default|const|let|var|function|class|\{)', clean), f"{label}: ES export detected!"
    if require_iife:
        trimmed = code.strip()
        assert trimmed.startswith('(() => {') and trimmed.endswith('})();'), f"{label}: Not wrapped in IIFE!"
    return clean


def strip_comments(txt: str) -> str:
    txt = re.sub(r'//.*', '', txt)
    txt = re.sub(r'/\*[\s\S]*?\*/', '', txt)
    txt = re.sub(r'<!--[\s\S]*?-->', '', txt)
    return txt


def run_verification(project_root: str, bundle_zip: str = None) -> dict:
    def read_f(rel):
        with open(os.path.join(project_root, rel), 'r', encoding='utf-8') as f:
            return f.read()

    # 1. Script manifest & existence
    html = read_f('index.html')
    script_srcs = re.findall(r'<script\s+src="([^"]+)"', html)
    assert len(script_srcs) >= 17, f"Expected >= 17 scripts, got {len(script_srcs)}"
    for src in script_srcs:
        rel = src.lstrip('./')
        assert os.path.exists(os.path.join(project_root, rel)), f"Missing script: {rel}"

    # 2. Strict JS lexer across all source scripts
    clean_by_file = {}
    raw_by_file = {}
    for src in script_srcs:
        rel = src.lstrip('./')
        raw = read_f(rel)
        raw_by_file[rel] = raw
        clean_by_file[rel] = verify_js_lexer(rel, raw, require_iife=True)

    # 3. DOM ID coverage
    html_ids = set(re.findall(r'\bid="([^"]+)"', html))
    js_dom_ids = set()
    for rel, raw in raw_by_file.items():
        for m in re.finditer(r"getElementById\(\s*['\"]([^'\"]+)['\"]\s*\)", raw):
            js_dom_ids.add(m.group(1))
    missing_ids = js_dom_ids - html_ids
    assert not missing_ids, f"Missing DOM IDs in index.html: {missing_ids}"

    # 4. CB.* module load order & cross-module symbol integrity
    module_exports = {}
    module_load_index = {}
    for idx, src in enumerate(script_srcs):
        rel = src.lstrip('./')
        code = raw_by_file[rel]
        for m in re.finditer(r'CB\.(\w+)\s*=\s*\{', code):
            mod = m.group(1)
            module_load_index[mod] = idx
            start = m.end() - 1
            depth = 0
            end = start
            for k in range(start, len(code)):
                if code[k] == '{':
                    depth += 1
                elif code[k] == '}':
                    depth -= 1
                    if depth == 0:
                        end = k
                        break
            body = code[start + 1:end]
            keys = set()
            d = 0
            buf = []
            for ch in body:
                if ch in '{[(':
                    d += 1
                elif ch in '}])':
                    d -= 1
                elif d == 0:
                    buf.append(ch)
            top = re.sub(r'//.*', '', ''.join(buf))
            for item in top.split(','):
                item = item.strip()
                if not item:
                    continue
                k = item.split(':')[0].strip()
                if re.match(r'^\w+$', k):
                    keys.add(k)
            module_exports[mod] = keys

    for idx, src in enumerate(script_srcs):
        rel = src.lstrip('./')
        code = raw_by_file[rel]
        for m in re.finditer(r'const\s*\{([^}]+)\}\s*=\s*CB\.(\w+);', code):
            props = [p.strip().split(':')[0].strip() for p in m.group(1).split(',') if p.strip()]
            mod = m.group(2)
            assert mod in module_load_index, f"{rel}: references unknown module CB.{mod}"
            assert module_load_index[mod] < idx, f"{rel}: destructures CB.{mod} before load!"
            for p in props:
                assert p in module_exports[mod], f"{rel}: destructures missing export CB.{mod}.{p}"

    for rel, code in clean_by_file.items():
        for m in re.finditer(r'\bCB\.(\w+)\.(\w+)\b', code):
            mod, prop = m.group(1), m.group(2)
            assert mod in module_exports, f"{rel}: unknown module CB.{mod}"
            assert prop in module_exports[mod], f"{rel}: missing property CB.{mod}.{prop}"

    # 4.5. Undeclared ALL_CAPS constant guard across every IIFE module
    std_caps = {'NAN', 'DOM', 'HUD', 'FPS', 'CSS', 'URL', 'API', 'IOS', 'MAX', 'MIN', 'RGB', 'HSL', 'SVG', 'PNG', 'JPG', 'EOF', 'UTF', 'JSON', 'HTML', 'PI', 'LN2', 'SQRT2', 'HP', 'AI', 'UI', 'FX', 'ID', 'XP', 'OK', 'MS', 'PX', 'PC', 'CB', 'IIFE'}
    for rel, clean in clean_by_file.items():
        declared = set(re.findall(r'\b(?:const|let|var|function)\s+([A-Z][A-Z0-9_]{2,})\b', clean))
        for m in re.finditer(r'\b(?:const|let|var)\s*\{([^}]+)\}\s*=', clean):
            for tok in re.findall(r'\b([A-Z][A-Z0-9_]{2,})\b', m.group(1)):
                declared.add(tok)
        for m in re.finditer(r'(?<![.\w$])([A-Z][A-Z0-9_]{2,})\b(?!\s*:)', clean):
            tok = m.group(1)
            if tok not in declared and tok not in std_caps:
                raise AssertionError(f"{rel}: Undeclared ALL_CAPS identifier '{tok}'!")

    # 5. Data Registry Referential Integrity (stages.js <-> extraction.js <-> guards.js)
    stages_src = raw_by_file['src/world/stages.js']
    ext_src = raw_by_file['src/systems/extraction.js']
    guards_src = raw_by_file['src/entities/guards.js']

    defined_curios = set(re.findall(r"^\s+id:\s*'([a-z0-9_]+)',\s*$", ext_src, re.MULTILINE))
    defined_guards = set(re.findall(r"^\s{4}([a-z0-9_]+):\s*\{\s*$", guards_src, re.MULTILINE))
    defined_climates = set(re.findall(r"^\s{4}([a-z0-9_]+):\s*\{\s*\n\s+id:\s*'\1'", stages_src, re.MULTILINE))

    for pool_name in ('curioPool', 'grandCurioIds'):
        for m in re.finditer(rf"{pool_name}:\s*\[([^\]]+)\]", stages_src):
            for cid in re.findall(r"'([a-z0-9_]+)'", m.group(1)):
                assert cid in defined_curios, f"stages.js {pool_name} references unknown curio '{cid}'"

    for m in re.finditer(r"starterCurioId:\s*'([a-z0-9_]+)'", stages_src):
        assert m.group(1) in defined_curios, f"stages.js starterCurioId references unknown curio '{m.group(1)}'"

    for m in re.finditer(r"guardPool:\s*\[([^\]]+)\]", stages_src):
        for gid in re.findall(r"'([a-z0-9_]+)'", m.group(1)):
            assert gid in defined_guards, f"stages.js guardPool references unknown guard '{gid}'"

    for m in re.finditer(r"vaultElite:\s*'([a-z0-9_]+)'", stages_src):
        assert m.group(1) in defined_guards, f"stages.js vaultElite references unknown guard '{m.group(1)}'"

    for m in re.finditer(r"(?:defaultClimate|climateId):\s*'([a-z0-9_]+)'", stages_src):
        assert m.group(1) in defined_climates, f"stages.js references unknown climate '{m.group(1)}'"

    # 6. TapTap WebView / iOS Compliance & De-Spoiler Audit
    for rel, raw in raw_by_file.items():
        assert not re.search(r'\bctx\.filter\s*=', raw), f"{rel}: forbidden ctx.filter!"
        assert not re.search(r'\b(alert|confirm|prompt|window\.open)\(', raw), f"{rel}: forbidden browser dialog!"
        assert 'https://' not in raw and 'http://' not in raw, f"{rel}: external URL detected!"

    assert 'data-stage=' not in html and 'data-title-stage=' not in html, "Spoiler stage buttons found in index.html!"
    assert not re.search(r'\b0/(?:4|14|10)\b', html), "Spoiler denominator found in index.html!"
    for rel in ('index.html', 'src/render/ui.js', 'src/main.js', 'src/render/renderer.js'):
        nc = strip_comments(read_f(rel))
        hits = re.findall(r'第\s*(?:\d+|\$\{[^}]+\})\s*关', nc)
        assert not hits, f"User-facing stage spoiler in {rel}: {hits}"

    # 7. FPS / GC Hygiene Audit (v9.3 guarantees)
    rd_src = raw_by_file['src/render/renderer.js']
    br_src = raw_by_file['src/render/brush.js']
    pl_src = raw_by_file['src/entities/player.js']
    ui_src = raw_by_file['src/render/ui.js']
    mn_src = raw_by_file['src/main.js']
    ph_src = raw_by_file['src/systems/physicsLab.js']

    assert 'const drawQueue = [];' in rd_src and 'const drawList = [];' not in rd_src, "renderer.js must use zero-closure drawQueue!"
    assert 'visMinX' in rd_src and 'rectVisible' in rd_src, "renderer.js missing viewport frustum culling!"
    assert 'cachedFogKey' in rd_src and 'cachedStaticPuffs' in rd_src, "renderer.js missing cached cloud fog puffs!"
    assert 'map._wormholePairs' in br_src, "brush.js missing cached wormhole pairs!"
    assert 'map._miniBounds' in ui_src, "ui.js missing cached minimap bounds!"
    assert 'lastMinimapTime' in mn_src, "main.js missing minimap throttling!"
    assert 'game.particles.length >= 160' in pl_src, "player.js missing particle pool cap!"
    assert 'game.footprints.length >= 64' in pl_src, "player.js missing footprint pool cap!"
    assert 'game.popups.length >= 24' in pl_src, "player.js missing popup pool cap!"
    assert 'chargedBodiesPool' in ph_src and 'game.lightningArcs.length >= 24' in ph_src, "physicsLab.js missing GC pool hygiene!"

    # 8. Optional TapTap Bundle ZIP Verification
    bundle_info = None
    if bundle_zip:
        with zipfile.ZipFile(bundle_zip, 'r') as zf:
            assert zf.testzip() is None, "Corrupted ZIP!"
            entries = zf.namelist()
            assert entries == ['curio-box/index.html', 'curio-box/style.css', 'curio-box/game.bundle.js'], f"Unexpected bundle entries: {entries}"
            b_html = zf.read('curio-box/index.html').decode('utf-8')
            b_js = zf.read('curio-box/game.bundle.js').decode('utf-8')
            b_scripts = re.findall(r'<script\s+src="([^"]+)"', b_html)
            assert b_scripts == ['./game.bundle.js'], f"Unexpected bundle scripts: {b_scripts}"
            assert './src/' not in b_html, "Leftover ./src/ reference in bundle index.html!"
            verify_js_lexer('game.bundle.js', b_js, require_iife=False)
            iife_cnt = len(re.findall(r'^\(\(\)\s*=>\s*\{', b_js, re.MULTILINE))
            assert iife_cnt == len(script_srcs), f"Expected {len(script_srcs)} IIFEs in bundle, got {iife_cnt}"
            b_html_ids = set(re.findall(r'\bid="([^"]+)"', b_html))
            b_js_ids = set(re.findall(r"getElementById\(\s*['\"]([^'\"]+)['\"]\s*\)", b_js))
            assert not (b_js_ids - b_html_ids), f"Missing bundle DOM IDs: {b_js_ids - b_html_ids}"
            assert not re.search(r'\bctx\.filter\s*=', b_js)
            assert 'https://' not in b_js and 'http://' not in b_js
            bundle_info = {
                'entries': len(entries),
                'iifes': iife_cnt,
                'zip_bytes': os.path.getsize(bundle_zip),
                'bundle_js_bytes': len(b_js.encode('utf-8')),
            }

    return {
        'scripts': len(script_srcs),
        'dom_ids': len(js_dom_ids),
        'modules': len(module_exports),
        'curios_checked': len(defined_curios),
        'guards_checked': len(defined_guards),
        'climates_checked': len(defined_climates),
        'bundle': bundle_info,
    }


def main():
    parser = argparse.ArgumentParser(description='Verify Curio Box release integrity & TapTap compliance')
    parser.add_argument('--bundle', default=None, help='Path to built TapTap bundle ZIP')
    args = parser.parse_args()

    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    res = run_verification(project_root, bundle_zip=args.bundle)
    print("✓ Curio Box v9.3 Automated Release Verification PASSED!")
    print(f"  - JS Modules verified     : {res['scripts']} (IIFE / syntax / zero-ESM)")
    print(f"  - CB.* Namespaces checked : {res['modules']} (load order & symbols 100%)")
    print(f"  - DOM IDs matched         : {res['dom_ids']}/{res['dom_ids']}")
    print(f"  - Data registries checked : {res['climates_checked']} climates, {res['curios_checked']} curios, {res['guards_checked']} guard specs")
    print("  - TapTap & De-Spoiler     : 100% PASSED")
    print("  - FPS / GC Hygiene Audit  : 100% PASSED")
    if res['bundle']:
        b = res['bundle']
        print(f"  - TapTap Bundle ZIP       : {b['iifes']} IIFEs merged, {b['zip_bytes']} bytes, 3 entries OK")


if __name__ == '__main__':
    main()
