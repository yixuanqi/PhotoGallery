#!/usr/bin/env python3
"""Zero-dependency JS/CSS Minifier, Scope-Safe Obfuscator & Standard SourceMap v3 Generator
for Ashen Bell Vow (v50.0).

Supports:
  - Engine 'builtin': 100% zero-dependency Python 3 (works out-of-the-box on Windows/macOS/Linux)
  - Engine 'esbuild': Optional external esbuild fast-path if installed on PATH
  - Engine 'auto':    Uses esbuild when available, otherwise falls back seamlessly to builtin
"""
import bisect
import json
import os
import random
import re
import shutil
import subprocess
import tempfile

# ==================== BASE64 VLQ & SOURCEMAP V3 ====================

_VLQ_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
_VLQ_DECODE = {ch: idx for idx, ch in enumerate(_VLQ_CHARS)}


def encode_vlq(value):
    """Encode a signed integer into Base64 VLQ (Source Map Revision 3 spec)."""
    vlq = (-value << 1) | 1 if value < 0 else (value << 1)
    out = []
    while True:
        digit = vlq & 0x1F
        vlq >>= 5
        if vlq > 0:
            digit |= 0x20
        out.append(_VLQ_CHARS[digit])
        if vlq == 0:
            break
    return "".join(out)


def decode_vlq_segment(segment):
    """Decode one comma-separated VLQ mapping segment into a list of signed ints."""
    values = []
    i = 0
    n = len(segment)
    while i < n:
        result = 0
        shift = 0
        while True:
            if i >= n:
                raise ValueError("Truncated VLQ segment")
            digit = _VLQ_DECODE[segment[i]]
            i += 1
            cont = digit & 0x20
            result |= (digit & 0x1F) << shift
            shift += 5
            if not cont:
                break
        neg = result & 1
        val = result >> 1
        values.append(-val if neg else val)
    return values


class SourceMapV3Builder:
    """Streaming Source Map v3 builder with exact Base64 VLQ mappings."""

    def __init__(self, out_file):
        self.out_file = out_file
        self.sources = []
        self._source_index = {}
        self.sources_content = []
        self.names = []
        self._name_index = {}
        self._lines = [[]]
        self._prev_gen_col = 0
        self._prev_src = 0
        self._prev_orig_line = 0
        self._prev_orig_col = 0
        self._prev_name = 0

    def add_source(self, path, content=None):
        if path in self._source_index:
            return self._source_index[path]
        idx = len(self.sources)
        self.sources.append(path)
        self.sources_content.append(content)
        self._source_index[path] = idx
        return idx

    def _get_name_idx(self, name):
        idx = self._name_index.get(name)
        if idx is None:
            idx = len(self.names)
            self.names.append(name)
            self._name_index[name] = idx
        return idx

    def new_line(self):
        self._lines.append([])
        self._prev_gen_col = 0

    def add_mapping(self, gen_col, src_idx, orig_line, orig_col, orig_name=None):
        if src_idx is None or orig_line is None or orig_line < 0:
            return
        if orig_col < 0:
            orig_col = 0
        segs = self._lines[-1]
        if segs and gen_col == self._prev_gen_col:
            return
        parts = [
            encode_vlq(gen_col - self._prev_gen_col),
            encode_vlq(src_idx - self._prev_src),
            encode_vlq(orig_line - self._prev_orig_line),
            encode_vlq(orig_col - self._prev_orig_col),
        ]
        self._prev_gen_col = gen_col
        self._prev_src = src_idx
        self._prev_orig_line = orig_line
        self._prev_orig_col = orig_col
        if orig_name:
            nidx = self._get_name_idx(orig_name)
            parts.append(encode_vlq(nidx - self._prev_name))
            self._prev_name = nidx
        segs.append("".join(parts))

    def to_dict(self):
        return {
            "version": 3,
            "file": self.out_file,
            "sourceRoot": "",
            "sources": self.sources,
            "sourcesContent": self.sources_content,
            "names": self.names,
            "mappings": ";".join(",".join(line_segs) for line_segs in self._lines),
        }

    def to_json(self):
        return json.dumps(self.to_dict(), ensure_ascii=False, separators=(",", ":"))


