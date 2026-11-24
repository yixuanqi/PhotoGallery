#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Zero-dependency static verifier for Ashen Bell Vow v45.3
Checks:
1. JS lexical & bracket syntax across all src/**/*.js
2. ES Module import/export path existence, explicit .js suffix, exact case sensitivity & symbol verification
3. Module dependency cycle detection (DFS)
4. SoundEngine audio.*() method existence check
5. HTML <script src> entry integrity (index.html, editor.html)
6. Rooms JSON graph, stamps registry, vertical drop river check & en-US inscription coverage
7. Launcher script integrity (Python AST + start_game.bat pure ASCII & CRLF check)
8. Oversized JS module line-count monitor
9. v34.0 1x Echo economy balance audit (income vs sinks & compact [4600, 5500] target window)
10. v34.0 Relic essence refinement (+1) full 11-relic & bilingual coverage check
11. v34.0 Bilingual UI dictionary (zh-CN / en-US) key parity check
12. v35.0 Visual Bell-Vein Skill Tree, Action Preview, Relic Synergy Constellation & Save v35 checks
Run from project root:  python verify_project.py
"""
import ast
import glob
import json
import os
import re
import sys
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LARGE_MODULE_WARN_LINES = 1650
REGEX_BEFORE_KW = {
    'return', 'case', 'throw', 'in', 'of', 'typeof', 'void', 'delete',
    'new', 'do', 'else', 'yield', 'await'
}


def tokenize_js(code, filename):
    tokens, errors = [], []
    i, n = 0, len(code)
    line, col = 1, 1
    tmpl_stack = []
    brace_depth = 0

    def can_start_regex():
        if not tokens:
            return True
        t, v, _, _ = tokens[-1]
        if t == 'PUNC' and v in '([{;,?:}':
            return True
        if t == 'OP' and v not in ('++', '--'):
            return True
        return t == 'IDENT' and v in REGEX_BEFORE_KW

    while i < n:
        ch = code[i]
        if ch in ' \t\r':
            i += 1; col += 1; continue
        if ch == '\n':
            i += 1; line += 1; col = 1; continue
        if ch == '/' and i + 1 < n and code[i + 1] == '/':
            i += 2; col += 2
            while i < n and code[i] != '\n':
                i += 1; col += 1
            continue
        if ch == '/' and i + 1 < n and code[i + 1] == '*':
            sl, sc = line, col
            i += 2; col += 2
            closed = False
            while i + 1 < n:
                if code[i] == '*' and code[i + 1] == '/':
                    i += 2; col += 2; closed = True; break
                if code[i] == '\n':
                    line += 1; col = 1; i += 1
                else:
                    i += 1; col += 1
            if not closed:
                errors.append(f"{filename}:{sl}:{sc}: Unterminated block comment")
                break
            continue
        if ch in ('"', "'"):
            q = ch; sl, sc = line, col
            i += 1; col += 1
            buf = [q]; closed = False
            while i < n:
                c = code[i]
                if c == '\\':
                    buf.append(code[i:i + 2])
                    if i + 1 < n and code[i + 1] == '\n':
                        line += 1; col = 1
                    else:
                        col += 2
                    i += 2; continue
                if c == '\n':
                    errors.append(f"{filename}:{sl}:{sc}: Unterminated string ({q})")
                    break
                buf.append(c); i += 1; col += 1
                if c == q:
                    closed = True; break
            if not closed and i >= n:
                errors.append(f"{filename}:{sl}:{sc}: Unterminated string at EOF")
            tokens.append(('STR', ''.join(buf), sl, sc))
            continue
        if ch == '`':
            sl, sc = line, col; i += 1; col += 1; closed = False
            while i < n:
                c = code[i]
                if c == '\\':
                    if i + 1 < n and code[i + 1] == '\n':
                        line += 1; col = 1
                    else:
                        col += 2
                    i += 2; continue
                if c == '$' and i + 1 < n and code[i + 1] == '{':
                    tokens.append(('TMPL_START', '`...${', sl, sc))
                    tmpl_stack.append(brace_depth)
                    brace_depth += 1
                    tokens.append(('PUNC', '{', line, col + 1))
                    i += 2; col += 2; closed = True; break
                if c == '`':
                    tokens.append(('TMPL', '`...`', sl, sc))
                    i += 1; col += 1; closed = True; break
                if c == '\n':
                    line += 1; col = 1; i += 1
                else:
                    i += 1; col += 1
            if not closed:
                errors.append(f"{filename}:{sl}:{sc}: Unterminated template literal")
            continue
        if ch == '}' and tmpl_stack and brace_depth - 1 == tmpl_stack[-1]:
            brace_depth -= 1; tmpl_stack.pop()
            tokens.append(('PUNC', '}', line, col))
            sl, sc = line, col; i += 1; col += 1; closed = False
            while i < n:
                c = code[i]
                if c == '\\':
                    if i + 1 < n and code[i + 1] == '\n':
                        line += 1; col = 1
                    else:
                        col += 2
                    i += 2; continue
                if c == '$' and i + 1 < n and code[i + 1] == '{':
                    tokens.append(('TMPL_MID', '}...${', sl, sc))
                    tmpl_stack.append(brace_depth)
                    brace_depth += 1
                    tokens.append(('PUNC', '{', line, col + 1))
                    i += 2; col += 2; closed = True; break
                if c == '`':
                    tokens.append(('TMPL_END', '}...`', sl, sc))
                    i += 1; col += 1; closed = True; break
                if c == '\n':
                    line += 1; col = 1; i += 1
                else:
                    i += 1; col += 1
            if not closed:
                errors.append(f"{filename}:{sl}:{sc}: Unterminated template literal continuation")
            continue
        if ch == '/' and can_start_regex():
            sl, sc = line, col; j = i + 1; in_cls = False; ok = False
            while j < n:
                c = code[j]
                if c == '\n':
                    break
                if c == '\\':
                    j += 2; continue
                if c == '[':
                    in_cls = True
                elif c == ']':
                    in_cls = False
                elif c == '/' and not in_cls:
                    j += 1
                    while j < n and code[j].isalpha():
                        j += 1
                    ok = True; break
                j += 1
            if ok:
                tokens.append(('REGEX', code[i:j], sl, sc))
                col += (j - i); i = j; continue
        if ch.isalpha() or ch in '_$':
            sl, sc = line, col; j = i + 1
            while j < n and (code[j].isalnum() or code[j] in '_$'):
                j += 1
            tokens.append(('IDENT', code[i:j], sl, sc))
            col += (j - i); i = j; continue
        if ch.isdigit() or (ch == '.' and i + 1 < n and code[i + 1].isdigit()):
            sl, sc = line, col; j = i + 1
            while j < n and (code[j].isalnum() or code[j] in '._'):
                j += 1
            tokens.append(('NUM', code[i:j], sl, sc))
            col += (j - i); i = j; continue
        if ch in '()[]{},;:?':
            if ch == '{':
                brace_depth += 1
            elif ch == '}':
                brace_depth -= 1
            tokens.append(('PUNC', ch, line, col))
            i += 1; col += 1; continue
        matched_op = None
        for op in (
            '>>>=', '===', '!==', '>>>', '<<=', '>>=', '**=', '&&=', '||=', '??=',
            '...', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '++', '--',
            '<<', '>>', '**', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '?.'
        ):
            if code.startswith(op, i):
                matched_op = op; break
        if matched_op:
            tokens.append(('OP', matched_op, line, col))
            i += len(matched_op); col += len(matched_op); continue
        tokens.append(('OP', ch, line, col))
        i += 1; col += 1
    return tokens, errors


def check_exact_case(rel_path):
    cur = BASE_DIR
    for part in rel_path.split('/'):
        if not os.path.isdir(cur):
            return False
        entries = os.listdir(cur)
        if part not in entries:
            return False
        cur = os.path.join(cur, part)
    return True


def detect_cycles(graph):
    state = {}  # 0=unvisited, 1=visiting, 2=done
    stack = []
    cycles = []
    seen_sigs = set()

    def dfs(u):
        state[u] = 1
        stack.append(u)
        for v in graph.get(u, []):
            st = state.get(v, 0)
            if st == 1:
                idx = stack.index(v)
                cyc = stack[idx:] + [v]
                sig = tuple(sorted(cyc[:-1]))
                if sig not in seen_sigs:
                    seen_sigs.add(sig)
                    cycles.append(cyc)
            elif st == 0:
                dfs(v)
        stack.pop()
        state[u] = 2

    for node in sorted(graph.keys()):
        if state.get(node, 0) == 0:
            dfs(node)
    return cycles


def check_js_modules():
    errors, warnings = [], []
    js_paths = sorted(glob.glob(os.path.join(BASE_DIR, 'src', '**', '*.js'), recursive=True))
    file_exports = {}
    file_imports = {}
    file_texts = {}
    line_counts = []

    for fp in js_paths:
        rel = os.path.relpath(fp, BASE_DIR).replace('\\', '/')
        with open(fp, 'r', encoding='utf-8') as f:
            code = f.read()
        file_texts[rel] = code
        line_counts.append((len(code.splitlines()), rel))
        tokens, lex_errs = tokenize_js(code, rel)
        errors.extend(lex_errs)

        stack, pairs = [], {')': '(', ']': '[', '}': '{'}
        depth_at, brace_d = [], 0
        for t, v, ln, cl in tokens:
            depth_at.append(brace_d)
            if t == 'PUNC' and v in '([{':
                stack.append((v, ln, cl))
                if v == '{':
                    brace_d += 1
            elif t == 'PUNC' and v in ')]}':
                if v == '}':
                    brace_d -= 1
                if not stack or stack[-1][0] != pairs[v]:
                    errors.append(f"{rel}:{ln}:{cl}: Mismatched closing '{v}'")
                else:
                    stack.pop()
        for v, ln, cl in stack:
            errors.append(f"{rel}:{ln}:{cl}: Unclosed '{v}'")

        # Missing comma / adjacent literal guard (catches JS object/array literal SyntaxErrors)
        nt_c = len(tokens)
        for ti in range(nt_c - 1):
            t0, v0, ln0, _ = tokens[ti]
            t1, v1, ln1, _ = tokens[ti + 1]
            if t0 == 'PUNC' and v0 == '}' and t1 == 'PUNC' and v1 == '{':
                errors.append(f"{rel}:{ln0}->{ln1}: Missing comma between '}}' and '{{'")
            elif t0 == 'STR' and t1 == 'STR':
                errors.append(f"{rel}:{ln0}->{ln1}: Adjacent string literals without comma/operator")
            elif ti + 2 < nt_c:
                t2, v2, ln2, _ = tokens[ti + 2]
                if t2 == 'PUNC' and v2 == ':' and t1 in ('IDENT', 'STR') and ln1 > ln0:
                    if (t1 == 'IDENT' and v1 == 'default') or (t0 == 'IDENT' and v0 == 'case'):
                        continue
                    if t0 in ('STR', 'NUM', 'TMPL', 'TMPL_END') or (t0 == 'IDENT' and v0 in ('true', 'false', 'null')) or (t0 == 'PUNC' and v0 == ']'):
                        same_line_q = False
                        kk = ti - 1
                        while kk >= 0 and tokens[kk][2] == ln0:
                            if tokens[kk][1] == '?':
                                same_line_q = True
                                break
                            kk -= 1
                        if not same_line_q:
                            errors.append(f"{rel}:{ln0}->{ln1}: Missing comma after '{v0}' before '{v1}:'")

        exports, imports = set(), []
        i, nt = 0, len(tokens)
        while i < nt:
            t, v, ln, cl = tokens[i]
            is_prop = (i > 0 and tokens[i - 1][0] == 'OP' and tokens[i - 1][1] in ('.', '?.'))
            is_key = (i + 1 < nt and tokens[i + 1][0] == 'PUNC' and tokens[i + 1][1] == ':')
            if t == 'IDENT' and v == 'export' and not is_prop and not is_key:
                if depth_at[i] != 0:
                    errors.append(f"{rel}:{ln}:{cl}: 'export' at brace depth {depth_at[i]}")
                if i + 1 >= nt:
                    errors.append(f"{rel}:{ln}:{cl}: Bare 'export' at EOF")
                    break
                nt_t, nt_v, nt_ln, _ = tokens[i + 1]
                if nt_t == 'IDENT' and nt_v == 'default':
                    exports.add('default')
                elif nt_t == 'IDENT' and nt_v in ('function', 'class'):
                    k = i + 2 + (1 if i + 2 < nt and tokens[i + 2][1] == '*' else 0)
                    if k < nt and tokens[k][0] == 'IDENT':
                        exports.add(tokens[k][1])
                    else:
                        errors.append(f"{rel}:{ln}:{cl}: Unexpected token after 'export {nt_v}'")
                elif nt_t == 'IDENT' and nt_v == 'async':
                    if i + 3 < nt and tokens[i + 2][1] == 'function' and tokens[i + 3][0] == 'IDENT':
                        exports.add(tokens[i + 3][1])
                    else:
                        errors.append(f"{rel}:{ln}:{cl}: Unexpected token after 'export async'")
                elif nt_t == 'IDENT' and nt_v in ('const', 'let', 'var'):
                    if i + 2 < nt and tokens[i + 2][0] == 'IDENT':
                        exports.add(tokens[i + 2][1])
                    elif not (i + 2 < nt and tokens[i + 2][1] in ('{', '[')):
                        errors.append(f"{rel}:{ln}:{cl}: Unexpected token after 'export {nt_v}'")
                elif nt_t == 'PUNC' and nt_v == '{':
                    k = i + 2
                    cur, groups = [], []
                    while k < nt and tokens[k][1] != '}':
                        if tokens[k][1] == ',':
                            if cur:
                                groups.append(cur); cur = []
                        else:
                            cur.append(tokens[k])
                        k += 1
                    if cur:
                        groups.append(cur)
                    for g in groups:
                        if len(g) == 1:
                            exports.add(g[0][1])
                        elif len(g) == 3 and g[1][1] == 'as':
                            exports.add(g[2][1])
                    if k + 2 < nt and tokens[k + 1][1] == 'from' and tokens[k + 2][0] == 'STR':
                        imports.append((ln, tokens[k + 2][1][1:-1], [g[0][1] for g in groups]))
                elif nt_t == 'OP' and nt_v == '*':
                    if i + 3 < nt and tokens[i + 2][1] == 'from' and tokens[i + 3][0] == 'STR':
                        src = tokens[i + 3][1][1:-1]
                        imports.append((ln, src, ['*']))
                        exports.add('*:' + src)
                else:
                    errors.append(f"{rel}:{ln}:{cl}: Invalid token after 'export': '{nt_v}' at line {nt_ln}")
            elif t == 'IDENT' and v == 'import' and not is_prop and not is_key:
                if i + 1 < nt and tokens[i + 1][1] in ('(', '.'):
                    i += 1; continue
                if depth_at[i] != 0:
                    errors.append(f"{rel}:{ln}:{cl}: 'import' at brace depth {depth_at[i]}")
                k = i + 1
                if k < nt and tokens[k][0] == 'STR':
                    imports.append((ln, tokens[k][1][1:-1], []))
                else:
                    imp_names = []
                    while k < nt and not (tokens[k][0] == 'IDENT' and tokens[k][1] == 'from'):
                        if tokens[k][1] == '{':
                            k += 1; cur = []
                            while k < nt and tokens[k][1] != '}':
                                if tokens[k][1] == ',':
                                    if cur:
                                        imp_names.append(cur[0][1]); cur = []
                                else:
                                    cur.append(tokens[k])
                                k += 1
                            if cur:
                                imp_names.append(cur[0][1])
                        elif tokens[k][1] == '*':
                            imp_names.append('*'); k += 2
                        elif tokens[k][0] == 'IDENT':
                            imp_names.append('default')
                        k += 1
                    if k + 1 < nt and tokens[k][1] == 'from' and tokens[k + 1][0] == 'STR':
                        imports.append((ln, tokens[k + 1][1][1:-1], imp_names))
                    else:
                        errors.append(f"{rel}:{ln}:{cl}: Malformed import statement")
            i += 1
        file_exports[rel] = exports
        file_imports[rel] = imports

    def get_all_exports(rel, seen=None):
        seen = seen or set()
        if rel in seen:
            return set()
        seen.add(rel)
        res = set()
        for item in file_exports.get(rel, set()):
            if item.startswith('*:'):
                tgt = os.path.normpath(os.path.join(os.path.dirname(rel), item[2:].split('?')[0])).replace('\\', '/')
                res |= get_all_exports(tgt, seen)
            else:
                res.add(item)
        return res

    dep_graph = defaultdict(list)
    for rel, imps in sorted(file_imports.items()):
        for ln, src, names in imps:
            clean_src = src.split('?')[0]
            if clean_src.startswith('.') and not clean_src.endswith('.js'):
                errors.append(f"{rel}:{ln}: Relative ESM import '{src}' missing explicit .js suffix")
            tgt = os.path.normpath(os.path.join(os.path.dirname(rel), clean_src)).replace('\\', '/')
            if tgt not in file_texts:
                errors.append(f"{rel}:{ln}: Missing imported file '{tgt}'")
                continue
            if not check_exact_case(tgt):
                errors.append(f"{rel}:{ln}: Case mismatch on import '{tgt}'")
            dep_graph[rel].append(tgt)
            tgt_exp = get_all_exports(tgt)
            for nm in names:
                if nm != '*' and nm not in tgt_exp:
                    errors.append(f"{rel}:{ln}: Symbol '{nm}' not exported by '{tgt}'")

    # Circular dependency check
    cycles = detect_cycles(dep_graph)
    for cyc in cycles:
        errors.append("Circular module dependency detected: " + " -> ".join(cyc))

    # Check audio.*() method calls against SoundEngine
    audio_code = file_texts.get('src/audio.js', '')
    audio_methods = set(re.findall(r'^\s+(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(', audio_code, re.MULTILINE))
    for rel, code in sorted(file_texts.items()):
        for m in re.finditer(r'\baudio\.([A-Za-z_$][\w$]*)\s*\(', code):
            if m.group(1) not in audio_methods:
                ln = code[:m.start()].count('\n') + 1
                errors.append(f"{rel}:{ln}: Undefined SoundEngine method audio.{m.group(1)}()")

    # Check HTML entry scripts
    for html_name in ('index.html', 'editor.html'):
        hp = os.path.join(BASE_DIR, html_name)
        if not os.path.isfile(hp):
            continue
        html_txt = open(hp, 'r', encoding='utf-8').read()
        for m in re.finditer(r'<script[^>]+src=["\']([^"\']+)["\']', html_txt):
            src = m.group(1).split('?')[0]
            if src.startswith(('http://', 'https://', '//')):
                continue
            tgt = os.path.normpath(src).replace('\\', '/')
            if not os.path.isfile(os.path.join(BASE_DIR, tgt)):
                errors.append(f"{html_name}: Missing script entry '{src}'")

    line_counts.sort(reverse=True)
    return len(js_paths), file_texts, line_counts, len(cycles), errors, warnings


def check_rooms_and_locales(file_texts):
    errors, warnings = [], []
    world_path = os.path.join(BASE_DIR, 'data', 'world.json')
    with open(world_path, 'r', encoding='utf-8') as f:
        world = json.load(f)

    atlas_code = file_texts.get('src/stampAtlas.js', '')
    registered_stamps = set(re.findall(r"\{\s*id:\s*'([^']+)'", atlas_code))
    world_en = file_texts.get('src/locales/world.js', '')

    rooms = {}
    for entry in world.get('rooms', []):
        rpath = os.path.join(BASE_DIR, entry['file'].lstrip('./'))
        if not os.path.isfile(rpath):
            errors.append(f"world.json: Missing room file '{entry['file']}'")
            continue
        with open(rpath, 'r', encoding='utf-8') as f:
            rm = json.load(f)
        rooms[rm['id']] = rm

    for rid, rm in rooms.items():
        b = rm['bounds']
        for cid in rm.get('connections', []):
            if cid not in rooms:
                errors.append(f"{rid}: Invalid connection target '{cid}'")
            elif rid not in rooms[cid].get('connections', []):
                warnings.append(f"{rid}: One-way connection to '{cid}'")

        for st in (rm.get('props', {}).get('stamps') or []):
            if st.get('type') not in registered_stamps:
                errors.append(f"{rid}: Unregistered stamp type '{st.get('type')}'")

        below = [rooms[c] for c in rm.get('connections', []) if c in rooms and abs(rooms[c]['bounds']['y'] - (b['y'] + b['h'])) <= 24]
        for rv in rm.get('rivers', []):
            rx0, rx1 = b['x'] + rv['x'], b['x'] + rv['x'] + rv.get('w', 0)
            ry = b['y'] + rv['y']
            if ry >= b['y'] + b['h'] - 190:
                for br in below:
                    ob = br['bounds']
                    ov0, ov1 = max(rx0, ob['x']), min(rx1, ob['x'] + ob['w'])
                    if ov1 - ov0 > 40:
                        covered_by_ceiling = any(
                            s.get('y', 999) <= 20 and (ob['x'] + s['x']) <= ov0 + 8 and (ob['x'] + s['x'] + s['w']) >= ov1 - 8
                            for s in br.get('solids', [])
                        )
                        if not covered_by_ceiling:
                            errors.append(f"{rid}: River '{rv.get('id')}' blocks vertical drop into '{br['id']}'")

        for ins in rm.get('inscriptions', []):
            txt = ins.get('text', '')
            if txt and not ins.get('dynamicKey'):
                if f"'{txt}'" not in world_en and f'"{txt}"' not in world_en:
                    warnings.append(f"{rid}: Missing en-US inscription translation: {txt}")

    return len(rooms), len(registered_stamps), errors, warnings


def check_launchers_and_python():
    errors = []
    for pyf in sorted(glob.glob(os.path.join(BASE_DIR, '*.py'))):
        with open(pyf, 'r', encoding='utf-8') as f:
            try:
                ast.parse(f.read(), filename=pyf)
            except SyntaxError as exc:
                errors.append(f"{os.path.basename(pyf)}: {exc}")

    bat_path = os.path.join(BASE_DIR, 'start_game.bat')
    if os.path.isfile(bat_path):
        raw = open(bat_path, 'rb').read()
        try:
            raw.decode('ascii')
        except UnicodeDecodeError:
            errors.append("start_game.bat: Contains non-ASCII bytes (breaks Chinese Windows cmd.exe)")
        if b'\n' in raw and b'\r\n' not in raw:
            errors.append("start_game.bat: Uses LF instead of CRLF line endings")
    return errors



def check_v34_economy_relics_i18n(file_texts):
    errors, warnings = [], []
    cfg = file_texts.get('src/config.js', '')
    modals = file_texts.get('src/ui/modalsUi.js', '')
    ui_loc = file_texts.get('src/locales/ui.js', '')
    ent_loc = file_texts.get('src/locales/entities.js', '')
    editor_code = file_texts.get('src/editor.js', '')
    save_code = file_texts.get('src/save.js', '')

    # 9. Echo Economy Balance Audit
    m_rew = re.search(r'export const ENEMY_ECHO_REWARDS\s*=\s*\{([^}]+)\}', cfg)
    rewards = {}
    if m_rew:
        for k, v in re.findall(r'([A-Za-z0-9_]+)\s*:\s*(\d+)', m_rew.group(1)):
            rewards[k] = int(v)
    else:
        errors.append("src/config.js: Could not parse ENEMY_ECHO_REWARDS")

    m_ref_cost = re.search(r'export const RELIC_REFINE_COST\s*=\s*(\d+)', cfg)
    refine_cost = int(m_ref_cost.group(1)) if m_ref_cost else 0
    if refine_cost != 450:
        errors.append(f"src/config.js: Expected RELIC_REFINE_COST = 450, found {refine_cost}")

    smith_total = 0
    m_smith = re.search(r'export const SMITH_UPGRADES\s*=\s*\[(.*?)\];', cfg, re.S)
    if m_smith:
        for arr_txt in re.findall(r'costs\s*:\s*\[([^\]]+)\]', m_smith.group(1)):
            smith_total += sum(int(x) for x in re.findall(r'\d+', arr_txt))

    reg_echo = 0
    reg_cnt = 0
    warden_echo = 0
    cache_echo = 0
    other_pickup_echo = 0
    realm_seals = set()
    sky_gates = 0
    world_path = os.path.join(BASE_DIR, 'data', 'world.json')
    with open(world_path, 'r', encoding='utf-8') as f:
        world = json.load(f)
    for entry in world.get('rooms', []):
        rpath = os.path.join(BASE_DIR, entry['file'].lstrip('./'))
        if not os.path.isfile(rpath):
            continue
        with open(rpath, 'r', encoding='utf-8') as f:
            rm = json.load(f)
        for e in rm.get('enemies', []):
            k = e.get('kind', '')
            if k == 'dummy':
                continue
            r = rewards.get(k, 0)
            if k.startswith('warden_'):
                warden_echo += r
            else:
                reg_echo += r
                reg_cnt += 1
        for pk in rm.get('pickups', []):
            amt = int(pk.get('echoAmount') or 0)
            if amt > 0:
                if pk.get('kind') == 'echoCache':
                    cache_echo += amt
                else:
                    other_pickup_echo += amt
            if pk.get('kind') == 'realmSeal' and pk.get('sealId'):
                realm_seals.add(pk['sealId'])
        for g in rm.get('gates', []):
            if g.get('role') == 'skyBridge' or g.get('id') == 'gate_sky_bridge':
                sky_gates += 1

    boss_echo = sum(rewards.get(k, 0) for k in ('boss', 'boss2', 'boss3', 'boss4'))
    npc_echo = sum(int(x) for x in re.findall(r'G\.worldState\.echoes\s*=\s*\(G\.worldState\.echoes\s*\|\|\s*0\)\s*\+\s*(\d+);', modals))
    total_1x = reg_echo + warden_echo + boss_echo + cache_echo + other_pickup_echo + npc_echo
    # True sink accounting: Smith(2180) + Traits(140*3 or *6) + SkillNodes(180+220) + Scavenger(160+120) + Mochen/Xi(120+80) + Relics(450*3 or *12)
    core_sink = smith_total + 140 * 3 + 180 + 220 + 280 + refine_cost * 3
    full_sink = smith_total + 140 * 6 + 180 + 220 + 280 + 200 + refine_cost * 12

    if not (5200 <= total_1x <= 7200):
        errors.append(f"Economy: 1x total income {total_1x} outside v38.0 25-room range [5200, 7200]")
    if realm_seals != {'wind', 'forest', 'mountain'}:
        errors.append(f"Rooms: Incomplete realmSeal set {sorted(realm_seals)}")
    if sky_gates < 1:
        errors.append("Rooms: Missing skyBridge gate")

    # 10. Relic Essence Refinement (+1) Coverage Check
    m_relics = re.search(r'export const RELICS\s*=\s*\[(.*?)\n\];', cfg, re.S)
    relic_ids = []
    refined_count = 0
    if m_relics:
        r_body = m_relics.group(1)
        relic_ids = re.findall(r"^\s+id:\s*'([^']+)'", r_body, re.M)
        refined_count = len(re.findall(r'^\s+refined:\s*\{', r_body, re.M))
    if len(relic_ids) != 12 or refined_count != len(relic_ids):
        errors.append(f"Relics: Expected 12 relics all with refined blocks, found {len(relic_ids)} relics / {refined_count} refined")
    if 'updateDrowned' not in file_texts.get('src/ai/enemiesAi.js', '') or 'updateAnchorite' not in file_texts.get('src/ai/enemiesAi.js', ''):
        errors.append("v42.0: Missing cistern exclusive enemies drowned/anchorite AI")
    if 'sunken_bell_giant' not in file_texts.get('src/stampAtlas.js', '') or 'tidebell' not in cfg:
        errors.append("v42.0: Missing cistern stamps or tidebell relic")
    for split_mod in ('src/locales/uiZh.js', 'src/locales/uiEn.js', 'src/audioSfxBank.js', 'src/worldCamera.js', 'src/render/worldBackdropRenderer.js'):
        if split_mod not in file_texts:
            errors.append(f"v43.0: Missing modular split file '{split_mod}'")
    if 'cycleOverlayTab' not in file_texts.get('src/uiNav.js', '') or 'scrollOverlay' not in file_texts.get('src/uiNav.js', ''):
        errors.append("v43.0: Missing full gamepad tab-cycling / scrolling in src/uiNav.js")
    if '__ABV_OFFLINE_WORLD__' not in file_texts.get('src/levelLoader.js', ''):
        errors.append("v45.3: Missing offline pre-bundled world fast-path in src/levelLoader.js")
    if not os.path.isfile(os.path.join(BASE_DIR, 'tools', 'build_release.py')):
        errors.append("v45.3: Missing tools/build_release.py offline release builder")
    for pwa_f in ('manifest.webmanifest', 'sw.js', 'icon.svg', 'icon-192.png', 'icon-512.png'):
        if not os.path.isfile(os.path.join(BASE_DIR, pwa_f)):
            errors.append(f"v45.3: Missing PWA asset '{pwa_f}'")
    if 'keepAliveResume' not in file_texts.get('src/audio.js', '') or 'mobileEcoMode' not in file_texts.get('src/state.js', ''):
        errors.append("v45.3: Missing audio keepAliveResume or mobileEcoMode implementation")
    if 'auxBtn' in file_texts.get('src/main.js', '') or 'auxWrap' in file_texts.get('src/main.js', ''):
        errors.append("v45.3: Stale undeclared reference to removed auxBtn/auxWrap in src/main.js")
    if 'tickBossGreedPressure' not in file_texts.get('src/ai/bossesAi.js', '') or 'tickWardenGreedPressure' not in file_texts.get('src/ai/wardensAi.js', ''):
        errors.append("v45.3: Missing anti-facetank greed punish in bossesAi.js / wardensAi.js")
    if 'bulwarkCd' not in file_texts.get('src/combat/damageCombat.js', '') or 'cistern:' not in file_texts.get('src/locales/world.js', ''):
        errors.append("v45.3: Missing iron_bulwark cooldown or cistern English biome ambience")
    if 'dashAttack' not in file_texts.get('src/weapons.js', '') or 'getAttackPose' not in file_texts.get('src/render/playerRenderer.js', ''):
        errors.append("v45.3: Missing dashAttack moveset or articulated playerRenderer attack poses")
    for v451_mod in ('src/render/wardenRenderer.js', 'src/ai/biomeEnemiesAi.js', 'src/render/exoticEnemyRenderer.js', 'src/ai/exoticEnemiesAi.js'):
        if v451_mod not in file_texts:
            errors.append(f"v45.3: Missing modular split file '{v451_mod}'")

    en_refined_count = len(re.findall(r"^\s+refinedEffect:\s*'", ent_loc, re.M))
    if en_refined_count != len(relic_ids):
        errors.append(f"Locales: Expected {len(relic_ids)} refinedEffect entries in src/locales/entities.js, found {en_refined_count}")

    # 11. Bilingual UI Dictionary Key Parity (zh-CN vs en-US — v43.0 split uiZh.js / uiEn.js)
    ui_zh_src = file_texts.get('src/locales/uiZh.js', '')
    ui_en_src = file_texts.get('src/locales/uiEn.js', '')
    if ui_zh_src and ui_en_src:
        zh_keys = set(re.findall(r"^\s+'([^']+)'\s*:", ui_zh_src, re.M))
        en_keys = set(re.findall(r"^\s+'([^']+)'\s*:", ui_en_src, re.M))
    else:
        zh_keys, en_keys = set(), set()
        errors.append("src/locales/uiZh.js / uiEn.js: Missing split locale dictionaries")
    if zh_keys or en_keys:
        miss_en = sorted(zh_keys - en_keys)
        miss_zh = sorted(en_keys - zh_keys)
        if miss_en:
            errors.append(f"src/locales/uiEn.js: Missing en-US keys ({len(miss_en)}): {', '.join(miss_en[:8])}")
        if miss_zh:
            errors.append(f"src/locales/uiZh.js: Missing zh-CN keys ({len(miss_zh)}): {', '.join(miss_zh[:8])}")

    # 12. Editor v34/v35, Visual Bell-Vein Skill Tree, Relic Synergy Constellation & Save v35 Check
    for tok in ('realmSeal', 'requiresBoss', 'skyBridge'):
        if tok not in editor_code:
            errors.append(f"src/editor.js: Missing editor feature '{tok}'")
    if 'refinedRelics' not in save_code or 'skillNodes' not in save_code:
        errors.append("src/save.js: Missing refinedRelics or skillNodes persistence")
    skill_data = file_texts.get('src/skillTree.js', '')
    skill_ui = file_texts.get('src/ui/skillTreeUi.js', '')
    relic_ui = file_texts.get('src/ui/relicBoardUi.js', '')
    skill_node_cnt = len(re.findall(r"^    id:\s*'([^']+)'", skill_data, re.M))
    if skill_node_cnt < 18:
        errors.append(f"src/skillTree.js: Expected >=18 Bell-Vein nodes, found {skill_node_cnt}")
    if 'skill-preview-canvas' not in skill_ui or 'updateAndRenderSkillPreview' not in skill_ui:
        errors.append("src/ui/skillTreeUi.js: Missing live action preview canvas")
    if 'relic-synergy-svg' not in relic_ui or 'updateSynergyOverlay' not in relic_ui:
        errors.append("src/ui/relicBoardUi.js: Missing interactive SVG synergy constellation overlay")
    dmg_code = file_texts.get('src/combat/damageCombat.js', '')
    eai_code = file_texts.get('src/ai/enemiesAi.js', '')
    pc_code = file_texts.get('src/combat/playerCombat.js', '')
    if 'applyEnemyHitFeel' not in dmg_code or 'updateEnemyLaunchPhysics' not in eai_code or 'triggerHammerAirSlamImpact' not in pc_code:
        errors.append("v36.0: Missing hit-feel, wall-slam launch physics, or hammer air-slam implementation")
    wc_code = file_texts.get('src/combat/worldCombat.js', '')
    for fn_name in ('triggerBellDiveImpact', 'activateWorldSwitch', 'toggleWindVane', 'awakenDormantSporePad', 'triggerIcePillarDrop'):
        if fn_name not in wc_code:
            errors.append(f"v37.0: Missing '{fn_name}' in src/combat/worldCombat.js")
    if 'v: 42' not in save_code or 'grappleHook' not in save_code or 'belfryHatchOpen' not in save_code or 'windAscentOpen' not in save_code:
        errors.append("src/save.js: Missing v42 save version, grappleHook, or v41 one-way switch persistence")
    ed_topo = file_texts.get('src/editorTopology.js', '')
    ed_code = file_texts.get('src/editor.js', '')
    if 'runTopologyAndShaftAudit' not in ed_topo or 'toggleAuditHighlight' not in ed_code or 'drawAuditOverlays' not in ed_code:
        errors.append("v41.2: Missing editor live topology audit or violation highlight integration")
    # v40.2 Regression Guard: every grappleAnchor in oy!=0 rooms must have topY & id; every static voidBarrier must be topSealed!
    for entry in world.get('rooms', []):
        rpath = os.path.join(BASE_DIR, entry['file'].lstrip('./'))
        if os.path.isfile(rpath):
            rm_d = json.load(open(rpath, encoding='utf-8'))
            oy_r = rm_d['bounds']['y']
            for anc in rm_d.get('grappleAnchors', []):
                if not anc.get('id') or (oy_r != 0 and 'topY' not in anc):
                    errors.append(f"{rm_d['id']}: Grapple anchor missing id or topY (oy={oy_r})")
            for lan in rm_d.get('lanterns', []):
                if oy_r != 0 and 'topY' not in lan:
                    errors.append(f"{rm_d['id']}: Lantern '{lan.get('id')}' missing topY (oy={oy_r})")
            for sw in rm_d.get('slickWalls', []):
                sx0, sy0, sx1, sy1 = sw['x'], sw['y'], sw['x'] + sw['w'], sw['y'] + sw['h']
                has_backing = any(
                    s['type'] != 'platform' and s['x'] < sx1 + 4 and s['x'] + s['w'] > sx0 - 4 and s['y'] < sy1 + 4 and s['y'] + s['h'] > sy0 - 4
                    for s in rm_d.get('solids', [])
                )
                if not has_backing:
                    errors.append(f"{rm_d['id']}: Thorn/slickWall '{sw.get('id')}' floats in mid-air without solid stone backing!")
            for vb in rm_d.get('voidBarriers', []):
                if vb.get('sweeping'): continue
                vx, vy, vw = vb['x'], vb['y'], vb.get('w', 22)
                top_ok = any(s['type'] != 'platform' and s['x'] <= vx + 6 and s['x']+s['w'] >= vx+vw - 6 and abs((s['y']+s['h']) - vy) <= 12 for s in rm_d.get('solids', []))
                if not top_ok:
                    errors.append(f"{rm_d['id']}: Static voidBarrier '{vb.get('id')}' is not top-sealed and can be jumped over!")
    modals_code = file_texts.get('src/ui/modalsUi.js', '')
    if 'openSettingsJournal' not in modals_code or 'renderWeaponCodexInto' not in modals_code:
        errors.append("v40.0: Missing 4-tab settings journal or weapon codex renderer")
    vb_total = 0
    sw_total = 0
    for entry in world.get('rooms', []):
        rpath = os.path.join(BASE_DIR, entry['file'].lstrip('./'))
        if os.path.isfile(rpath):
            rm_d = json.load(open(rpath, encoding='utf-8'))
            vb_total += len(rm_d.get('voidBarriers', []))
            sw_total += len(rm_d.get('slickWalls', []))
    if vb_total < 15 or sw_total < 8:
        errors.append(f"v40.0: Expected >=15 voidBarriers & >=8 slickWalls, found {vb_total} / {sw_total}")
    if len(world.get('rooms', [])) < 25:
        errors.append(f"data/world.json: Expected >=25 rooms in v38/v39, found {len(world.get('rooms', []))}")
    cin_code = file_texts.get('src/render/cinematicRenderer.js', '')
    por_code = file_texts.get('src/npcPortraits.js', '')
    if 'drawFoundryCrucibles' not in cin_code or 'drawZoneCalligraphyBanner' not in cin_code or 'getNpcPortraitSvg' not in por_code:
        errors.append("v39.0: Missing cinematic renderer or NPC portraits module")

    eco_summary = {
        'reg_cnt': reg_cnt,
        'reg_echo': reg_echo,
        'warden_echo': warden_echo,
        'boss_echo': boss_echo,
        'cache_echo': cache_echo,
        'other_pickup_echo': other_pickup_echo,
        'npc_echo': npc_echo,
        'total_1x': total_1x,
        'smith_total': smith_total,
        'core_sink': core_sink,
        'full_sink': full_sink,
        'relics_refined': refined_count,
        'relics_total': len(relic_ids),
        'i18n_keys': len(zh_keys),
    }
    return eco_summary, errors, warnings




def check_world_topology_and_shafts():
    errors = []
    world = json.load(open(os.path.join(BASE_DIR, 'data', 'world.json'), encoding='utf-8'))
    rooms = {}
    for entry in world.get('rooms', []):
        rpath = os.path.join(BASE_DIR, entry['file'].lstrip('./'))
        if os.path.isfile(rpath):
            rm = json.load(open(rpath, encoding='utf-8'))
            rooms[rm['id']] = rm

    # LAW 1: No horizontal secretWalls (w > h) — horizontal floor hatches must be switchGates or breakableFloors!
    for rid, rm in rooms.items():
        for sw in rm.get('secretWalls', []):
            if sw.get('w', 0) > sw.get('h', 0):
                errors.append(f"Topology Law 1: {rid} has horizontal secretWall '{sw.get('id')}' ({sw['w']}x{sw['h']}) — convert to switchGate or breakableFloor!")

    # LAW 2: Vertical shaft drop clearance — bouncePads in top 200px of bottom room must leave >= 90px unobstructed drop lane!
    def subtract_seg(segs, a, b):
        out = []
        for s0, s1 in segs:
            if b <= s0 or a >= s1:
                out.append((s0, s1))
            else:
                if a > s0: out.append((s0, a))
                if b < s1: out.append((b, s1))
        return out

    for rid, top_rm in rooms.items():
        tb = top_rm['bounds']
        for cid in top_rm.get('connections', []):
            if cid not in rooms: continue
            bot_rm = rooms[cid]
            bb = bot_rm['bounds']
            if abs((tb['y'] + tb['h']) - bb['y']) > 24: continue
            ov0, ov1 = max(tb['x'], bb['x']), min(tb['x'] + tb['w'], bb['x'] + bb['w'])
            if ov1 - ov0 < 40: continue
            intervals = [(ov0, ov1)]
            for s in top_rm.get('solids', []):
                if s['type'] != 'platform' and s['y'] + s['h'] >= tb['h'] - 25:
                    intervals = subtract_seg(intervals, tb['x'] + s['x'], tb['x'] + s['x'] + s['w'])
            for s in bot_rm.get('solids', []):
                if s['type'] != 'platform' and s['y'] <= 40:
                    intervals = subtract_seg(intervals, bb['x'] + s['x'], bb['x'] + s['x'] + s['w'])
            for a, b in intervals:
                if b - a < 60: continue
                free = [(a, b)]
                has_pad = False
                for bp in bot_rm.get('bouncePads', []):
                    if bp['y'] < 200:
                        bx0, bx1 = bb['x'] + bp['x'] - bp['w'] / 2, bb['x'] + bp['x'] + bp['w'] / 2
                        if bx1 > a and bx0 < b:
                            has_pad = True
                            free = subtract_seg(free, bx0, bx1)
                if has_pad:
                    max_free = max((x1 - x0 for x0, x1 in free), default=0)
                    if max_free < 90:
                        errors.append(f"Topology Law 2: BouncePad blocks drop shaft {rid}->{cid} [{a}..{b}] (maxFreeDrop={max_free:.0f}px < 90px)")

    # LAW 3, 4 & 5: 5-Tier Directed BFS Reachability, Strict Post-Ji Anti-Bypass & Strong Connectivity Anti-Softlock!
    switch_room = {}
    switch_req_boss = {}
    for rid, rm in rooms.items():
        for sw in rm.get('worldSwitches', []):
            switch_room[sw['switchKey']] = rid
            if sw.get('requiresBoss'):
                switch_req_boss[sw['switchKey']] = sw['requiresBoss']

    def edge_open(u, v, caps, active_switches):
        pair = (u, v)
        if pair in (('r03_chapel', 'r04_bell_well'), ('r04_bell_well', 'r03_chapel')):
            return caps['boss1']
        if pair in (('r04_bell_well', 'r05_foundry'), ('r05_foundry', 'r04_bell_well')):
            return caps['doubleJump']
        if pair in (('r05_foundry', 'r07_ascent'), ('r07_ascent', 'r05_foundry')):
            return caps['boss2']
        if pair == ('r02_corridor', 'r18_rain_steps'):
            return caps['grapple']
        if pair == ('r04_bell_well', 'r20_bell_galleries'):
            return caps['grapple']
        if pair in (('r04_bell_well', 'r22_cistern_nave'), ('r22_cistern_nave', 'r04_bell_well'),
                    ('r06_crypt', 'r21_cistern_west'), ('r21_cistern_west', 'r06_crypt'),
                    ('r07_ascent', 'r23_cistern_lock'), ('r23_cistern_lock', 'r07_ascent'),
                    ('r11_frost_ridge', 'r24_frost_seep'), ('r24_frost_seep', 'r11_frost_ridge')):
            return caps['bellDive']
        sw_pairs = {
            ('r01_sanctuary', 'r19_belfry_outer'): 'belfryHatchOpen',
            ('r19_belfry_outer', 'r01_sanctuary'): 'belfryHatchOpen',
            ('r01_sanctuary', 'r10_ink_woods'): 'forestHatchOpen',
            ('r10_ink_woods', 'r01_sanctuary'): 'forestHatchOpen',
            ('r02_corridor', 'r06_crypt'): 'cryptHatchOpen',
            ('r06_crypt', 'r02_corridor'): 'cryptHatchOpen',
            ('r05_foundry', 'r09_wind_spire'): 'foundryValveOpen',
            ('r09_wind_spire', 'r05_foundry'): 'foundryValveOpen',
            ('r07_ascent', 'r09_wind_spire'): 'windAscentOpen',
            ('r09_wind_spire', 'r07_ascent'): 'windAscentOpen',
            ('r04_bell_well', 'r09_wind_spire'): 'windWestOpen',
            ('r09_wind_spire', 'r04_bell_well'): 'windWestOpen',
            ('r20_bell_galleries', 'r12_wind_bridge'): 'galleryWindOpen',
            ('r12_wind_bridge', 'r20_bell_galleries'): 'galleryWindOpen',
            ('r14_woods_cavern', 'r21_cistern_west'): 'cisternWestOpen',
            ('r21_cistern_west', 'r14_woods_cavern'): 'cisternWestOpen',
        }
        if pair in sw_pairs:
            return sw_pairs[pair] in active_switches
        if pair in (('r13_wind_peak', 'r25_mirror_abyss'), ('r25_mirror_abyss', 'r13_wind_peak')):
            return caps['boss4Unlocked']
        if pair in (('r13_wind_peak', 'r17_frost_summit'), ('r17_frost_summit', 'r13_wind_peak')):
            return caps['boss2']
        return True

    def solve_tier(caps):
        active_switches = set()
        while True:
            visited = {'r01_sanctuary'}
            queue = ['r01_sanctuary']
            while queue:
                u = queue.pop(0)
                for v in rooms[u].get('connections', []):
                    if v in rooms and v not in visited and edge_open(u, v, caps, active_switches):
                        visited.add(v)
                        queue.append(v)
            new_sw = False
            for sk, srm in switch_room.items():
                if sk in active_switches or srm not in visited: continue
                rb = switch_req_boss.get(sk)
                if rb == 'boss_ji' and not caps['boss2']: continue
                active_switches.add(sk)
                new_sw = True
            if not new_sw:
                break
        can_return = {'r01_sanctuary'}
        rqueue = ['r01_sanctuary']
        while rqueue:
            v = rqueue.pop(0)
            for u in visited:
                if u not in can_return and v in rooms[u].get('connections', []) and edge_open(u, v, caps, active_switches):
                    can_return.add(u)
                    rqueue.append(u)
        softlocked = sorted(visited - can_return)
        return visited, softlocked

    tiers = [
        ('T0_Start',   dict(boss1=False, grapple=False, doubleJump=False, shadeDash=False, boss2=False, bellDive=False, boss4Unlocked=False)),
        ('T1_Grapple', dict(boss1=True,  grapple=True,  doubleJump=False, shadeDash=False, boss2=False, bellDive=False, boss4Unlocked=False)),
        ('T2_PreJi',   dict(boss1=True,  grapple=True,  doubleJump=True,  shadeDash=True,  boss2=False, bellDive=False, boss4Unlocked=False)),
        ('T3_PostJi',  dict(boss1=True,  grapple=True,  doubleJump=True,  shadeDash=True,  boss2=True,  bellDive=True,  boss4Unlocked=False)),
        ('T4_Endgame', dict(boss1=True,  grapple=True,  doubleJump=True,  shadeDash=True,  boss2=True,  bellDive=True,  boss4Unlocked=True)),
    ]
    post_ji_forbidden = {
        'r07_ascent', 'r08_heart', 'r09_wind_spire', 'r11_frost_ridge', 'r12_wind_bridge',
        'r13_wind_peak', 'r16_frost_tomb', 'r17_frost_summit',
        'r21_cistern_west', 'r22_cistern_nave', 'r23_cistern_lock', 'r24_frost_seep', 'r25_mirror_abyss'
    }
    tier_summary = []
    for tname, caps in tiers:
        vis, soft = solve_tier(caps)
        tier_summary.append(f"{tname}={len(vis)}")
        if soft:
            errors.append(f"Topology Softlock ({tname}): Cannot return to Sanctuary from {soft}")
        if not caps['boss1']:
            if vis != {'r01_sanctuary', 'r02_corridor', 'r03_chapel'}:
                errors.append(f"Topology Sequence-Break ({tname}): Reached outside T0 starter zone before defeating Boss 1 Hui: {sorted(vis)}")
        if not caps['boss2']:
            leaked = sorted(vis & post_ji_forbidden)
            if leaked:
                errors.append(f"Topology Sequence-Break ({tname}): Reached post-Ji rooms before defeating Boss 2 Ji: {leaked}")
        if tname == 'T4_Endgame' and len(vis) < len(rooms):
            missing = sorted(set(rooms.keys()) - vis)
            errors.append(f"Topology Unreachable ({tname}): Rooms unreachable at Endgame: {missing}")

    return ' | '.join(tier_summary), errors



def _strip_js_literals_and_comments(code):
    out = []
    i = 0
    n = len(code)
    in_str = None
    tmpl_stack = []
    depth = 0
    while i < n:
        ch = code[i]
        nxt = code[i + 1] if i + 1 < n else ''
        if in_str:
            if ch == '\\':
                i += 2
                continue
            if in_str == '`' and ch == '$' and nxt == '{':
                tmpl_stack.append(depth)
                depth += 1
                in_str = None
                out.append(' ')
                i += 2
                continue
            if ch == in_str:
                in_str = None
                out.append(' ')
            elif ch == '\n':
                out.append('\n')
            i += 1
            continue
        if ch == '/' and nxt == '/':
            while i < n and code[i] != '\n':
                i += 1
            continue
        if ch == '/' and nxt == '*':
            i += 2
            while i + 1 < n and not (code[i] == '*' and code[i + 1] == '/'):
                if code[i] == '\n':
                    out.append('\n')
                i += 1
            i += 2
            continue
        if ch in ("'", '"', '`'):
            in_str = ch
            out.append(' ')
            i += 1
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth = max(0, depth - 1)
            if tmpl_stack and depth == tmpl_stack[-1]:
                tmpl_stack.pop()
                in_str = '`'
                out.append(' ')
                i += 1
                continue
        out.append(ch)
        i += 1
    return ''.join(out)


def check_undefined_js_calls(file_texts):
    errors = []
    cfg_src = file_texts.get('src/config.js', '')
    cfg_consts = set(re.findall(r'^export\s+(?:const|let|var)\s+([A-Z][A-Z0-9_]{2,})\b', cfg_src, re.M))
    builtins = {
        'if','for','while','switch','catch','function','return','typeof','instanceof','new','throw','await','async','yield','delete','void','case','in','of',
        'Math','Number','String','Boolean','Array','Object','Set','Map','WeakMap','WeakSet','JSON','Date','RegExp','Error','Event','ErrorEvent','MouseEvent','Promise','Symbol','BigInt',
        'parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent','eval','atob','btoa',
        'console','window','document','navigator','localStorage','sessionStorage','location','history','performance','fetch','URL','URLSearchParams','Blob','FileReader','Image','Audio','AudioContext','webkitAudioContext','OffscreenCanvas','Path2D','DOMMatrix','ResizeObserver','MutationObserver','IntersectionObserver',
        'requestAnimationFrame','cancelAnimationFrame','setTimeout','clearTimeout','setInterval','clearInterval','queueMicrotask','alert','confirm','prompt','getComputedStyle','matchMedia','structuredClone',
        'Float32Array','Float64Array','Uint8Array','Uint16Array','Uint32Array','Int32Array','Uint8ClampedArray','ArrayBuffer'
    }
    for rel, code in sorted(file_texts.items()):
        if not rel.endswith('.js') or 'locales/' in rel:
            continue
        clean = _strip_js_literals_and_comments(code)
        declared = set(builtins)
        for m in re.finditer(r'import\s*\{([^}]+)\}\s*from', clean):
            for p in m.group(1).split(','):
                p = p.strip()
                if p:
                    declared.add(p.split(' as ')[-1].strip())
        for m in re.finditer(r'import\s+([A-Za-z_$][\w$]*)\s+from', clean):
            declared.add(m.group(1))
        for m in re.finditer(r'\b(?:export\s+)?(?:async\s+)?(?:function|class|const|let|var)\s+([A-Za-z_$][\w$]*)', clean):
            declared.add(m.group(1))
        for m in re.finditer(r'(?:const|let|var)\s*\{([^}]+)\}', clean):
            for p in m.group(1).split(','):
                p = p.strip().split('=')[0].strip()
                if ':' in p:
                    p = p.split(':')[1].strip()
                if re.match(r'^[A-Za-z_$][\w$]*$', p):
                    declared.add(p)
        for m in re.finditer(r'\bfunction\s+[A-Za-z_$][\w$]*\s*\(([^)]*)\)', clean):
            for p in m.group(1).split(','):
                p = p.strip().lstrip('.').split('=')[0].strip()
                if re.match(r'^[A-Za-z_$][\w$]*$', p):
                    declared.add(p)
        for m in re.finditer(r'(?:^|\n)\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{', clean):
            declared.add(m.group(1))
            for p in m.group(2).split(','):
                p = p.strip().lstrip('.').split('=')[0].strip()
                if re.match(r'^[A-Za-z_$][\w$]*$', p):
                    declared.add(p)
        for m in re.finditer(r'\(([^)]*)\)\s*=>', clean):
            for p in m.group(1).split(','):
                p = p.strip().lstrip('.').split('=')[0].strip()
                if re.match(r'^[A-Za-z_$][\w$]*$', p):
                    declared.add(p)
        for m in re.finditer(r'\b([A-Za-z_$][\w$]*)\s*=>', clean):
            declared.add(m.group(1))

        seen_err = set()
        for m in re.finditer(r'(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(', clean):
            fn = m.group(1)
            before = clean[max(0, m.start() - 18):m.start()]
            if re.search(r'\b(function|class|get|set|async)\s+$', before):
                continue
            if re.match(r'^[^)]*\)\s*\{', clean[m.end():m.end() + 80]):
                continue
            if fn not in declared and fn not in seen_err:
                seen_err.add(fn)
                errors.append(f"{rel}: Undefined function call '{fn}()'")

        # v45.3 Guard: verify every config.js exported constant referenced in a module is explicitly imported/declared
        clean_no_reexp = re.sub(r'export\s*\{[^}]*\}\s*from\s*[^;\n]+', '', clean)
        for sym in sorted(cfg_consts):
            if sym in declared:
                continue
            if re.search(rf'(?<![.\w$]){re.escape(sym)}(?!\s*:)(?![\w$])', clean_no_reexp):
                errors.append(f"{rel}: Missing import for config constant '{sym}'")
    return errors

def main():
    js_cnt, file_texts, line_counts, cyc_cnt, js_errs, js_warns = check_js_modules()
    rm_cnt, st_cnt, rm_errs, rm_warns = check_rooms_and_locales(file_texts)
    lnch_errs = check_launchers_and_python()
    eco, v34_errs, v34_warns = check_v34_economy_relics_i18n(file_texts)

    topo_summary, topo_errs = check_world_topology_and_shafts()
    undef_errs = check_undefined_js_calls(file_texts)
    all_errs = js_errs + rm_errs + lnch_errs + v34_errs + topo_errs + undef_errs
    all_warns = js_warns + rm_warns + v34_warns

    print(f"[Ashen Bell Vow v45.3 Verifier] JS modules: {js_cnt} | Cycles: {cyc_cnt} | Rooms: {rm_cnt} | Stamps: {st_cnt}")
    print(
        f"Economy (1x): {eco['total_1x']} echoes "
        f"[Foes({eco['reg_cnt']}): {eco['reg_echo']} | Wardens: {eco['warden_echo']} | Bosses: {eco['boss_echo']} | "
        f"Caches: {eco['cache_echo']} | Seals/Cores: {eco['other_pickup_echo']} | NPCs: {eco['npc_echo']}]"
    )
    print(
        f"Sinks: Smith={eco['smith_total']} | Core 3-Slot Build={eco['core_sink']} | Full Completion={eco['full_sink']} | "
        f"Refined Relics={eco['relics_refined']}/{eco['relics_total']} | i18n Keys={eco['i18n_keys']} (zh=en)"
    )
    print(f"Topology BFS (0 softlocks, 0 post-Ji bypasses): {topo_summary}")
    print("Top 6 largest JS modules:")
    for cnt, rel in line_counts[:6]:
        tag = " [OVER]" if cnt > LARGE_MODULE_WARN_LINES and not rel.endswith('editor.js') else ""
        print(f"  {cnt:5d} lines | {rel}{tag}")
    if all_warns:
        print(f"\nWarnings ({len(all_warns)}):")
        for w in all_warns:
            print("  [WARN]", w)
    if all_errs:
        print(f"\nErrors ({len(all_errs)}):")
        for e in all_errs:
            print("  [ERR] ", e)
        sys.exit(1)
    print(f"ALL CHECKS PASSED! (0 errors, {len(all_warns)} warnings)")


if __name__ == '__main__':
    main()
