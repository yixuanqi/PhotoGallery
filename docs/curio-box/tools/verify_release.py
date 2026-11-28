#!/usr/bin/env python3
"""
Curio Box (云海空中花房) - 自动化发布前防回归与合规校验器 (v9.6.3)
包含：
  1. 严格 JS 词法 / 括号 / 模板字符串 / IIFE / 零 ESM 校验
  2. 全标识符词法作用域未声明检查（类 ESLint no-undef，支持全部大小写变量与常量）
  3. CB.* 模块加载顺序与跨模块导出符号完整性
  4. DOM ID 100% 匹配与数据注册表引用一致性
  5. TapTap WebView 合规、去剧透扫描与 FPS / GC 规范审计
  6. TapTap 单文件 Bundle ZIP 完整性验证

用法：
  python tools/verify_release.py
  python tools/verify_release.py --bundle dist/curio-box-taptap-bundle.zip
"""

import argparse
import os
import re
import zipfile


JS_KEYWORDS = {
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete',
    'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if',
    'import', 'in', 'instanceof', 'let', 'new', 'null', 'of', 'return', 'static', 'super',
    'switch', 'this', 'throw', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'while',
    'with', 'yield', 'async', 'await', 'get', 'set', 'from', 'as',
}

BROWSER_GLOBALS = {
    'window', 'document', 'navigator', 'location', 'history', 'screen', 'localStorage', 'sessionStorage',
    'console', 'performance', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout',
    'setInterval', 'clearInterval', 'queueMicrotask', 'fetch', 'Image', 'Audio', 'Option', 'Event',
    'CustomEvent', 'HTMLElement', 'HTMLCanvasElement', 'CanvasRenderingContext2D', 'Path2D',
    'AudioContext', 'webkitAudioContext', 'URL', 'Blob', 'FileReader', 'DOMParser',
    'Math', 'Date', 'JSON', 'Array', 'Object', 'Set', 'Map', 'WeakSet', 'WeakMap', 'Symbol',
    'Number', 'String', 'Boolean', 'BigInt', 'RegExp', 'Error', 'TypeError', 'RangeError',
    'SyntaxError', 'ReferenceError', 'Promise', 'Proxy', 'Reflect', 'Intl',
    'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
    'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'ArrayBuffer', 'DataView',
    'Infinity', 'NaN', 'isNaN', 'isFinite', 'parseInt', 'parseFloat', 'encodeURI', 'decodeURI',
    'encodeURIComponent', 'decodeURIComponent', 'atob', 'btoa', 'structuredClone', 'globalThis',
    'arguments',
}

NODE_GLOBALS = {
    'require', 'module', 'exports', '__dirname', '__filename', 'process', 'Buffer', 'global',
}

MULTI_OPS = (
    '>>>=', '===', '!==', '>>>', '**=', '<<=', '>>=', '&&=', '||=', '??=',
    '=>', '...', '?.', '??', '&&', '||', '==', '!=', '<=', '>=', '+=', '-=',
    '*=', '/=', '%=', '&=', '|=', '^=', '++', '--', '<<', '>>', '**',
)