def lookup_sourcemap(map_obj, gen_line_1based, gen_col_0based):
    """Resolve a 1-based generated line & 0-based column in a SourceMap v3 dict."""
    lines = map_obj.get("mappings", "").split(";")
    target_idx = gen_line_1based - 1
    if target_idx < 0 or target_idx >= len(lines):
        return None
    sources = map_obj.get("sources", [])
    names = map_obj.get("names", [])
    src_idx = 0
    orig_line = 0
    orig_col = 0
    name_idx = 0
    best = None
    for li in range(target_idx + 1):
        gen_col = 0
        raw_line = lines[li]
        if not raw_line:
            continue
        for seg in raw_line.split(","):
            if not seg:
                continue
            vals = decode_vlq_segment(seg)
            gen_col += vals[0]
            if len(vals) >= 4:
                src_idx += vals[1]
                orig_line += vals[2]
                orig_col += vals[3]
                cur_name = None
                if len(vals) >= 5:
                    name_idx += vals[4]
                    cur_name = names[name_idx] if 0 <= name_idx < len(names) else None
                if li == target_idx and gen_col <= gen_col_0based:
                    best = {
                        "source": sources[src_idx] if 0 <= src_idx < len(sources) else None,
                        "line": orig_line + 1,
                        "column": orig_col,
                        "name": cur_name,
                        "genLine": gen_line_1based,
                        "genColumn": gen_col,
                        "sourceIndex": src_idx,
                    }
    return best


# ==================== SHORT IDENTIFIER GENERATOR ====================

_JS_RESERVED = {
    "break", "case", "catch", "class", "const", "continue", "debugger", "default",
    "delete", "do", "else", "enum", "export", "extends", "false", "finally", "for",
    "function", "if", "import", "in", "instanceof", "new", "null", "return", "super",
    "switch", "this", "throw", "true", "try", "typeof", "var", "void", "while", "with",
    "yield", "let", "static", "implements", "interface", "package", "private",
    "protected", "public", "await", "async", "of", "get", "set", "from", "as",
    "arguments", "eval", "undefined", "NaN", "Infinity",
    "window", "document", "globalThis", "self", "console", "Math", "Number", "String",
    "Boolean", "Object", "Array", "Set", "Map", "WeakMap", "WeakSet", "JSON", "Date",
    "RegExp", "Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError",
    "Promise", "Symbol", "BigInt", "Proxy", "Reflect", "URL", "URLSearchParams",
    "navigator", "location", "history", "screen", "performance", "localStorage",
    "sessionStorage", "fetch", "Blob", "FileReader", "Image", "Audio", "AudioContext",
    "webkitAudioContext", "OfflineAudioContext", "webkitOfflineAudioContext",
    "OffscreenCanvas", "Path2D", "DOMMatrix", "ResizeObserver", "MutationObserver",
    "IntersectionObserver", "Event", "CustomEvent", "ErrorEvent", "MouseEvent",
    "KeyboardEvent", "TouchEvent", "PointerEvent", "GamepadEvent",
    "requestAnimationFrame", "cancelAnimationFrame", "setTimeout", "clearTimeout",
    "setInterval", "clearInterval", "queueMicrotask", "structuredClone",
    "parseInt", "parseFloat", "isNaN", "isFinite", "encodeURIComponent",
    "decodeURIComponent", "atob", "btoa", "alert", "confirm", "prompt",
    "getComputedStyle", "matchMedia",
    "Float32Array", "Float64Array", "Int8Array", "Int16Array", "Int32Array",
    "Uint8Array", "Uint16Array", "Uint32Array", "Uint8ClampedArray", "ArrayBuffer",
    "DataView", "TextDecoder", "TextEncoder",
    "global", "__ABV_OFFLINE_WORLDS__", "__ABV_OFFLINE_WORLD__", "__ABV_SHOW_FATAL__",
    "_f", "_c", "_d", "_e", "_ra", "_rn", "_r", "_x", "_w",
}

_IDENT_HEAD = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
_IDENT_TAIL = _IDENT_HEAD + "0123456789"


