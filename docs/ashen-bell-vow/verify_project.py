#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Zero-dependency static verifier for Ashen Bell Vow v35.0
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
                    if min(rx1, ob['x'] + ob['w']) - max(rx0, ob['x']) > 40:
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
    core_sink = smith_total + 140 * 3 + 180 + 220 + 200 + refine_cost * 3
    full_sink = smith_total + 140 * 6 + 180 + 220 + 200 + refine_cost * 11

    if not (4600 <= total_1x <= 5500):
        errors.append(f"Economy: 1x total income {total_1x} outside v34.0 compact range [4600, 5500]")
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
    if len(relic_ids) != 11 or refined_count != len(relic_ids):
        errors.append(f"Relics: Expected 11 relics all with refined blocks, found {len(relic_ids)} relics / {refined_count} refined")

    en_refined_count = len(re.findall(r"^\s+refinedEffect:\s*'", ent_loc, re.M))
    if en_refined_count != len(relic_ids):
        errors.append(f"Locales: Expected {len(relic_ids)} refinedEffect entries in src/locales/entities.js, found {en_refined_count}")

    # 11. Bilingual UI Dictionary Key Parity (zh-CN vs en-US)
    zh_idx = ui_loc.find("'zh-CN': {")
    en_idx = ui_loc.find("'en-US': {")
    if zh_idx >= 0 and en_idx > zh_idx:
        zh_keys = set(re.findall(r"^\s+'([^']+)'\s*:", ui_loc[zh_idx:en_idx], re.M))
        en_keys = set(re.findall(r"^\s+'([^']+)'\s*:", ui_loc[en_idx:], re.M))
        miss_en = sorted(zh_keys - en_keys)
        miss_zh = sorted(en_keys - zh_keys)
        if miss_en:
            errors.append(f"src/locales/ui.js: Missing en-US keys ({len(miss_en)}): {', '.join(miss_en[:8])}")
        if miss_zh:
            errors.append(f"src/locales/ui.js: Missing zh-CN keys ({len(miss_zh)}): {', '.join(miss_zh[:8])}")
    else:
        zh_keys, en_keys = set(), set()
        errors.append("src/locales/ui.js: Could not locate zh-CN / en-US dictionary blocks")

    # 12. Editor v34/v35, Visual Bell-Vein Skill Tree, Relic Synergy Constellation & Save v35 Check
    for tok in ('realmSeal', 'requiresBoss', 'skyBridge'):
        if tok not in editor_code:
            errors.append(f"src/editor.js: Missing editor feature '{tok}'")
    if 'v: 35' not in save_code or 'refinedRelics' not in save_code or 'skillNodes' not in save_code:
        errors.append("src/save.js: Missing v35 save version, refinedRelics, or skillNodes persistence")
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


def main():
    js_cnt, file_texts, line_counts, cyc_cnt, js_errs, js_warns = check_js_modules()
    rm_cnt, st_cnt, rm_errs, rm_warns = check_rooms_and_locales(file_texts)
    lnch_errs = check_launchers_and_python()
    eco, v34_errs, v34_warns = check_v34_economy_relics_i18n(file_texts)

    all_errs = js_errs + rm_errs + lnch_errs + v34_errs
    all_warns = js_warns + rm_warns + v34_warns

    print(f"[Ashen Bell Vow v35.0 Verifier] JS modules: {js_cnt} | Cycles: {cyc_cnt} | Rooms: {rm_cnt} | Stamps: {st_cnt}")
    print(
        f"Economy (1x): {eco['total_1x']} echoes "
        f"[Foes({eco['reg_cnt']}): {eco['reg_echo']} | Wardens: {eco['warden_echo']} | Bosses: {eco['boss_echo']} | "
        f"Caches: {eco['cache_echo']} | Seals/Cores: {eco['other_pickup_echo']} | NPCs: {eco['npc_echo']}]"
    )
    print(
        f"Sinks: Smith={eco['smith_total']} | Core 3-Slot Build={eco['core_sink']} | Full Completion={eco['full_sink']} | "
        f"Refined Relics={eco['relics_refined']}/{eco['relics_total']} | i18n Keys={eco['i18n_keys']} (zh=en)"
    )
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