def tokenize_js(label: str, code: str):
    """Tokenize JS into (kind, value, line, col) with strict syntax & bracket checks."""
    tokens = []
    i, n = 0, len(code)
    line, col = 1, 1
    in_tpl = False
    tpl_brace_stack = []
    last_sig = ''
    bracket_stack = []

    def advance(k=1):
        nonlocal i, line, col
        for _ in range(k):
            if i < n and code[i] == '\n':
                line += 1
                col = 1
            else:
                col += 1
            i += 1

    # Skip optional shebang on line 1 (e.g., #!/usr/bin/env node)
    if code.startswith('#!'):
        while i < n and code[i] != '\n':
            advance(1)

    while i < n:
        ch = code[i]
        nxt = code[i + 1] if i + 1 < n else ''

        if in_tpl:
            if ch == '\\':
                advance(2)
                continue
            if ch == '`':
                in_tpl = False
                tokens.append(('STR', '""', line, col))
                last_sig = 'VAL'
                advance(1)
                continue
            if ch == '$' and nxt == '{':
                tpl_brace_stack.append(0)
                bracket_stack.append(('${', line, col))
                in_tpl = False
                tokens.append(('PUNCT', '(', line, col))
                last_sig = '('
                advance(2)
                continue
            advance(1)
            continue

        if ch.isspace():
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
            q = ch
            sl, sc = line, col
            advance(1)
            closed = False
            while i < n:
                if code[i] == '\\':
                    advance(2)
                    continue
                if code[i] == q:
                    advance(1)
                    closed = True
                    break
                assert code[i] != '\n', f"{label}:{sl}: Unterminated string literal"
                advance(1)
            assert closed, f"{label}:{sl}: Unterminated string literal"
            tokens.append(('STR', '""', sl, sc))
            last_sig = 'VAL'
            continue

        if ch == '`':
            in_tpl = True
            advance(1)
            continue

        # Regex literal vs division: '/' starts regex only when NOT following a value token
        if ch == '/' and last_sig in (
            '', '(', '[', '{', ',', ';', ':', '=', '!', '?', '&', '|', '=>',
            'return', 'case', 'throw', 'typeof', 'void', 'delete', 'in', 'of', 'OP',
        ):
            j = i + 1
            in_cls = False
            closed = False
            while j < n and code[j] != '\n':
                if code[j] == '\\':
                    j += 2
                    continue
                if code[j] == '[':
                    in_cls = True
                elif code[j] == ']':
                    in_cls = False
                elif code[j] == '/' and not in_cls:
                    closed = True
                    j += 1
                    while j < n and code[j].isalpha():
                        j += 1
                    break
                j += 1
            if closed:
                sl, sc = line, col
                advance(j - i)
                tokens.append(('REGEX', '/re/', sl, sc))
                last_sig = 'VAL'
                continue

        if ch == '{' and tpl_brace_stack:
            tpl_brace_stack[-1] += 1
        elif ch == '}' and tpl_brace_stack:
            if tpl_brace_stack[-1] == 0:
                tpl_brace_stack.pop()
                assert bracket_stack and bracket_stack[-1][0] == '${', f"{label}:{line}:{col}: Mismatched template closing '}}'"
                bracket_stack.pop()
                in_tpl = True
                tokens.append(('PUNCT', ')', line, col))
                last_sig = 'VAL'
                advance(1)
                continue
            else:
                tpl_brace_stack[-1] -= 1

        if ch.isalpha() or ch in '_$':
            sl, sc = line, col
            start = i
            while i < n and (code[i].isalnum() or code[i] in '_$'):
                advance(1)
            val = code[start:i]
            tokens.append(('IDENT', val, sl, sc))
            last_sig = val if val in ('return', 'case', 'throw', 'typeof', 'void', 'delete', 'in', 'of') else 'VAL'
            continue

        if ch.isdigit() or (ch == '.' and nxt.isdigit()):
            sl, sc = line, col
            start = i
            while i < n and (code[i].isalnum() or code[i] in '._'):
                advance(1)
            tokens.append(('NUM', code[start:i], sl, sc))
            last_sig = 'VAL'
            continue

        if ch in '([{':
            bracket_stack.append((ch, line, col))
        elif ch in ')]}':
            assert bracket_stack, f"{label}:{line}:{col}: Unexpected closing '{ch}'"
            top, tl, tc = bracket_stack.pop()
            expected = {'(': ')', '[': ']', '{': '}'}[top]
            assert ch == expected, f"{label}:{line}:{col}: Mismatched '{ch}', expected '{expected}' for '{top}' opened at {tl}:{tc}"

        matched_op = None
        for op in MULTI_OPS:
            if code.startswith(op, i):
                matched_op = op
                break
        if matched_op:
            sl, sc = line, col
            tokens.append(('PUNCT', matched_op, sl, sc))
            if matched_op in ('++', '--'):
                last_sig = 'VAL'
            elif matched_op in ('=>', '?.', '??'):
                last_sig = matched_op if matched_op == '=>' else 'OP'
            else:
                last_sig = 'OP'
            advance(len(matched_op))
            continue

        tokens.append(('PUNCT', ch, line, col))
        if ch in (')', ']'):
            last_sig = 'VAL'
        elif ch == '}':
            last_sig = '}'
        elif ch in '([{,;:=!?&|':
            last_sig = ch
        else:
            last_sig = 'OP'
        advance(1)

    assert not in_tpl, f"{label}: Unterminated template literal at EOF"
    assert not bracket_stack, f"{label}: Unclosed brackets at EOF: {bracket_stack}"
    return tokens