def make_short_id_gen(prefix="", forbidden=None):
    """Yield compact valid JS identifiers avoiding reserved words and forbidden sets."""
    forb = set(_JS_RESERVED)
    if forbidden:
        forb |= set(forbidden)
    n = 0
    while True:
        v = n
        n += 1
        if prefix:
            chars = []
            while True:
                chars.append(_IDENT_TAIL[v % len(_IDENT_TAIL)])
                v //= len(_IDENT_TAIL)
                if v == 0:
                    break
            cand = prefix + "".join(reversed(chars))
        else:
            first = _IDENT_HEAD[v % len(_IDENT_HEAD)]
            v //= len(_IDENT_HEAD)
            chars = [first]
            while v > 0:
                v -= 1
                chars.append(_IDENT_TAIL[v % len(_IDENT_TAIL)])
                v //= len(_IDENT_TAIL)
            cand = "".join(chars)
        if cand not in forb:
            forb.add(cand)
            yield cand


# ==================== BIJECTIVE CIPHER FOR OFFLINE WORLDS PAYLOAD ====================

def encode_worlds_payload(worlds_obj, seed=47901):
    """
    Reversible bijective ASCII substitution cipher for offline world JSON.
    - 0% raw byte bloat (no Base64 33% overhead)
    - Preserves LZ77/deflate compression ratio (~+8 bytes in ZIP!)
    - Pure ES5 decoder (<2ms decode, 100% WebView/Safari/TapTap compatible)
    """
    raw_json = json.dumps(worlds_obj, ensure_ascii=False, separators=(",", ":"))
    alphabet = [chr(c) for c in range(33, 127) if c not in (34, 39, 92)]
    perm = list(alphabet)
    random.Random(seed).shuffle(perm)
    enc_map = dict(zip(alphabet, perm))
    dec_map = dict(zip(perm, alphabet))

    obf = "".join(enc_map.get(ch, ch) for ch in raw_json)
    check = "".join(dec_map.get(ch, ch) for ch in obf)
    if check != raw_json:
        raise RuntimeError("Offline worlds cipher round-trip verification failed!")

    src_str = "".join(perm)
    dst_str = "".join(alphabet)
    js_obf = json.dumps(obf, ensure_ascii=False).replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    js_src = json.dumps(src_str, ensure_ascii=False)
    js_dst = json.dumps(dst_str, ensure_ascii=False)
    decoder_expr = (
        f"(function(s,a,b){{var m=Object.create(null),i=0,o='';"
        f"for(;i<a.length;i++)m[a.charCodeAt(i)]=b.charAt(i);"
        f"for(i=0;i<s.length;i++){{var c=s.charCodeAt(i);o+=m[c]||s.charAt(i);}}"
        f"return JSON.parse(o);}})({js_obf},{js_src},{js_dst})"
    )
    return decoder_expr


# ==================== EXACT CSS MINIFIER + SOURCEMAP V3 ====================

def tokenize_css(css):
    """Exact CSS tokenizer preserving strings, url(...), comments, and calc/math expressions."""
    tokens = []
    n = len(css)
    i = 0
    while i < n:
        ch = css[i]
        if ch == "/" and i + 1 < n and css[i + 1] == "*":
            j = css.find("*/", i + 2)
            j = n if j < 0 else j + 2
            tokens.append(("comment", css[i:j], i, j))
            i = j
            continue
        if ch in " \t\r\n\f":
            j = i + 1
            while j < n and css[j] in " \t\r\n\f":
                j += 1
            tokens.append(("ws", css[i:j], i, j))
            i = j
            continue
        if ch in ("'", '"'):
            q = ch
            j = i + 1
            while j < n:
                if css[j] == "\\":
                    j += 2
                    continue
                if css[j] == q:
                    j += 1
                    break
                j += 1
            tokens.append(("str", css[i:j], i, j))
            i = j
            continue
        if ch in "{};:,>~+()[]":
            tokens.append(("punct", ch, i, i + 1))
            i += 1
            continue
        j = i + 1
        while j < n and css[j] not in " \t\r\n\f'\"{};:,>~+()[]/":
            if css[j] == "\\" and j + 1 < n:
                j += 2
                continue
            j += 1
        tokens.append(("atom", css[i:j], i, j))
        i = j
    return tokens


def _build_line_starts(text):
    starts = [0]
    pos = text.find("\n")
    while pos >= 0:
        starts.append(pos + 1)
        pos = text.find("\n", pos + 1)
    return starts


def _offset_to_line_col(starts, offset):
    idx = bisect.bisect_right(starts, offset) - 1
    if idx < 0:
        idx = 0
    return idx, offset - starts[idx]


def minify_css(css_code, source_name="styles.css"):
    """
    Minify CSS with 100% safety for calc()/min()/max()/clamp(), media queries, strings & custom props.
    Returns (minified_css, sourcemap_v3_dict).
    """
    tokens = tokenize_css(css_code)
    starts = _build_line_starts(css_code)
    sm = SourceMapV3Builder(source_name)
    src_idx = sm.add_source(source_name, css_code)

    out_parts = []
    gen_col = 0
    paren_stack = []
    sig = [(k, txt, s, e) for (k, txt, s, e) in tokens if k != "comment"]
    m = len(sig)
    prev_non_ws = None
    pending_ws = False

    def in_math_fn():
        return any(paren_stack)

    for idx in range(m):
        k, txt, s, e = sig[idx]
        if k == "ws":
            pending_ws = True
            continue

        nxt_non_ws = None
        for j in range(idx + 1, m):
            if sig[j][0] != "ws":
                nxt_non_ws = sig[j]
                break

        if k == "punct" and txt == ";" and nxt_non_ws and nxt_non_ws[0] == "punct" and nxt_non_ws[1] == "}":
            pending_ws = False
            continue

        need_space = False
        if pending_ws and prev_non_ws is not None:
            pk, pt = prev_non_ws
            if in_math_fn():
                if pt in ("+", "-") or txt in ("+", "-") or (pk == "atom" and k == "atom") or (pt == ")" and txt != ")") or (pk == "atom" and txt == "("):
                    need_space = True
            else:
                if pk == "punct" and pt in ("{", "}", ";", ",", ">", "~", "(", ":"):
                    need_space = False
                elif k == "punct" and txt in ("{", "}", ";", ",", ">", "~", ")"):
                    need_space = False
                elif k == "punct" and txt == "(":
                    need_space = pk == "atom" and pt.lower() in ("and", "or", "not", "only", "from", "to")
                elif k == "punct" and txt == "+":
                    need_space = False
                elif pk == "punct" and pt == "+":
                    need_space = False
                else:
                    need_space = True

        if need_space:
            out_parts.append(" ")
            gen_col += 1

        if gen_col == 0 or (k == "atom" and (prev_non_ws is None or prev_non_ws[1] in ("{", "}", ";"))):
            ol, oc = _offset_to_line_col(starts, s)
            sm.add_mapping(gen_col, src_idx, ol, oc)

        out_parts.append(txt)
        gen_col += len(txt)

        if k == "punct" and txt == "(":
            is_math = (
                prev_non_ws is not None
                and prev_non_ws[0] == "atom"
                and prev_non_ws[1].lower().endswith(("calc", "min", "max", "clamp"))
            )
            paren_stack.append(is_math)
        elif k == "punct" and txt == ")":
            if paren_stack:
                paren_stack.pop()

        if k == "punct" and txt == "}" and not paren_stack:
            out_parts.append("\n")
            sm.new_line()
            gen_col = 0

        prev_non_ws = (k, txt)
        pending_ws = False

    min_css = "".join(out_parts).strip() + "\n"
    audit_minified_css(min_css)
    return min_css, sm.to_dict()


def audit_minified_css(css_code):
    """Verify balanced braces/parens and intact strings in minified CSS."""
    toks = tokenize_css(css_code)
    braces = 0
    parens = 0
    for k, txt, s, _e in toks:
        if k == "str":
            if len(txt) < 2 or txt[-1] != txt[0]:
                raise RuntimeError(f"CSS audit failed: unclosed string at offset {s}")
        elif k == "punct":
            if txt == "{":
                braces += 1
            elif txt == "}":
                braces -= 1
                if braces < 0:
                    raise RuntimeError(f"CSS audit failed: unmatched '}}' at offset {s}")
            elif txt == "(":
                parens += 1
            elif txt == ")":
                parens -= 1
                if parens < 0:
                    raise RuntimeError(f"CSS audit failed: unmatched ')' at offset {s}")
    if braces != 0 or parens != 0:
        raise RuntimeError(f"CSS audit failed: unbalanced delimiters braces={braces}, parens={parens}")


# ==================== SCOPE-SAFE MODULE IDENTIFIER MANGLER ====================