def verify_js_lexer(label: str, code: str, require_iife: bool = True) -> str:
    tokens = tokenize_js(label, code)
    # Reject ES module import / export statements
    for idx, (k, v, ln, cl) in enumerate(tokens):
        if k == 'IDENT' and v == 'import':
            prev_v = tokens[idx - 1][1] if idx > 0 else ''
            nxt_k, nxt_v = (tokens[idx + 1][0], tokens[idx + 1][1]) if idx + 1 < len(tokens) else ('', '')
            if prev_v not in ('.', '?.') and (nxt_k in ('IDENT', 'STR') or nxt_v in ('{', '*')):
                raise AssertionError(f"{label}:{ln}:{cl}: ES import detected!")
        if k == 'IDENT' and v == 'export':
            prev_v = tokens[idx - 1][1] if idx > 0 else ''
            nxt_v = tokens[idx + 1][1] if idx + 1 < len(tokens) else ''
            if prev_v not in ('.', '?.') and nxt_v in ('default', 'const', 'let', 'var', 'function', 'class', '{'):
                raise AssertionError(f"{label}:{ln}:{cl}: ES export detected!")
    if require_iife:
        trimmed = code.strip()
        assert trimmed.startswith('(() => {') and trimmed.endswith('})();'), f"{label}: Not wrapped in IIFE!"
    return ' '.join(v for _, v, _, _ in tokens)