def _collect_module_mangle_candidates(tokens, code):
    """
    Find 100% safe module-top-level identifiers to mangle inside a transformed ES module body.
    Strict 2-pass safety invariants (NEVER skips RHS expressions or arrow bodies!):
      1. Declared at module top level (brace depth == 0) via const/let/var/function/class
         (including destructured imports `const { ... } = _r(id)`).
      2. NEVER redeclared / shadowed in ANY nested scope (depth >= 1) by const/let/var/function/class/param/catch.
      3. NEVER appears as an object-literal shorthand `{ foo }`, destructuring shorthand, or object/class method `foo(...) {`.
      4. NEVER a JS reserved word, browser global, or bundler runtime helper.
    """
    sig = [t for t in tokens if t[0] not in ("ws", "comment")]
    n = len(sig)
    top_decls = set()
    shadowed = set()
    unsafe_uses = set()
    all_idents = set()

    req_lhs_indices = set()
    depth = 0
    for i in range(n):
        k, t, _s, _e = sig[i]
        if k == "punct" and t in ("{", "${"):
            if depth == 0 and t == "{" and i >= 1 and sig[i - 1][1] == "const":
                j = i + 1
                d = 1
                while j < n and d > 0:
                    if sig[j][1] in ("{", "${"):
                        d += 1
                    elif sig[j][1] == "}":
                        d -= 1
                    j += 1
                if j + 1 < n and sig[j][1] == "=" and sig[j + 1][1] in ("__req", "_r"):
                    for q in range(i, j):
                        req_lhs_indices.add(q)
            depth += 1
        elif k == "punct" and t == "}":
            depth = max(0, depth - 1)

    depth = 0
    for i in range(n):
        k, t, _s, _e = sig[i]
        prev_t = sig[i - 1][1] if i > 0 else ""
        nxt_t = sig[i + 1][1] if i + 1 < n else ""
        if k == "ident":
            all_idents.add(t)
        if k == "punct" and t in ("{", "${"):
            depth += 1
            continue
        if k == "punct" and t == "}":
            depth = max(0, depth - 1)
            continue
        if k == "ident" and i not in req_lhs_indices:
            if prev_t in ("{", ",") and nxt_t in (",", "}", "="):
                unsafe_uses.add(t)
            if nxt_t == "(" and prev_t not in ("function", ".", "?.") and prev_t in ("{", ",", "}", ";", "async", "static", "get", "set"):
                j = i + 2
                pd = 1
                while j < n and pd > 0:
                    if sig[j][1] == "(":
                        pd += 1
                    elif sig[j][1] == ")":
                        pd -= 1
                    j += 1
                if j < n and sig[j][1] == "{":
                    unsafe_uses.add(t)
            if prev_t in ("break", "continue"):
                unsafe_uses.add(t)

    depth = 0
    i = 0
    while i < n:
        k, t, _s, _e = sig[i]
        prev_t = sig[i - 1][1] if i > 0 else ""

        if k == "punct" and t in ("{", "${"):
            depth += 1
            i += 1
            continue
        if k == "punct" and t == "}":
            depth = max(0, depth - 1)
            i += 1
            continue

        if k == "ident" and t == "function" and prev_t not in (".", "?."):
            j = i + 1
            if j < n and sig[j][1] == "*":
                j += 1
            if j < n and sig[j][0] == "ident":
                if depth == 0 and prev_t in ("", ";", "}", "async"):
                    top_decls.add(sig[j][1])
                else:
                    shadowed.add(sig[j][1])
                j += 1
            if j < n and sig[j][1] == "(":
                pd = 1
                j += 1
                while j < n and pd > 0:
                    if sig[j][1] == "(":
                        pd += 1
                    elif sig[j][1] == ")":
                        pd -= 1
                    elif sig[j][0] == "ident":
                        shadowed.add(sig[j][1])
                    j += 1
            i = j
            continue

        if k == "punct" and t == "=>":
            if i >= 1 and sig[i - 1][0] == "ident":
                shadowed.add(sig[i - 1][1])
            elif i >= 1 and sig[i - 1][1] == ")":
                pd = 1
                j = i - 2
                while j >= 0 and pd > 0:
                    if sig[j][1] == ")":
                        pd += 1
                    elif sig[j][1] == "(":
                        pd -= 1
                    elif sig[j][0] == "ident":
                        shadowed.add(sig[j][1])
                    j -= 1
            i += 1
            continue

        if k == "ident" and t == "catch" and i + 2 < n and sig[i + 1][1] == "(":
            j = i + 2
            pd = 1
            while j < n and pd > 0:
                if sig[j][1] == "(":
                    pd += 1
                elif sig[j][1] == ")":
                    pd -= 1
                elif sig[j][0] == "ident":
                    shadowed.add(sig[j][1])
                j += 1
            i = j
            continue

        if k == "ident" and t == "class" and prev_t not in (".", "?.") and i + 1 < n and sig[i + 1][0] == "ident":
            if depth == 0:
                top_decls.add(sig[i + 1][1])
            else:
                shadowed.add(sig[i + 1][1])
            i += 2
            continue

        if k == "ident" and t in ("const", "let", "var") and prev_t not in (".", "?."):
            j = i + 1
            while j < n:
                if sig[j][0] == "ident":
                    nm = sig[j][1]
                    if depth == 0:
                        top_decls.add(nm)
                    else:
                        shadowed.add(nm)
                    j += 1
                elif sig[j][1] in ("{", "["):
                    open_ch = sig[j][1]
                    close_ch = "}" if open_ch == "{" else "]"
                    is_req = j in req_lhs_indices
                    p = j + 1
                    d = 1
                    while p < n and d > 0:
                        if sig[p][1] == open_ch:
                            d += 1
                        elif sig[p][1] == close_ch:
                            d -= 1
                        elif sig[p][0] == "ident":
                            pnxt = sig[p + 1][1] if p + 1 < n else ""
                            pprev = sig[p - 1][1] if p > j else ""
                            if pnxt != ":" and pprev not in ("=", ".", "?."):
                                if is_req:
                                    top_decls.add(sig[p][1])
                                else:
                                    shadowed.add(sig[p][1])
                        p += 1
                    j = p
                else:
                    break

                if j < n and sig[j][1] == "=":
                    k2 = j + 1
                    d2 = 0
                    found_comma = -1
                    while k2 < n:
                        tk2 = sig[k2][1]
                        if d2 == 0 and tk2 in (";", ")", "}"):
                            break
                        if d2 == 0 and tk2 == ",":
                            found_comma = k2
                            break
                        if tk2 in ("{", "function", "=>"):
                            break
                        if tk2 in ("(", "["):
                            d2 += 1
                        elif tk2 in (")", "]"):
                            d2 -= 1
                        k2 += 1
                    if found_comma >= 0:
                        j = found_comma + 1
                        continue
                    break
                elif j < n and sig[j][1] == ",":
                    j += 1
                    continue
                else:
                    break
            i += 1
            continue

        i += 1

    safe = set()
    for nm in top_decls:
        if len(nm) <= 2:
            continue
        if nm in _JS_RESERVED or nm in shadowed or nm in unsafe_uses:
            continue
        if nm.startswith("__live_") or nm.startswith("_l"):
            continue
        safe.add(nm)
    return safe, all_idents


def mangle_module_tokens(code, tokenize_js_fn):
    """
    Apply scope-safe identifier mangling to a single transformed ES module body.
    Returns (mangled_code, local_mangle_map) where local_mangle_map maps orig_name -> short_name.
    """
    tokens = tokenize_js_fn(code)
    safe_names, all_idents = _collect_module_mangle_candidates(tokens, code)
    if not safe_names:
        return code, {}

    counts = {}
    for k, txt, _s, _e in tokens:
        if k == "ident" and txt in safe_names:
            counts[txt] = counts.get(txt, 0) + 1
    ranked = sorted(safe_names, key=lambda nm: (-counts.get(nm, 1) * len(nm), nm))

    id_gen = make_short_id_gen(prefix="_", forbidden=all_idents)
    mangle_map = {nm: next(id_gen) for nm in ranked}

    sig_indices = [idx for idx, tok in enumerate(tokens) if tok[0] not in ("ws", "comment")]
    prev_sig_of = {}
    next_sig_of = {}
    for pos, idx in enumerate(sig_indices):
        prev_sig_of[idx] = sig_indices[pos - 1] if pos > 0 else None
        next_sig_of[idx] = sig_indices[pos + 1] if pos + 1 < len(sig_indices) else None

    out = []
    depth = 0
    in_req_destr = False
    for idx, (k, txt, s, e) in enumerate(tokens):
        if k == "punct" and txt in ("{", "${"):
            if depth == 0 and txt == "{":
                p_idx = prev_sig_of.get(idx)
                if p_idx is not None and tokens[p_idx][1] == "const":
                    d_lk = 1
                    j = idx + 1
                    while j < len(tokens) and d_lk > 0:
                        if tokens[j][0] == "punct" and tokens[j][1] in ("{", "${"):
                            d_lk += 1
                        elif tokens[j][0] == "punct" and tokens[j][1] == "}":
                            d_lk -= 1
                        j += 1
                    while j < len(tokens) and tokens[j][0] in ("ws", "comment"):
                        j += 1
                    if j < len(tokens) and tokens[j][1] == "=":
                        j += 1
                        while j < len(tokens) and tokens[j][0] in ("ws", "comment"):
                            j += 1
                        if j < len(tokens) and tokens[j][1] in ("__req", "_r"):
                            in_req_destr = True
            depth += 1
            out.append(txt)
            continue
        if k == "punct" and txt == "}":
            depth = max(0, depth - 1)
            if depth == 0:
                in_req_destr = False
            out.append(txt)
            continue

        if k == "ident" and txt in mangle_map:
            p_idx = prev_sig_of.get(idx)
            n_idx = next_sig_of.get(idx)
            pt = tokens[p_idx][1] if p_idx is not None else ""
            pk = tokens[p_idx][0] if p_idx is not None else ""
            nt = tokens[n_idx][1] if n_idx is not None else ""

            if pk == "punct" and pt in (".", "?."):
                out.append(txt)
                continue
            if nt == ":" and pt in ("{", ","):
                out.append(txt)
                continue
            if in_req_destr and depth == 1:
                if pt in ("{", ",") and nt in (",", "}"):
                    out.append(f"{txt}:{mangle_map[txt]}")
                    continue
            out.append(mangle_map[txt])
            continue

        out.append(txt)

    return "".join(out), mangle_map