def check_undeclared_identifiers(label: str, code: str, extra_globals=None):
    """
    Full lexical-scope undeclared identifier checker (ESLint no-undef style).
    Catches BOTH ALL_CAPS constants (e.g. SKY_STARS) AND lowercase/camelCase typos (e.g. theme, plyer).
    Returns list of (ident, line, col).
    """
    toks = tokenize_js(label, code)
    n = len(toks)
    allowed_globals = set(BROWSER_GLOBALS)
    if extra_globals:
        allowed_globals |= set(extra_globals)

    match = {}
    st = []
    for idx, (k, v, _, _) in enumerate(toks):
        if k == 'PUNCT' and v in ('(', '[', '{'):
            st.append((v, idx))
        elif k == 'PUNCT' and v in (')', ']', '}'):
            if st:
                _, open_idx = st.pop()
                match[open_idx] = idx
                match[idx] = open_idx

    binding_token_indices = set()
    prop_key_indices = set()

    def collect_pattern_bindings(start_idx, end_idx, target_scope_set):
        i = start_idx
        while i < end_idx:
            k, v, _, _ = toks[i]
            if k == 'PUNCT' and v == '...':
                i += 1
                continue
            if k == 'PUNCT' and v == '{':
                close = match.get(i, end_idx - 1)
                j = i + 1
                while j < close:
                    jk, jv, _, _ = toks[j]
                    if jk == 'PUNCT' and jv == '...':
                        j += 1
                        if j < close and toks[j][0] == 'IDENT':
                            target_scope_set.add(toks[j][1])
                            binding_token_indices.add(j)
                            j += 1
                        continue
                    if jk == 'IDENT':
                        nxt_v = toks[j + 1][1] if j + 1 < close else ''
                        if nxt_v == ':':
                            prop_key_indices.add(j)
                            j += 2
                            elem_end = j
                            d = 0
                            while elem_end < close:
                                ev = toks[elem_end][1]
                                if toks[elem_end][0] == 'PUNCT':
                                    if ev in '([{':
                                        d += 1
                                    elif ev in ')]}':
                                        d -= 1
                                    elif ev in (',', '=') and d == 0:
                                        break
                                elem_end += 1
                            collect_pattern_bindings(j, elem_end, target_scope_set)
                            j = elem_end
                            if j < close and toks[j][0] == 'PUNCT' and toks[j][1] == '=':
                                j += 1
                                d = 0
                                while j < close:
                                    ev = toks[j][1]
                                    if toks[j][0] == 'PUNCT':
                                        if ev in '([{':
                                            d += 1
                                        elif ev in ')]}':
                                            d -= 1
                                        elif ev == ',' and d == 0:
                                            break
                                    j += 1
                        else:
                            target_scope_set.add(jv)
                            binding_token_indices.add(j)
                            j += 1
                            if j < close and toks[j][0] == 'PUNCT' and toks[j][1] == '=':
                                j += 1
                                d = 0
                                while j < close:
                                    ev = toks[j][1]
                                    if toks[j][0] == 'PUNCT':
                                        if ev in '([{':
                                            d += 1
                                        elif ev in ')]}':
                                            d -= 1
                                        elif ev == ',' and d == 0:
                                            break
                                    j += 1
                    elif jk == 'PUNCT' and jv == ',':
                        j += 1
                    else:
                        j += 1
                i = close + 1
                continue
            if k == 'PUNCT' and v == '[':
                close = match.get(i, end_idx - 1)
                j = i + 1
                while j < close:
                    if toks[j][0] == 'PUNCT' and toks[j][1] == ',':
                        j += 1
                        continue
                    elem_end = j
                    d = 0
                    while elem_end < close:
                        ev = toks[elem_end][1]
                        if toks[elem_end][0] == 'PUNCT':
                            if ev in '([{':
                                d += 1
                            elif ev in ')]}':
                                d -= 1
                            elif ev in (',', '=') and d == 0:
                                break
                        elem_end += 1
                    collect_pattern_bindings(j, elem_end, target_scope_set)
                    j = elem_end
                    if j < close and toks[j][0] == 'PUNCT' and toks[j][1] == '=':
                        j += 1
                        d = 0
                        while j < close:
                            ev = toks[j][1]
                            if toks[j][0] == 'PUNCT':
                                if ev in '([{':
                                    d += 1
                                elif ev in ')]}':
                                    d -= 1
                                elif ev == ',' and d == 0:
                                    break
                            j += 1
                i = close + 1
                continue
            if k == 'IDENT':
                target_scope_set.add(v)
                binding_token_indices.add(i)
                i += 1
                continue
            i += 1

    scopes = [{'parent': None, 'is_fn': True, 'vars': set()}]
    token_scope = [0] * n

    def new_scope(parent_id, is_fn=False):
        sid = len(scopes)
        scopes.append({'parent': parent_id, 'is_fn': is_fn, 'vars': set()})
        return sid

    def nearest_fn_scope(sid):
        cur = sid
        while cur is not None and not scopes[cur]['is_fn']:
            cur = scopes[cur]['parent']
        return cur if cur is not None else 0

    brace_kind = {}
    pending_block_scope = {}
    cur_scope = 0
    scope_stack = []

    i = 0
    while i < n:
        while scope_stack and i > scope_stack[-1][0]:
            _, prev_sc, _ = scope_stack.pop()
            cur_scope = prev_sc

        k, v, _, _ = toks[i]
        token_scope[i] = cur_scope

        # 1. function [name](params) { ... }
        if k == 'IDENT' and v == 'function':
            j = i + 1
            if j < n and toks[j][0] == 'PUNCT' and toks[j][1] == '*':
                j += 1
            fn_name_idx = None
            if j < n and toks[j][0] == 'IDENT':
                fn_name_idx = j
                j += 1
            if j < n and toks[j][0] == 'PUNCT' and toks[j][1] == '(':
                p_close = match.get(j, j)
                fn_sc = new_scope(cur_scope, is_fn=True)
                if fn_name_idx is not None:
                    scopes[nearest_fn_scope(cur_scope)]['vars'].add(toks[fn_name_idx][1])
                    scopes[fn_sc]['vars'].add(toks[fn_name_idx][1])
                    binding_token_indices.add(fn_name_idx)
                p_idx = j + 1
                while p_idx < p_close:
                    param_end = p_idx
                    d = 0
                    while param_end < p_close:
                        ev = toks[param_end][1]
                        if toks[param_end][0] == 'PUNCT':
                            if ev in '([{':
                                d += 1
                            elif ev in ')]}':
                                d -= 1
                            elif ev in (',', '=') and d == 0:
                                break
                        param_end += 1
                    collect_pattern_bindings(p_idx, param_end, scopes[fn_sc]['vars'])
                    p_idx = param_end
                    if p_idx < p_close and toks[p_idx][0] == 'PUNCT' and toks[p_idx][1] == '=':
                        p_idx += 1
                        d = 0
                        while p_idx < p_close:
                            ev = toks[p_idx][1]
                            if toks[p_idx][0] == 'PUNCT':
                                if ev in '([{':
                                    d += 1
                                elif ev in ')]}':
                                    d -= 1
                                elif ev == ',' and d == 0:
                                    break
                            p_idx += 1
                    if p_idx < p_close and toks[p_idx][0] == 'PUNCT' and toks[p_idx][1] == ',':
                        p_idx += 1
                for t_i in range(j, p_close + 1):
                    token_scope[t_i] = fn_sc
                body_open = p_close + 1
                if body_open < n and toks[body_open][0] == 'PUNCT' and toks[body_open][1] == '{':
                    pending_block_scope[body_open] = fn_sc
                    brace_kind[body_open] = 'fn_block'
                i += 1
                continue

        # 2. Arrow function `(params) => ...` or `ident => ...`
        if k == 'PUNCT' and v == '(' and i in match:
            p_close = match[i]
            if p_close + 1 < n and toks[p_close + 1][0] == 'PUNCT' and toks[p_close + 1][1] == '=>':
                fn_sc = new_scope(cur_scope, is_fn=True)
                p_idx = i + 1
                while p_idx < p_close:
                    param_end = p_idx
                    d = 0
                    while param_end < p_close:
                        ev = toks[param_end][1]
                        if toks[param_end][0] == 'PUNCT':
                            if ev in '([{':
                                d += 1
                            elif ev in ')]}':
                                d -= 1
                            elif ev in (',', '=') and d == 0:
                                break
                        param_end += 1
                    collect_pattern_bindings(p_idx, param_end, scopes[fn_sc]['vars'])
                    p_idx = param_end
                    if p_idx < p_close and toks[p_idx][0] == 'PUNCT' and toks[p_idx][1] == '=':
                        p_idx += 1
                        d = 0
                        while p_idx < p_close:
                            ev = toks[p_idx][1]
                            if toks[p_idx][0] == 'PUNCT':
                                if ev in '([{':
                                    d += 1
                                elif ev in ')]}':
                                    d -= 1
                                elif ev == ',' and d == 0:
                                    break
                            p_idx += 1
                    if p_idx < p_close and toks[p_idx][0] == 'PUNCT' and toks[p_idx][1] == ',':
                        p_idx += 1
                body_start = p_close + 2
                if body_start < n and toks[body_start][0] == 'PUNCT' and toks[body_start][1] == '{':
                    pending_block_scope[body_start] = fn_sc
                    brace_kind[body_start] = 'fn_block'
                else:
                    e_end = body_start
                    d = 0
                    while e_end < n:
                        ek, ev, _, _ = toks[e_end]
                        if ek == 'PUNCT':
                            if ev in '([{':
                                d += 1
                            elif ev in ')]}':
                                if d == 0:
                                    break
                                d -= 1
                            elif ev in (',', ';') and d == 0:
                                break
                        e_end += 1
                    scope_stack.append((e_end - 1, cur_scope, 'arrow_expr'))
                    cur_scope = fn_sc
                i += 1
                continue

        if k == 'IDENT' and i + 1 < n and toks[i + 1][0] == 'PUNCT' and toks[i + 1][1] == '=>':
            fn_sc = new_scope(cur_scope, is_fn=True)
            scopes[fn_sc]['vars'].add(v)
            binding_token_indices.add(i)
            body_start = i + 2
            if body_start < n and toks[body_start][0] == 'PUNCT' and toks[body_start][1] == '{':
                pending_block_scope[body_start] = fn_sc
                brace_kind[body_start] = 'fn_block'
            else:
                e_end = body_start
                d = 0
                while e_end < n:
                    ek, ev, _, _ = toks[e_end]
                    if ek == 'PUNCT':
                        if ev in '([{':
                            d += 1
                        elif ev in ')]}':
                            if d == 0:
                                break
                            d -= 1
                        elif ev in (',', ';') and d == 0:
                            break
                    e_end += 1
                scope_stack.append((e_end - 1, cur_scope, 'arrow_expr'))
                cur_scope = fn_sc
            i += 1
            continue

        # 3. catch (e) { ... }
        if k == 'IDENT' and v == 'catch':
            if i + 1 < n and toks[i + 1][0] == 'PUNCT' and toks[i + 1][1] == '(':
                c_close = match.get(i + 1, i + 1)
                c_sc = new_scope(cur_scope, is_fn=False)
                collect_pattern_bindings(i + 2, c_close, scopes[c_sc]['vars'])
                if c_close + 1 < n and toks[c_close + 1][0] == 'PUNCT' and toks[c_close + 1][1] == '{':
                    pending_block_scope[c_close + 1] = c_sc
                    brace_kind[c_close + 1] = 'block'
            i += 1
            continue

        # 4. for (...) loop header + body scope
        if k == 'IDENT' and v == 'for':
            if i + 1 < n and toks[i + 1][0] == 'PUNCT' and toks[i + 1][1] == '(':
                f_close = match.get(i + 1, i + 1)
                f_sc = new_scope(cur_scope, is_fn=False)
                body_idx = f_close + 1
                if body_idx < n and toks[body_idx][0] == 'PUNCT' and toks[body_idx][1] == '{':
                    loop_end = match.get(body_idx, body_idx)
                    brace_kind[body_idx] = 'block'
                else:
                    loop_end = body_idx
                    d = 0
                    while loop_end < n:
                        ek, ev, _, _ = toks[loop_end]
                        if ek == 'PUNCT':
                            if ev in '([{':
                                d += 1
                            elif ev in ')]}':
                                d -= 1
                            elif ev == ';' and d == 0:
                                break
                        loop_end += 1
                scope_stack.append((loop_end, cur_scope, 'for'))
                cur_scope = f_sc
            i += 1
            continue

        # 5. const / let / var declarations
        if k == 'IDENT' and v in ('const', 'let', 'var'):
            target_sc = nearest_fn_scope(cur_scope) if v == 'var' else cur_scope
            j = i + 1
            while j < n:
                pat_end = j
                d = 0
                while pat_end < n:
                    pk, pv, _, _ = toks[pat_end]
                    if pk == 'PUNCT':
                        if pv in '([{':
                            d += 1
                        elif pv in ')]}':
                            if d == 0:
                                break
                            d -= 1
                        elif pv in ('=', ',', ';') and d == 0:
                            break
                    elif pk == 'IDENT' and pv in ('in', 'of') and d == 0:
                        break
                    pat_end += 1
                collect_pattern_bindings(j, pat_end, scopes[target_sc]['vars'])
                j = pat_end
                if j >= n:
                    break
                if toks[j][0] == 'IDENT' and toks[j][1] in ('in', 'of'):
                    break
                if toks[j][0] == 'PUNCT' and toks[j][1] == '=':
                    j += 1
                    d = 0
                    while j < n:
                        jk, jv, _, _ = toks[j]
                        if jk == 'PUNCT':
                            if jv in '([{':
                                d += 1
                            elif jv in ')]}':
                                if d == 0:
                                    break
                                d -= 1
                            elif jv in (',', ';') and d == 0:
                                break
                        j += 1
                if j < n and toks[j][0] == 'PUNCT' and toks[j][1] == ',':
                    j += 1
                    continue
                break
            i += 1
            continue

        # 6. Enter `{ ... }` (block vs switch_block vs object literal)
        if k == 'PUNCT' and v == '{':
            b_close = match.get(i, i)
            if i in pending_block_scope:
                b_sc = pending_block_scope[i]
                scope_stack.append((b_close, cur_scope, brace_kind.get(i, 'block')))
                cur_scope = b_sc
            else:
                prev_k, prev_v = (toks[i - 1][0], toks[i - 1][1]) if i > 0 else ('', '')
                is_block = False
                is_switch = False
                if i == 0:
                    is_block = True
                elif prev_k == 'PUNCT' and prev_v in (';', '{', '}', '=>'):
                    is_block = True
                elif prev_k == 'IDENT' and prev_v in ('else', 'do', 'try', 'finally'):
                    is_block = True
                elif prev_k == 'PUNCT' and prev_v == ')':
                    open_p = match.get(i - 1, -1)
                    if open_p > 0 and toks[open_p - 1][0] == 'IDENT':
                        kw = toks[open_p - 1][1]
                        if kw in ('if', 'while', 'for', 'catch', 'with'):
                            is_block = True
                        elif kw == 'switch':
                            is_block = True
                            is_switch = True
                elif prev_k == 'PUNCT' and prev_v == ':':
                    # Only a block inside a switch case (`case X: {` or `default: {`), NEVER after a ternary `:`!
                    if scope_stack and scope_stack[-1][2] == 'switch_block':
                        is_block = True

                if is_block:
                    kind_b = 'switch_block' if is_switch else 'block'
                    brace_kind[i] = kind_b
                    b_sc = new_scope(cur_scope, is_fn=False)
                    scope_stack.append((b_close, cur_scope, kind_b))
                    cur_scope = b_sc
                else:
                    brace_kind[i] = 'obj'
                    j = i + 1
                    d = 0
                    while j < b_close:
                        jk, jv, _, _ = toks[j]
                        if jk == 'PUNCT':
                            if jv in '([{':
                                d += 1
                            elif jv in ')]}':
                                d -= 1
                        elif jk == 'IDENT' and d == 0:
                            prev_ok = (j == i + 1) or (toks[j - 1][0] == 'PUNCT' and toks[j - 1][1] == ',')
                            if prev_ok and j + 1 < b_close and toks[j + 1][0] == 'PUNCT' and toks[j + 1][1] == ':':
                                prop_key_indices.add(j)
                            elif prev_ok and j + 1 < b_close and toks[j + 1][0] == 'PUNCT' and toks[j + 1][1] == '(':
                                mp_close = match.get(j + 1, j + 1)
                                if mp_close + 1 < b_close and toks[mp_close + 1][0] == 'PUNCT' and toks[mp_close + 1][1] == '{':
                                    prop_key_indices.add(j)
                                    m_sc = new_scope(cur_scope, is_fn=True)
                                    p_idx = j + 2
                                    while p_idx < mp_close:
                                        pe = p_idx
                                        md = 0
                                        while pe < mp_close:
                                            ev = toks[pe][1]
                                            if toks[pe][0] == 'PUNCT':
                                                if ev in '([{':
                                                    md += 1
                                                elif ev in ')]}':
                                                    md -= 1
                                                elif ev in (',', '=') and md == 0:
                                                    break
                                            pe += 1
                                        collect_pattern_bindings(p_idx, pe, scopes[m_sc]['vars'])
                                        p_idx = pe + 1
                                    pending_block_scope[mp_close + 1] = m_sc
                                    brace_kind[mp_close + 1] = 'fn_block'
                        j += 1
                    scope_stack.append((b_close, cur_scope, 'obj'))
            i += 1
            continue

        i += 1

    def is_declared(name, sid):
        cur = sid
        while cur is not None:
            if name in scopes[cur]['vars']:
                return True
            cur = scopes[cur]['parent']
        return False

    undeclared = []
    for idx, (k, v, ln, cl) in enumerate(toks):
        if k != 'IDENT':
            continue
        if v in JS_KEYWORDS or v in allowed_globals:
            continue
        if idx in binding_token_indices or idx in prop_key_indices:
            continue
        if idx > 0 and toks[idx - 1][0] == 'PUNCT' and toks[idx - 1][1] in ('.', '?.'):
            continue
        if idx > 0 and toks[idx - 1][0] == 'IDENT' and toks[idx - 1][1] in ('break', 'continue'):
            continue
        if idx + 1 < n and toks[idx + 1][0] == 'PUNCT' and toks[idx + 1][1] == ':':
            if idx + 2 < n and toks[idx + 2][0] == 'IDENT' and toks[idx + 2][1] in ('for', 'while', 'do'):
                continue
        if not is_declared(v, token_scope[idx]):
            undeclared.append((v, ln, cl))

    return undeclared


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

    # 2. Strict JS lexer + full lexical-scope no-undef check across all source scripts!
    clean_by_file = {}
    raw_by_file = {}
    for src in script_srcs:
        rel = src.lstrip('./')
        raw = read_f(rel)
        raw_by_file[rel] = raw
        clean_by_file[rel] = verify_js_lexer(rel, raw, require_iife=True)
        undefs = check_undeclared_identifiers(rel, raw)
        if undefs:
            preview = ', '.join(f"'{u[0]}'@{u[1]}:{u[2]}" for u in undefs[:8])
            raise AssertionError(f"{rel}: Undeclared identifier(s) detected (no-undef): {preview}")

    # Also verify tools/headless_verify.js if present
    headless_rel = 'tools/headless_verify.js'
    if os.path.exists(os.path.join(project_root, headless_rel)):
        h_raw = read_f(headless_rel)
        verify_js_lexer(headless_rel, h_raw, require_iife=False)
        h_undefs = check_undeclared_identifiers(headless_rel, h_raw, extra_globals=NODE_GLOBALS)
        if h_undefs:
            preview = ', '.join(f"'{u[0]}'@{u[1]}:{u[2]}" for u in h_undefs[:8])
            raise AssertionError(f"{headless_rel}: Undeclared identifier(s): {preview}")

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
        for m in re.finditer(r'\bCB\s*\.\s*(\w+)\s*\.\s*(\w+)\b', code):
            mod, prop = m.group(1), m.group(2)
            assert mod in module_exports, f"{rel}: unknown module CB.{mod}"
            assert prop in module_exports[mod], f"{rel}: missing property CB.{mod}.{prop}"

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

    # 7. FPS / GC Hygiene Audit
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
    cb_src = raw_by_file['src/systems/combat.js']
    assert 'game.skillPacks.length >= 12' in cb_src, "combat.js missing skillPacks pool cap!"
    assert 'game.galeWaves.length >= 6' in cb_src, "combat.js missing galeWaves pool cap!"

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
            b_undefs = check_undeclared_identifiers('game.bundle.js', b_js)
            if b_undefs:
                preview = ', '.join(f"'{u[0]}'@{u[1]}:{u[2]}" for u in b_undefs[:8])
                raise AssertionError(f"game.bundle.js: Undeclared identifier(s): {preview}")
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
    print("✓ Curio Box v9.8.1 Automated Release Verification PASSED!")
    print(f"  - JS Modules verified     : {res['scripts']} (syntax / IIFE / full no-undef / zero-ESM)")
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