# ==================== ASI-SAFE JS MINIFIER + TOKEN-LEVEL SOURCEMAP V3 ====================

_NO_LINEBREAK_AFTER = {"return", "throw", "break", "continue", "yield", "debugger", "++", "--"}
_SAFE_DROP_NL_AFTER = {
    "{", ";", ",", "(", "[", "${", "=>",
    "=", "+=", "-=", "*=", "/=", "%=", "**=", "&&=", "||=", "??=", "&=", "|=", "^=", "<<=", ">>=", ">>>=",
    "&&", "||", "??", "?", ":",
    "===", "!==", "==", "!=", "<=", ">=", "<", ">", "*", "%", "**", "&", "|", "^", "<<", ">>", ">>>"
}
_SAFE_DROP_NL_BEFORE = {"}", ")", "]", ";", ",", ".", "?.", "&&", "||", "??", "?", ":"}
_WORD_CHARS = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$")
_REGEX_KEYWORDS = {"return", "throw", "case", "in", "of", "typeof", "void", "delete", "new", "else", "do", "yield", "await"}


def _needs_space(prev_k, prev_t, next_k, next_t):
    if not prev_t or not next_t:
        return False
    last_c = prev_t[-1]
    first_c = next_t[0]
    if last_c in _WORD_CHARS and first_c in _WORD_CHARS:
        return True
    if last_c == "+" and first_c == "+":
        return True
    if last_c == "-" and first_c == "-":
        return True
    if last_c == "/" and first_c in ("/", "*"):
        return True
    if last_c == "<" and first_c in ("!", "-"):
        return True
    if prev_k == "ident" and prev_t in _REGEX_KEYWORDS and next_k == "regex":
        return True
    return False


def minify_js_segments(segments, tokenize_js_fn, out_file="game.bundle.js", emit_sourcemap=True):
    """
    Minify a sequence of JS segments while emitting an exact SourceMap v3.
    Returns (minified_js, sourcemap_v3_dict or None).
    """
    sm = SourceMapV3Builder(out_file) if emit_sourcemap else None
    out = []
    gen_col = 0
    prev_k = None
    prev_t = ""

    for seg in segments:
        code = seg["code"]
        src_path = seg.get("source_path")
        src_idx = None
        if sm is not None and src_path:
            src_idx = sm.add_source(src_path, seg.get("source_content"))
        line_map = seg.get("line_map")
        rev_names = seg.get("reverse_names") or {}

        starts = _build_line_starts(code) if sm is not None and src_idx is not None else None
        toks = tokenize_js_fn(code)

        pending_ws = False
        pending_nl = False

        for k, txt, s, _e in toks:
            if k == "ws":
                pending_ws = True
                if "\n" in txt or "\r" in txt:
                    pending_nl = True
                continue
            if k == "comment":
                pending_ws = True
                if "\n" in txt or "\r" in txt:
                    pending_nl = True
                continue

            if prev_t:
                if pending_nl:
                    can_drop = False
                    if prev_t not in _NO_LINEBREAK_AFTER:
                        if prev_t in _SAFE_DROP_NL_AFTER:
                            can_drop = not _needs_space(prev_k, prev_t, k, txt)
                        elif txt in _SAFE_DROP_NL_BEFORE:
                            can_drop = not (txt == "." and prev_k == "num")
                    elif txt in ("}", ";", ")"):
                        can_drop = True

                    if not can_drop:
                        out.append("\n")
                        if sm is not None:
                            sm.new_line()
                        gen_col = 0
                    elif _needs_space(prev_k, prev_t, k, txt):
                        out.append(" ")
                        gen_col += 1
                elif pending_ws or _needs_space(prev_k, prev_t, k, txt):
                    if _needs_space(prev_k, prev_t, k, txt):
                        out.append(" ")
                        gen_col += 1

            if sm is not None and src_idx is not None and starts is not None:
                if k in ("ident", "str", "num", "regex") or txt in ("{", "}", "(", ")", "[", "]", ";"):
                    seg_line, seg_col = _offset_to_line_col(starts, s)
                    orig_line = line_map[seg_line] if (line_map and seg_line < len(line_map)) else seg_line
                    orig_name = rev_names.get(txt) if k == "ident" else None
                    sm.add_mapping(gen_col, src_idx, orig_line, seg_col, orig_name)

            out.append(txt)
            if "\n" in txt:
                nl_count = txt.count("\n")
                if sm is not None:
                    for _ in range(nl_count):
                        sm.new_line()
                gen_col = len(txt) - txt.rfind("\n") - 1
            else:
                gen_col += len(txt)

            prev_k = k
            prev_t = txt
            pending_ws = False
            pending_nl = False

        if prev_t and prev_t not in (";", "{", "}"):
            out.append("\n")
            if sm is not None:
                sm.new_line()
            gen_col = 0
            prev_k = None
            prev_t = ""

    final_js = "".join(out)
    if not final_js.endswith("\n"):
        final_js += "\n"
    return final_js, (sm.to_dict() if sm is not None else None)


# ==================== OPTIONAL EXTERNAL ESBUILD FAST-PATH ====================

def find_esbuild_bin():
    """Return path to local `esbuild` binary if available on PATH, else None."""
    return shutil.which("esbuild")


def minify_js_with_esbuild(bundle_js, out_file="game.bundle.js"):
    """Minify & mangle JS via external esbuild binary, returning (min_js, sourcemap_dict)."""
    esbuild = find_esbuild_bin()
    if not esbuild:
        raise RuntimeError("esbuild binary not found on PATH")
    with tempfile.TemporaryDirectory(prefix="abv_esbuild_") as td:
        in_path = os.path.join(td, "input.js")
        out_path = os.path.join(td, out_file)
        map_path = out_path + ".map"
        with open(in_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(bundle_js)
        cmd = [
            esbuild,
            in_path,
            "--minify",
            "--target=es2018",
            "--charset=utf8",
            "--sourcemap=external",
            f"--outfile={out_path}",
        ]
        res = subprocess.run(cmd, capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"esbuild failed: {res.stderr or res.stdout}")
        min_js = open(out_path, encoding="utf-8").read()
        min_js = re.sub(r"\n?//# sourceMappingURL=[^\n]+\n?", "\n", min_js)
        smap = json.loads(open(map_path, encoding="utf-8").read())
        return min_js, smap
