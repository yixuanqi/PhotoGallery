#!/usr/bin/env python3
"""
Ashen Bell Vow — Multi-Platform Offline & Web Release Builder (Zero external dependencies)

Outputs into dist/:
  1. ashen_bell_vow_<ver>_taptap_offline.zip  -> TapTap / 4399 / file:// offline root ZIP
     (root index.html + styles.css + game.bundle.js; 0 ES modules, 0 fetch(), 0 CORS, 0 dev files)
  2. ashen_bell_vow_<ver>_itch_web.zip        -> itch.io flat-root Web ZIP (runtime src/ + data/)
  3. ashen_bell_vow_<ver>_modular.zip         -> Full modular source & editor archive (for blog / dev)

Usage:
  python3 tools/build_release.py              # Run verifier + build all 3 release packages
  python3 tools/build_release.py --skip-verify
"""
import argparse
import json
import os
import re
import subprocess
import sys
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DIST_DIR = os.path.join(ROOT, "dist")
SOURCEMAP_DIR = os.path.join(DIST_DIR, "sourcemaps")
TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
if TOOLS_DIR not in sys.path:
    sys.path.insert(0, TOOLS_DIR)

from minify_obfuscate import (
    encode_worlds_payload,
    find_esbuild_bin,
    lookup_sourcemap,
    make_short_id_gen,
    mangle_module_tokens,
    minify_css,
    minify_js_segments,
    minify_js_with_esbuild,
)

# Keywords after which a `/` begins a RegExp literal rather than division
_REGEX_PREV_KEYWORDS = {
    "return", "case", "throw", "typeof", "void", "delete", "in", "of",
    "instanceof", "new", "else", "do", "yield", "await"
}
_REGEX_PREV_PUNCT = set("=(,[{:;!&|^~+-*%<>?")


def detect_version():
    idx_path = os.path.join(ROOT, "index.html")
    html = open(idx_path, encoding="utf-8").read()
    m = re.search(r"v(\d+\.\d+)", html)
    return ("v" + m.group(1)) if m else "v0.0"


def resolve_module_path(from_rel, spec):
    base = os.path.dirname(from_rel)
    return os.path.normpath(os.path.join(base, spec)).replace("\\", "/")


def tokenize_js(code):
    """
    Lightweight, accurate JS lexer supporting:
    - Line & block comments
    - Single & double quoted strings
    - Template literals with nested `${ ... }` expressions
    - RegExp literals (distinguished from division via previous token context)
    - Identifiers, numbers, and punctuation
    Returns list of (kind, text, start, end) where kind in:
      'ws', 'comment', 'str', 'regex', 'ident', 'num', 'punct'
    """
    tokens = []
    i = 0
    n = len(code)
    prev_sig = None  # (kind, text)
    tmpl_brace_stack = []
    brace_depth = 0

    def is_ident_start(ch):
        return ch.isalpha() or ch in "_$"

    def is_ident_part(ch):
        return ch.isalnum() or ch in "_$"

    def can_start_regex():
        if prev_sig is None:
            return True
        pk, pt = prev_sig
        if pk == "ident":
            return pt in _REGEX_PREV_KEYWORDS
        if pk == "punct":
            if pt in (")", "]", "++", "--"):
                return False
            if pt == "}":
                return True
            if pt == "=>":
                return True
            return pt[-1] in _REGEX_PREV_PUNCT
        return False

    while i < n:
        ch = code[i]
        nxt = code[i + 1] if i + 1 < n else ""

        # Whitespace
        if ch.isspace():
            j = i + 1
            while j < n and code[j].isspace():
                j += 1
            tokens.append(("ws", code[i:j], i, j))
            i = j
            continue

        # Line comment
        if ch == "/" and nxt == "/":
            j = i + 2
            while j < n and code[j] != "\n":
                j += 1
            tokens.append(("comment", code[i:j], i, j))
            i = j
            continue

        # Block comment
        if ch == "/" and nxt == "*":
            j = i + 2
            while j + 1 < n and not (code[j] == "*" and code[j + 1] == "/"):
                j += 1
            j = min(n, j + 2)
            tokens.append(("comment", code[i:j], i, j))
            i = j
            continue

        # Strings
        if ch in ("'", '"'):
            q = ch
            j = i + 1
            while j < n:
                if code[j] == "\\":
                    j += 2
                    continue
                if code[j] == q:
                    j += 1
                    break
                j += 1
            tok = ("str", code[i:j], i, j)
            tokens.append(tok)
            prev_sig = ("str", q)
            i = j
            continue

        # Template literal start
        if ch == "`":
            j = i + 1
            while j < n:
                if code[j] == "\\":
                    j += 2
                    continue
                if code[j] == "$" and j + 1 < n and code[j + 1] == "{":
                    tokens.append(("str", code[i:j], i, j))
                    tokens.append(("punct", "${", j, j + 2))
                    tmpl_brace_stack.append(brace_depth)
                    brace_depth += 1
                    prev_sig = ("punct", "${")
                    i = j + 2
                    break
                if code[j] == "`":
                    j += 1
                    tokens.append(("str", code[i:j], i, j))
                    prev_sig = ("str", "`")
                    i = j
                    break
                j += 1
            else:
                tokens.append(("str", code[i:n], i, n))
                i = n
            continue

        # Closing brace (may resume a template literal!)
        if ch == "}":
            brace_depth = max(0, brace_depth - 1)
            if tmpl_brace_stack and brace_depth == tmpl_brace_stack[-1]:
                tmpl_brace_stack.pop()
                tokens.append(("punct", "}", i, i + 1))
                j = i + 1
                start_seg = j
                while j < n:
                    if code[j] == "\\":
                        j += 2
                        continue
                    if code[j] == "$" and j + 1 < n and code[j + 1] == "{":
                        tokens.append(("str", code[start_seg:j], start_seg, j))
                        tokens.append(("punct", "${", j, j + 2))
                        tmpl_brace_stack.append(brace_depth)
                        brace_depth += 1
                        prev_sig = ("punct", "${")
                        i = j + 2
                        break
                    if code[j] == "`":
                        j += 1
                        tokens.append(("str", code[start_seg:j], start_seg, j))
                        prev_sig = ("str", "`")
                        i = j
                        break
                    j += 1
                else:
                    tokens.append(("str", code[start_seg:n], start_seg, n))
                    i = n
                continue
            tokens.append(("punct", "}", i, i + 1))
            prev_sig = ("punct", "}")
            i += 1
            continue

        if ch == "{":
            brace_depth += 1
            tokens.append(("punct", "{", i, i + 1))
            prev_sig = ("punct", "{")
            i += 1
            continue

        # RegExp literal vs division
        if ch == "/" and can_start_regex():
            j = i + 1
            in_class = False
            while j < n:
                c2 = code[j]
                if c2 == "\\":
                    j += 2
                    continue
                if c2 == "[":
                    in_class = True
                elif c2 == "]":
                    in_class = False
                elif c2 == "/" and not in_class:
                    j += 1
                    while j < n and code[j].isalpha():
                        j += 1
                    break
                elif c2 == "\n":
                    break
                j += 1
            tokens.append(("regex", code[i:j], i, j))
            prev_sig = ("regex", "/")
            i = j
            continue

        # Identifier
        if is_ident_start(ch):
            j = i + 1
            while j < n and is_ident_part(code[j]):
                j += 1
            txt = code[i:j]
            tokens.append(("ident", txt, i, j))
            prev_sig = ("ident", txt)
            i = j
            continue

        # Number
        if ch.isdigit() or (ch == "." and nxt.isdigit()):
            j = i + 1
            while j < n and (code[j].isalnum() or code[j] in "._"):
                j += 1
            tokens.append(("num", code[i:j], i, j))
            prev_sig = ("num", code[i:j])
            i = j
            continue

        # Multi-char punctuation
        if code[i:i + 2] in ("=>", "++", "--", "==", "!=", "<=", ">=", "&&", "||", "??", "**"):
            txt = code[i:i + 2]
            tokens.append(("punct", txt, i, i + 2))
            prev_sig = ("punct", txt)
            i += 2
            continue

        tokens.append(("punct", ch, i, i + 1))
        prev_sig = ("punct", ch)
        i += 1

    return tokens


def parse_named_specifiers(spec_str):
    """Parse `a, b as c, d` into list of (imported_or_local, alias)."""
    res = []
    for raw in spec_str.split(","):
        item = raw.strip()
        if not item:
            continue
        if " as " in item:
            a, b = item.split(" as ", 1)
            res.append((a.strip(), b.strip()))
        else:
            res.append((item, item))
    return res


def collect_runtime_modules(entry_rel="src/main.js"):
    """Topologically sort all ES modules reachable from entry_rel (asserts 0 cycles)."""
    visited = set()
    visiting = set()
    order = []
    sources = {}

    def dfs(rel):
        if rel in visited:
            return
        if rel in visiting:
            raise RuntimeError(f"Circular ES Module dependency detected at {rel}")
        visiting.add(rel)
        full = os.path.join(ROOT, rel)
        if not os.path.isfile(full):
            raise FileNotFoundError(f"Missing runtime JS module: {rel}")
        code = open(full, encoding="utf-8").read()
        sources[rel] = code
        for m in re.finditer(r"(?:import|export)\s+(?:[\s\S]*?)\s+from\s+['\"]([^'\"]+)['\"]", code):
            dep = resolve_module_path(rel, m.group(1))
            dfs(dep)
        visiting.remove(rel)
        visited.add(rel)
        order.append(rel)

    dfs(entry_rel)
    return order, sources


def find_live_let_exports(sources):
    """Map mod_rel -> set of `export let` / `export var` symbol names (live bindings)."""
    live_map = {}
    for rel, code in sources.items():
        syms = set(re.findall(r"^\s*export\s+(?:let|var)\s+([A-Za-z_$][\w$]*)\b", code, re.M))
        if syms:
            live_map[rel] = syms
    return live_map


def rewrite_live_ident_refs(code, live_ref_map):
    """
    Safely rewrite bare references to imported live bindings (e.g. WORLD_W -> __live_0.WORLD_W)
    using tokenize_js + bracket stack so strings, comments, regexes, `.prop`, `{ key: val }`,
    and comma-separated function args `fn(a, FLOOR_Y, b)` are handled with 100% accuracy.
    """
    if not live_ref_map:
        return code
    tokens = tokenize_js(code)
    sig_indices = [idx for idx, tok in enumerate(tokens) if tok[0] not in ("ws", "comment")]
    prev_sig_pos = {}
    next_sig_pos = {}
    for pos, idx in enumerate(sig_indices):
        prev_sig_pos[idx] = sig_indices[pos - 1] if pos > 0 else None
        next_sig_pos[idx] = sig_indices[pos + 1] if pos + 1 < len(sig_indices) else None

    # Track innermost container: '(' | '[' | 'obj' | 'block'
    _OBJ_PREV_PUNCT = set("=(,:[?!&|^~+-*<>")
    _OBJ_PREV_KW = {"return", "case", "throw", "yield", "await", "typeof", "void"}
    container_stack = []

    out = []
    for idx, (kind, txt, _s, _e) in enumerate(tokens):
        pi = prev_sig_pos.get(idx)
        ni = next_sig_pos.get(idx)
        prev_tok = tokens[pi] if pi is not None else None
        next_tok = tokens[ni] if ni is not None else None

        if kind == "punct":
            if txt in ("(", "["):
                container_stack.append(txt)
            elif txt == "${":
                container_stack.append("tmpl")
            elif txt == "{":
                is_obj = False
                if prev_tok is not None:
                    pk, pt = prev_tok[0], prev_tok[1]
                    if pk == "punct" and (pt == "=>" or pt[-1] in _OBJ_PREV_PUNCT):
                        is_obj = (pt != "=>")
                    elif pk == "ident" and pt in _OBJ_PREV_KW:
                        is_obj = True
                container_stack.append("obj" if is_obj else "block")
            elif txt in (")", "]", "}"):
                if container_stack:
                    container_stack.pop()
            out.append(txt)
            continue

        if kind == "ident" and txt in live_ref_map:
            in_obj = bool(container_stack and container_stack[-1] == "obj")
            # Skip property access (`obj.WORLD_W`)
            if prev_tok and prev_tok[0] == "punct" and prev_tok[1] == ".":
                out.append(txt)
                continue
            # Skip object literal property key (`{ WORLD_W: ... }`), but allow ternary `cond ? WORLD_W : 0`
            if in_obj and next_tok and next_tok[0] == "punct" and next_tok[1] == ":":
                if prev_tok and prev_tok[0] == "punct" and prev_tok[1] in ("{", ","):
                    out.append(txt)
                    continue
            # Handle ES6 shorthand property ONLY inside an object literal `{ ..., WORLD_W, ... }`
            if (in_obj and prev_tok and prev_tok[0] == "punct" and prev_tok[1] in ("{", ",")
                    and next_tok and next_tok[0] == "punct" and next_tok[1] in (",", "}")):
                out.append(f"{txt}: {live_ref_map[txt]}")
                continue
            out.append(live_ref_map[txt])
        else:
            out.append(txt)
    return "".join(out)


def transform_es_module(
    rel,
    code,
    live_exports_by_mod,
    module_id_map=None,
    export_key_map=None,
    short_runtime=False,
):
    """
    Transform a single ES module into a classic factory body `function(__req, __exports) { ... }`.
    Preserves exact ES Module live bindings, re-exports, star exports, hoisting, AND 1:1 original line numbers
    for accurate SourceMap v3 mapping!
    """
    req_fn = "_r" if short_runtime else "__req"
    exp_fn = "_e" if short_runtime else "__exp"
    exp_obj = "_x" if short_runtime else "__exports"
    reexp_all_fn = "_ra" if short_runtime else "__reexportAll"
    reexp_named_fn = "_rn" if short_runtime else "__reexportNamed"
    live_prefix = "_l" if short_runtime else "__live_"

    def fmt_mod_id(dep_rel):
        if module_id_map is not None:
            return str(module_id_map[dep_rel])
        return f"'{dep_rel}'"

    def fmt_exp_key(sym):
        if export_key_map is not None:
            return export_key_map[sym]
        return sym

    exported_locals = []
    required_pairs = []
    live_ref_map = {}
    live_counter = [0]
    exported_names = set()

    def _pad_newlines(orig_text, repl_text):
        diff = orig_text.count("\n") - repl_text.count("\n")
        return repl_text + ("\n" * diff if diff > 0 else "")

    def repl_import(m):
        spec_str = m.group(1)
        dep = resolve_module_path(rel, m.group(2))
        specs = parse_named_specifiers(spec_str)
        dep_live = live_exports_by_mod.get(dep, set())
        static_parts = []
        live_specs = []
        for orig, alias in specs:
            required_pairs.append((dep, orig))
            ek = fmt_exp_key(orig)
            if orig in dep_live:
                live_specs.append((orig, ek, alias))
            else:
                static_parts.append(ek if ek == alias else f"{ek}: {alias}")

        stmts = []
        if live_specs:
            var_name = f"{live_prefix}{live_counter[0]}"
            live_counter[0] += 1
            stmts.append(f"const {var_name} = {req_fn}({fmt_mod_id(dep)});")
            for _orig, ek, alias in live_specs:
                live_ref_map[alias] = f"{var_name}.{ek}"
            if static_parts:
                stmts.append(f"const {{ {', '.join(static_parts)} }} = {var_name};")
        elif static_parts:
            stmts.append(f"const {{ {', '.join(static_parts)} }} = {req_fn}({fmt_mod_id(dep)});")
        else:
            stmts.append(f"{req_fn}({fmt_mod_id(dep)});")
        return _pad_newlines(m.group(0), " ".join(stmts))

    body = re.sub(
        r"^[ \t]*import\s*\{([\s\S]*?)\}\s*from\s*['\"]([^'\"]+)['\"]\s*;?",
        repl_import,
        code,
        flags=re.M
    )

    def repl_export_star(m):
        dep = resolve_module_path(rel, m.group(1))
        required_pairs.append((dep, "*"))
        return _pad_newlines(m.group(0), f"{reexp_all_fn}({exp_obj}, {req_fn}({fmt_mod_id(dep)}));")

    body = re.sub(
        r"^[ \t]*export\s*\*\s*from\s*['\"]([^'\"]+)['\"]\s*;?",
        repl_export_star,
        body,
        flags=re.M
    )

    def repl_reexport_named(m):
        spec_str = m.group(1)
        dep = resolve_module_path(rel, m.group(2))
        specs = parse_named_specifiers(spec_str)
        pairs = []
        for orig, alias in specs:
            required_pairs.append((dep, orig))
            exported_names.add(alias)
            pairs.append(f"['{fmt_exp_key(orig)}','{fmt_exp_key(alias)}']")
        return _pad_newlines(m.group(0), f"{reexp_named_fn}({exp_obj}, {req_fn}({fmt_mod_id(dep)}), [{', '.join(pairs)}]);")

    body = re.sub(
        r"^[ \t]*export\s*\{([\s\S]*?)\}\s*from\s*['\"]([^'\"]+)['\"]\s*;?",
        repl_reexport_named,
        body,
        flags=re.M
    )

    def repl_export_local_block(m):
        specs = parse_named_specifiers(m.group(1))
        for local, alias in specs:
            exported_locals.append((alias, local))
            exported_names.add(alias)
        return "\n" * m.group(0).count("\n")

    body = re.sub(
        r"^[ \t]*export\s*\{([\s\S]*?)\}\s*;?",
        repl_export_local_block,
        body,
        flags=re.M
    )

    def repl_export_decl(m):
        indent = m.group(1)
        decl_kw = m.group(2)
        sym = m.group(3)
        exported_locals.append((sym, sym))
        exported_names.add(sym)
        return f"{indent}{decl_kw} {sym}"

    body = re.sub(
        r"^([ \t]*)export\s+(async\s+function|function|class|const|let|var)\s+([A-Za-z_$][\w$]*)\b",
        repl_export_decl,
        body,
        flags=re.M
    )

    if live_ref_map:
        body = rewrite_live_ident_refs(body, live_ref_map)

    if exported_locals:
        seen = set()
        entries = []
        for exp_name, loc_name in exported_locals:
            if exp_name in seen:
                continue
            seen.add(exp_name)
            ek = fmt_exp_key(exp_name)
            entries.append(f"  '{ek}': () => {loc_name}")
        body = body.rstrip() + f"\n{exp_fn}({exp_obj}, {{\n" + ",\n".join(entries) + "\n});\n"

    return body, exported_names, required_pairs


def _load_world_bundle_from_manifest(manifest_rel):
    world_path = os.path.join(ROOT, manifest_rel)
    world = json.load(open(world_path, encoding="utf-8"))
    rooms = []
    for entry in world.get("rooms", []):
        rf = os.path.join(ROOT, entry["file"].lstrip("./"))
        data = json.load(open(rf, encoding="utf-8"))
        merged = dict(data)
        for k in ("id", "zoneName", "name", "theme", "mirrored", "bounds", "connections"):
            if entry.get(k) is not None:
                merged[k] = entry[k]
        rooms.append(merged)
    return {"world": world, "rooms": rooms}


def load_offline_cycle_worlds():
    return {
        "1": _load_world_bundle_from_manifest("data/worlds/world_ng1.json"),
        "2": _load_world_bundle_from_manifest("data/worlds/world_ng2.json"),
        "3": _load_world_bundle_from_manifest("data/worlds/world_ng3.json"),
    }


def build_offline_bundle_js(version, minify=True, obfuscate=True, emit_sourcemap=True, engine="auto"):
    """
    Build the offline zero-module, zero-fetch single-file bundle (`game.bundle.js`).
    Returns dict: { "js", "order", "sourcemap", "symbols", "raw_bytes", "final_bytes", "engine_used" }.
    """
    order, sources = collect_runtime_modules("src/main.js")
    live_exports = find_live_let_exports(sources)
    cycle_worlds = load_offline_cycle_worlds()

    dry_exports = {}
    dry_requires = {}
    for rel in order:
        body_dry, exps_dry, reqs_dry = transform_es_module(rel, sources[rel], live_exports)
        dry_exports[rel] = exps_dry
        dry_requires[rel] = reqs_dry
    for rel in order:
        for dep, sym in dry_requires[rel]:
            if sym == "*":
                dry_exports[rel] |= dry_exports.get(dep, set())
    for rel in order:
        for dep, sym in dry_requires[rel]:
            if dep not in dry_exports:
                raise RuntimeError(f"Bundle error: {rel} requires missing module {dep}")
            if sym != "*" and sym not in dry_exports[dep]:
                raise RuntimeError(f"Bundle error: {rel} imports '{sym}' which is not exported by {dep}")

    module_id_map = {rel: idx for idx, rel in enumerate(order)} if obfuscate else None
    export_key_map = None
    if obfuscate:
        all_export_syms = sorted(set().union(*dry_exports.values()))
        ek_gen = make_short_id_gen(prefix="e")
        export_key_map = {sym: next(ek_gen) for sym in all_export_syms}

    short_rt = bool(obfuscate)
    def_fn = "_d" if short_rt else "__def"
    req_fn = "_r" if short_rt else "__req"
    exp_fn = "_e" if short_rt else "__exp"
    exp_obj = "_x" if short_rt else "__exports"
    reexp_all_fn = "_ra" if short_rt else "__reexportAll"
    reexp_named_fn = "_rn" if short_rt else "__reexportNamed"
    fac_var = "_f" if short_rt else "__factories"
    cac_var = "_c" if short_rt else "__cache"

    transformed = {}
    mangle_maps = {}
    raw_unminified_chars = 0

    for rel in order:
        body, _exps, _reqs = transform_es_module(
            rel,
            sources[rel],
            live_exports,
            module_id_map=module_id_map,
            export_key_map=export_key_map,
            short_runtime=short_rt,
        )
        for ln_no, ln in enumerate(body.splitlines(), 1):
            if re.match(r"^\s*(?:import|export)\s+", ln):
                raise RuntimeError(f"Bundle error: Untransformed ES module syntax in {rel}:{ln_no}: {ln}")
        raw_unminified_chars += len(body.encode("utf-8"))
        if obfuscate:
            body, local_mmap = mangle_module_tokens(body, tokenize_js)
            mangle_maps[rel] = local_mmap
        else:
            mangle_maps[rel] = {}
        transformed[rel] = body

    if obfuscate:
        worlds_expr = encode_worlds_payload(cycle_worlds, seed=47901)
    else:
        worlds_expr = json.dumps(cycle_worlds, ensure_ascii=False, separators=(",", ":"))
    raw_unminified_chars += len(json.dumps(cycle_worlds, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))

    header_code = (
        f"// Ashen Bell Vow {version} — Offline Production Bundle\n"
        "(function(global){\n"
        "'use strict';\n"
        f"global.__ABV_OFFLINE_WORLDS__={worlds_expr};\n"
        "global.__ABV_OFFLINE_WORLD__=global.__ABV_OFFLINE_WORLDS__['1'];\n"
        f"const {fac_var}=Object.create(null),{cac_var}=Object.create(null);\n"
        f"function {def_fn}(i,f){{{fac_var}[i]=f;}}\n"
        f"function {exp_fn}(t,g){{const k=Object.keys(g);for(let i=0;i<k.length;i++){{const a=k[i];Object.defineProperty(t,a,{{enumerable:true,configurable:true,get:g[a]}});}}}}\n"
        f"function {reexp_all_fn}(t,s){{const d=Object.getOwnPropertyDescriptors(s),k=Object.keys(d);for(let i=0;i<k.length;i++){{const a=k[i];if(!Object.prototype.hasOwnProperty.call(t,a))Object.defineProperty(t,a,d[a]);}}}}\n"
        f"function {reexp_named_fn}(t,s,p){{for(let i=0;i<p.length;i++){{const d=Object.getOwnPropertyDescriptor(s,p[i][0]);if(d)Object.defineProperty(t,p[i][1],d);}}}}\n"
        f"function {req_fn}(i){{if({cac_var}[i])return {cac_var}[i];const f={fac_var}[i];if(!f)throw new Error('Missing module: '+i);const e={{}};{cac_var}[i]=e;f({req_fn},e);return e;}}\n"
    )
    main_id = str(module_id_map["src/main.js"]) if module_id_map is not None else "'src/main.js'"
    footer_code = f"{req_fn}({main_id});\n}})(typeof window!=='undefined'?window:globalThis);\n"

    segments = [{"code": header_code, "source_path": None}]
    for rel in order:
        mid = str(module_id_map[rel]) if module_id_map is not None else f"'{rel}'"
        prefix_hdr = "" if obfuscate else f"// ===== MODULE: {rel} =====\n"
        segments.append({"code": f"{prefix_hdr}{def_fn}({mid},function({req_fn},{exp_obj}){{\n", "source_path": None})
        rev_names = {short_n: orig_n for orig_n, short_n in mangle_maps[rel].items()}
        segments.append({
            "code": transformed[rel],
            "source_path": rel,
            "source_content": sources[rel],
            "reverse_names": rev_names,
        })
        segments.append({"code": "});\n", "source_path": None})
    segments.append({"code": footer_code, "source_path": None})

    use_esbuild = False
    if minify:
        if engine == "esbuild":
            if not find_esbuild_bin():
                raise RuntimeError("--engine esbuild requested, but `esbuild` binary was not found on PATH.")
            use_esbuild = True
        elif engine == "auto" and find_esbuild_bin():
            use_esbuild = True

    sourcemap_obj = None
    engine_used = "none"
    if not minify:
        bundle_js = "".join(seg["code"] for seg in segments)
    elif use_esbuild:
        assembled = "".join(seg["code"] for seg in segments)
        bundle_js, sourcemap_obj = minify_js_with_esbuild(assembled, out_file="game.bundle.js")
        if not emit_sourcemap:
            sourcemap_obj = None
        engine_used = "esbuild"
    else:
        bundle_js, sourcemap_obj = minify_js_segments(
            segments, tokenize_js, out_file="game.bundle.js", emit_sourcemap=emit_sourcemap
        )
        engine_used = "builtin"
        # v50.1 Exact 100% token-stream parity audit between unminified and minified JS (catches any template/string mutation!)
        _raw_assembled = "".join(seg["code"] for seg in segments)
        _t_raw = [(k, t) for (k, t, _s, _e) in tokenize_js(_raw_assembled) if k not in ("ws", "comment")]
        _t_min = [(k, t) for (k, t, _s, _e) in tokenize_js(bundle_js) if k not in ("ws", "comment")]
        if _t_raw != _t_min:
            for _ti in range(min(len(_t_raw), len(_t_min))):
                if _t_raw[_ti] != _t_min[_ti]:
                    raise RuntimeError(f"Minifier token-parity audit failed at token #{_ti}: raw={_t_raw[_ti]!r} != min={_t_min[_ti]!r}")
            raise RuntimeError(f"Minifier token-parity length mismatch: raw={len(_t_raw)} != min={len(_t_min)}")

    audit_bundle_syntax(bundle_js)

    if sourcemap_obj is not None and engine_used == "builtin":
        gen_lines = bundle_js.splitlines()
        found_probe = False
        for cand_ln in range(2, min(len(gen_lines) + 1, 80)):
            p = lookup_sourcemap(sourcemap_obj, cand_ln, 0)
            if p and p.get("source"):
                found_probe = True
                break
        if not found_probe:
            raise RuntimeError("SourceMap v3 audit failed: no valid source mappings found in game.bundle.js.map!")

    symbols_manifest = {
        "version": version,
        "engine": engine_used,
        "minified": bool(minify),
        "obfuscated": bool(obfuscate),
        "modules": {str(v): k for k, v in module_id_map.items()} if module_id_map else {k: k for k in order},
        "exports": {v: k for k, v in export_key_map.items()} if export_key_map else {},
        "mangledCount": sum(len(m) for m in mangle_maps.values()),
    }

    return {
        "js": bundle_js,
        "order": order,
        "sourcemap": sourcemap_obj,
        "symbols": symbols_manifest,
        "raw_bytes": raw_unminified_chars,
        "final_bytes": len(bundle_js.encode("utf-8")),
        "engine_used": engine_used,
    }


def scan_duplicate_lexical_decls(code, label="bundle"):
    """
    Exact ES6 lexical-scope duplicate declaration scanner (v50.1).
    Detects duplicate const/let/class/import/param declarations in the same lexical block,
    properly balancing `${ ... }` template interpolations with `}`.
    """
    tokens = tokenize_js(code)
    sig = [t for t in tokens if t[0] not in ("ws", "comment")]
    n = len(sig)
    scopes = [{}]
    pending_params = None
    errors = []

    def add_binding(scope, name, kind, pos):
        ln = code.count("\n", 0, pos) + 1
        if name in scope:
            prev_k, prev_ln = scope[name]
            if kind in ("const", "let", "class", "import", "param") or prev_k in ("const", "let", "class", "import", "param"):
                errors.append(f"{label}: Duplicate lexical binding '{name}' in same scope ({prev_k} L{prev_ln} vs {kind} L{ln})")
        else:
            scope[name] = (kind, ln)

    def extract_binding_names(start_idx, end_idx):
        out = []
        k = start_idx
        stack = []
        expect = True
        while k < end_idx:
            tk, tt, ts, _ = sig[k]
            if not stack:
                if tk == "punct" and tt == "{":
                    stack.append("obj"); expect = True
                elif tk == "punct" and tt == "[":
                    stack.append("arr"); expect = True
                elif tk == "punct" and tt == "...":
                    pass
                elif tk == "punct" and tt == "=":
                    stack.append("expr")
                elif tk == "punct" and tt == ",":
                    expect = True
                elif expect and tk == "ident":
                    out.append((tt, ts))
                    expect = False
            else:
                top = stack[-1]
                if top == "expr":
                    if tk == "punct" and tt in ("(", "[", "{", "${"):
                        stack.append("expr")
                    elif tk == "punct" and tt in (")", "]", "}"):
                        stack.pop()
                    elif tk == "punct" and tt == "," and len(stack) == 1:
                        stack.pop()
                        expect = True
                elif top == "obj":
                    if tk == "punct" and tt == "}":
                        stack.pop()
                        if not stack: expect = False
                    elif tk == "punct" and tt == ",":
                        expect = True
                    elif tk == "punct" and tt == "=":
                        d2 = 0
                        k += 1
                        while k < end_idx:
                            ck, ct, _, _ = sig[k]
                            if d2 == 0 and ck == "punct" and ct in (",", "}"):
                                k -= 1
                                break
                            if ck == "punct" and ct in ("(", "[", "{", "${"): d2 += 1
                            elif ck == "punct" and ct in (")", "]", "}"): d2 -= 1
                            k += 1
                    elif tk == "punct" and tt == ":":
                        expect = True
                    elif tk == "punct" and tt == "{":
                        stack.append("obj"); expect = True
                    elif tk == "punct" and tt == "[":
                        stack.append("arr"); expect = True
                    elif expect and tk == "ident":
                        nxt = sig[k + 1][1] if k + 1 < end_idx else ""
                        if nxt == ":":
                            expect = False
                        else:
                            out.append((tt, ts))
                            expect = False
                elif top == "arr":
                    if tk == "punct" and tt == "]":
                        stack.pop()
                        if not stack: expect = False
                    elif tk == "punct" and tt == ",":
                        expect = True
                    elif tk == "punct" and tt == "=":
                        d2 = 0
                        k += 1
                        while k < end_idx:
                            ck, ct, _, _ = sig[k]
                            if d2 == 0 and ck == "punct" and ct in (",", "]"):
                                k -= 1
                                break
                            if ck == "punct" and ct in ("(", "[", "{", "${"): d2 += 1
                            elif ck == "punct" and ct in (")", "]", "}"): d2 -= 1
                            k += 1
                    elif tk == "punct" and tt == "{":
                        stack.append("obj"); expect = True
                    elif tk == "punct" and tt == "[":
                        stack.append("arr"); expect = True
                    elif expect and tk == "ident":
                        out.append((tt, ts))
                        expect = False
            k += 1
        return out

    i = 0
    while i < n:
        k, t, s, _e = sig[i]
        prev_t = sig[i - 1][1] if i > 0 else ""

        if k == "punct" and t in ("{", "${"):
            scopes.append(dict(pending_params) if (t == "{" and pending_params) else {})
            if t == "{":
                pending_params = None
            i += 1
            continue
        if k == "punct" and t == "}":
            if len(scopes) > 1:
                scopes.pop()
            else:
                errors.append(f"{label}: Unexpected extra '}}' at L{code.count(chr(10), 0, s) + 1}")
            i += 1
            continue

        if k == "ident" and t == "import" and prev_t != ".":
            j = i + 1
            if j < n and sig[j][0] == "punct" and sig[j][1] == "(":
                i += 1
                continue
            while j < n and not (sig[j][0] == "ident" and sig[j][1] == "from") and not (sig[j][0] == "punct" and sig[j][1] == ";"):
                j += 1
            p = i + 1
            while p < j:
                pk, pt, ps, _ = sig[p]
                if pk == "ident":
                    if p + 2 < j and sig[p + 1][1] == "as":
                        add_binding(scopes[-1], sig[p + 2][1], "import", sig[p + 2][2])
                        p += 3
                        continue
                    elif pt != "type":
                        add_binding(scopes[-1], pt, "import", ps)
                p += 1
            i = j + 1
            continue

        if k == "ident" and t == "function" and prev_t != ".":
            j = i + 1
            if j < n and sig[j][1] == "*": j += 1
            if j < n and sig[j][0] == "ident":
                if (i == 0) or prev_t in (";", "{", "}", "export", "async", "default"):
                    add_binding(scopes[-1], sig[j][1], "function", sig[j][2])
                j += 1
            if j < n and sig[j][1] == "(":
                pstart = j + 1
                pd = 1
                j += 1
                while j < n and pd > 0:
                    if sig[j][1] == "(": pd += 1
                    elif sig[j][1] == ")": pd -= 1
                    j += 1
                if j < n and sig[j][1] == "{":
                    pmap = {}
                    for nm, npos in extract_binding_names(pstart, j - 1):
                        if nm in pmap:
                            errors.append(f"{label}: Duplicate parameter '{nm}' at L{code.count(chr(10), 0, npos) + 1}")
                        pmap[nm] = ("param", code.count("\n", 0, npos) + 1)
                    pending_params = pmap
            i = j
            continue

        if k == "punct" and t == "=>" and i + 1 < n and sig[i + 1][1] == "{":
            pmap = {}
            if i >= 1 and sig[i - 1][0] == "ident":
                pmap[sig[i - 1][1]] = ("param", code.count("\n", 0, sig[i - 1][2]) + 1)
            elif i >= 1 and sig[i - 1][1] == ")":
                pd = 1
                j = i - 2
                while j >= 0 and pd > 0:
                    if sig[j][1] == ")": pd += 1
                    elif sig[j][1] == "(": pd -= 1
                    j -= 1
                for nm, npos in extract_binding_names(j + 2, i - 1):
                    if nm in pmap:
                        errors.append(f"{label}: Duplicate arrow parameter '{nm}' at L{code.count(chr(10), 0, npos) + 1}")
                    pmap[nm] = ("param", code.count("\n", 0, npos) + 1)
            pending_params = pmap
            i += 1
            continue

        if k == "ident" and t == "class" and prev_t != ".":
            if i + 1 < n and sig[i + 1][0] == "ident" and prev_t in ("", ";", "{", "}", "export", "default"):
                add_binding(scopes[-1], sig[i + 1][1], "class", sig[i + 1][2])
            i += 1
            continue

        if k == "ident" and t in ("const", "let") and prev_t != ".":
            if i >= 2 and sig[i - 1][1] == "(" and sig[i - 2][1] == "for":
                i += 1
                continue
            j = i + 1
            d0 = 0
            saw_eq = False
            while j < n:
                jk, jt, js_pos, _ = sig[j]
                if d0 == 0 and jk == "punct" and jt in (";", ")", "}"):
                    break
                if d0 == 0 and jk == "ident" and jt in ("in", "of"):
                    break
                if d0 == 0 and saw_eq and j > i + 2:
                    between = code[sig[j - 1][3]:js_pos]
                    if "\n" in between and jk == "ident" and jt in ("const", "let", "var", "if", "for", "while", "return", "function", "export", "switch", "try", "break", "continue", "throw"):
                        break
                if jk == "punct" and jt in ("(", "[", "{", "${"):
                    d0 += 1
                elif jk == "punct" and jt in (")", "]", "}"):
                    d0 -= 1
                elif d0 == 0 and jk == "punct" and jt == "=":
                    saw_eq = True
                j += 1
            seg_start = i + 1
            d1 = 0
            for m in range(i + 1, j + 1):
                is_end = (m == j) or (d1 == 0 and sig[m][0] == "punct" and sig[m][1] == ",")
                if not is_end:
                    if sig[m][0] == "punct" and sig[m][1] in ("(", "[", "{", "${"): d1 += 1
                    elif sig[m][0] == "punct" and sig[m][1] in (")", "]", "}"): d1 -= 1
                else:
                    eq_pos = m
                    d2 = 0
                    for q in range(seg_start, m):
                        if sig[q][0] == "punct" and sig[q][1] in ("(", "[", "{", "${"): d2 += 1
                        elif sig[q][0] == "punct" and sig[q][1] in (")", "]", "}"): d2 -= 1
                        elif d2 == 0 and sig[q][0] == "punct" and sig[q][1] == "=":
                            eq_pos = q
                            break
                    for nm, npos in extract_binding_names(seg_start, eq_pos):
                        add_binding(scopes[-1], nm, t, npos)
                    seg_start = m + 1
            i = j
            continue

        i += 1

    if len(scopes) != 1:
        errors.append(f"{label}: Unbalanced lexical scope depth at EOF (depth={len(scopes)})")
    return errors


def audit_bundle_syntax(js_code):
    """Lexical integrity check: verifies all (), [], {} are strictly balanced outside strings/comments/regexes."""
    tokens = tokenize_js(js_code)
    stack = []
    match_map = {")": "(", "]": "[", "}": "{"}
    for kind, txt, s, _e in tokens:
        if kind != "punct":
            continue
        if txt in ("(", "[", "{"):
            stack.append((txt, s))
        elif txt == "${":
            stack.append(("{", s))
        elif txt in (")", "]", "}"):
            if not stack or stack[-1][0] != match_map[txt]:
                line_no = js_code.count("\n", 0, s) + 1
                raise RuntimeError(f"Syntax audit failed: unmatched '{txt}' near bundle line {line_no}")
            stack.pop()
    if stack:
        ch, pos = stack[-1]
        line_no = js_code.count("\n", 0, pos) + 1
        raise RuntimeError(f"Syntax audit failed: unclosed '{ch}' opened at bundle line {line_no}")
    # Guard against accidental `SYM: __live_N.SYM` / `SYM: _lN.SYM` inside function calls
    for m in re.finditer(r"\([^(){}]*\b([A-Za-z_$][\w$]*)\s*:\s*(?:__live_|_l)\d+\.\1\b", js_code):
        line_no = js_code.count("\n", 0, m.start()) + 1
        raise RuntimeError(f"Syntax audit failed: illegal live shorthand inside parens at bundle line {line_no}")
    # Guard against accidental sourceMappingURL leakage into public production bundle
    if "sourceMappingURL=" in js_code:
        raise RuntimeError("Security audit failed: sourceMappingURL comment leaked into public game.bundle.js!")
    # v50.1 Guard against orphaned `else` statements (e.g. statement inserted mid if/else-if chain)
    _sig = [(k, t, s) for (k, t, s, _e) in tokens if k not in ("ws", "comment")]
    for _idx in range(len(_sig)):
        _k, _t, _s = _sig[_idx]
        if _k == "ident" and _t == "else":
            # Walk backward to find the statement preceding `else`; it MUST terminate an `if` branch (either `}` or `;` following an `if (...) <stmt>`).
            if _idx == 0:
                raise RuntimeError("Syntax audit failed: leading orphaned 'else'")
            _pk, _pt, _ps = _sig[_idx - 1]
            if _pt == ";":
                # Walk back to start of single-line statement before `;`, skipping balanced (), [], {}
                _j = _idx - 2
                _d = 0
                while _j >= 0:
                    _jt = _sig[_j][1]
                    if _jt in (")", "]", "}"):
                        _d += 1
                    elif _jt in ("(", "[", "{", "${"):
                        if _d == 0:
                            break
                        _d -= 1
                    elif _d == 0 and _jt in (";", "{", "}"):
                        break
                    _j -= 1
                # The statement between _j+1 and _idx-1 must begin with `if` (e.g. `if (...) stmt;`)!
                # Find first `if` at depth 0 inside this statement segment
                _has_if = False
                _d2 = 0
                for _q in range(_j + 1, _idx - 1):
                    _qt = _sig[_q][1]
                    if _qt in ("(", "[", "{", "${"):
                        _d2 += 1
                    elif _qt in (")", "]", "}"):
                        _d2 -= 1
                    elif _d2 == 0 and _sig[_q][0] == "ident" and _qt == "if":
                        _has_if = True
                        break
                if not _has_if:
                    _ln = js_code.count("\n", 0, _s) + 1
                    raise RuntimeError(f"Syntax audit failed: orphaned 'else' (not preceded by if-statement) near bundle line {_ln}")
    # v50.1 Guard against duplicate lexical const/let/class/param declarations in the same scope!
    dup_errs = scan_duplicate_lexical_decls(js_code, "game.bundle.js")
    if dup_errs:
        raise RuntimeError("Syntax audit failed: " + " | ".join(dup_errs[:5]))


def build_offline_index_html():
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    # 1. Strip `?v=...` query string from styles.css & strip external PWA links so TapTap 3-file bundle has ZERO 404s under file://
    html = re.sub(r'href="\./styles\.css\?v=[^"]+"', 'href="./styles.css"', html)
    html = re.sub(r'<link rel="manifest"[^>]*>\n?', '', html)
    html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\n?', '', html)
    html = re.sub(
        r'<link rel="icon"[^>]*href="\./icon\.svg"[^>]*>',
        """<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect width='32' height='32' fill='%230b0d11'/><path d='M16 6v2M9 22c0-6 2.4-12 7-12s7 6 7 12l2 2H7l2-2z' fill='none' stroke='%23e9c97b' stroke-width='2'/></svg>" />""",
        html
    )
    # 2. Replace the inline file:// blocker + module loader with clean offline error guard + classic bundle script
    inline_script_start = html.rfind("<script>\n(function () {")
    module_script_end = html.find("</script>", html.find('src="./src/main.js')) + len("</script>")
    if inline_script_start < 0 or module_script_end <= inline_script_start:
        raise RuntimeError("Could not locate boot script block in index.html")

    offline_boot_block = r"""<script>
(function () {
  var isEnBoot = false;
  try { isEnBoot = window.localStorage.getItem('ashen_bell_vow_locale_v15') === 'en-US'; } catch (e) {}
  function showFatal(msg) {
    var el = document.getElementById('abv-fatal-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'abv-fatal-banner';
      el.className = 'abv-fatal-banner';
      document.body.appendChild(el);
    }
    el.classList.remove('hidden');
    el.textContent = '';
    var head = document.createElement('div');
    head.className = 'abv-fatal-head';
    var title = document.createElement('span');
    title.textContent = isEnBoot ? '◆ Runtime Error (v50.1)' : '◆ 运行异常诊断 (v50.1)';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'abv-fatal-dismiss';
    btn.textContent = '✕';
    btn.addEventListener('click', function () { el.classList.add('hidden'); });
    head.appendChild(title);
    head.appendChild(btn);
    var body = document.createElement('div');
    body.textContent = String(msg || 'Unknown error');
    el.appendChild(head);
    el.appendChild(body);
  }
  window.__ABV_SHOW_FATAL__ = showFatal;
  window.addEventListener('error', function (e) {
    var detail = (e && e.message) ? e.message : 'Unknown script error';
    if (e && e.lineno) detail += ' (L' + e.lineno + ':' + Math.max(0, (e.colno || 1) - 1) + ')';
    showFatal(detail);
  });
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    showFatal('Promise: ' + ((r && r.message) ? r.message : String(r || 'Rejection')));
  });
})();
</script>
<script src="./game.bundle.js" charset="utf-8"></script>"""

    out_html = html[:inline_script_start] + offline_boot_block + html[module_script_end:]
    if 'type="module"' in out_html:
        raise RuntimeError("Offline index.html still contains type='module'!")
    if "protocol === 'file:'" in out_html:
        raise RuntimeError("Offline index.html still contains file:// blocker!")
    # Audit every inline <script> block in offline index.html for balanced quotes & brackets!
    for m in re.finditer(r"<script(?:\s[^>]*)?>([\s\S]*?)</script>", out_html):
        inline_js = m.group(1).strip()
        if inline_js:
            audit_bundle_syntax(inline_js)
            toks = tokenize_js(inline_js)
            for idx_t, (tk, txt, pos, _e) in enumerate(toks):
                if tk == "ident" and idx_t > 0:
                    # Catch adjacent string + ident (`'foo'hidden'`) from broken quote escaping!
                    prev_k = toks[idx_t - 1][0]
                    if prev_k == "str":
                        ln = out_html.count("\n", 0, m.start() + pos) + 1
                        raise RuntimeError(f"Offline index.html inline JS syntax error near L{ln}: unexpected identifier '{txt}' after string literal")
    return out_html


def write_zip_from_files(zip_path, entries):
    os.makedirs(os.path.dirname(zip_path), exist_ok=True)
    if os.path.exists(zip_path):
        os.remove(zip_path)
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        for arcname, payload in entries:
            if isinstance(payload, (bytes, bytearray)):
                zf.writestr(arcname, payload)
            else:
                zf.write(payload, arcname)
    with zipfile.ZipFile(zip_path, "r") as zf:
        bad = zf.testzip()
        if bad is not None:
            raise RuntimeError(f"Corrupt ZIP entry {bad} in {zip_path}")
    return os.path.getsize(zip_path)


def main():
    parser = argparse.ArgumentParser(description="Build Ashen Bell Vow multi-platform release packages.")
    parser.add_argument("--skip-verify", action="store_true", help="Skip running verify_project.py before build")
    parser.add_argument("--engine", choices=("auto", "builtin", "esbuild"), default="auto", help="JS minifier engine (default: auto)")
    parser.add_argument("--no-minify", action="store_true", help="Disable JS/CSS minification (readable debug bundle)")
    parser.add_argument("--no-obfuscate", action="store_true", help="Disable module ID, export key, identifier & world payload obfuscation")
    parser.add_argument("--no-sourcemap", action="store_true", help="Skip writing offline SourceMap v3 files to dist/sourcemaps/")
    args = parser.parse_args()

    do_minify = not args.no_minify
    do_obfuscate = not args.no_obfuscate
    do_sourcemap = (not args.no_sourcemap) and do_minify

    version = detect_version()
    ver_slug = version.replace(".", "_")

    print(f"[build_release] Step 0/4: Pre-baking multi-cycle worlds (tools/assemble_worlds.py)...")
    aw = subprocess.run([sys.executable, "tools/assemble_worlds.py"], cwd=ROOT, capture_output=True, text=True)
    if aw.stdout:
        print(aw.stdout.strip())
    if aw.returncode != 0:
        if aw.stderr:
            print(aw.stderr, file=sys.stderr)
        sys.exit(aw.returncode)

    if not args.skip_verify:
        print(f"[build_release] Step 1/4: Running verify_project.py ({version})...")
        vp = subprocess.run([sys.executable, "verify_project.py"], cwd=ROOT, capture_output=True, text=True)
        print(vp.stdout.strip())
        if vp.returncode != 0:
            if vp.stderr:
                print(vp.stderr, file=sys.stderr)
            sys.exit(vp.returncode)

    mode_desc = f"engine={args.engine}, minify={do_minify}, obfuscate={do_obfuscate}, sourcemap={do_sourcemap}"
    print(f"[build_release] Step 2/4: Compiling production offline bundle ({mode_desc})...")
    bundle_res = build_offline_bundle_js(
        version,
        minify=do_minify,
        obfuscate=do_obfuscate,
        emit_sourcemap=do_sourcemap,
        engine=args.engine,
    )
    bundle_js = bundle_res["js"]
    runtime_order = bundle_res["order"]
    offline_html = build_offline_index_html()

    styles_path = os.path.join(ROOT, "styles.css")
    raw_css = open(styles_path, encoding="utf-8").read()
    raw_css_bytes = len(raw_css.encode("utf-8"))
    if do_minify:
        prod_css, css_map = minify_css(raw_css, source_name="styles.css")
    else:
        prod_css, css_map = raw_css, None
    prod_css_bytes = len(prod_css.encode("utf-8"))

    js_pct = 100.0 * (1.0 - bundle_res["final_bytes"] / max(1, bundle_res["raw_bytes"]))
    css_pct = 100.0 * (1.0 - prod_css_bytes / max(1, raw_css_bytes))
    print(
        f"[build_release]   -> JS  ({bundle_res['engine_used']}): {bundle_res['raw_bytes']:,} B -> {bundle_res['final_bytes']:,} B (-{js_pct:.1f}%) "
        f"| mangled={bundle_res['symbols']['mangledCount']} local + {len(bundle_res['symbols']['exports'])} export keys"
    )
    print(
        f"[build_release]   -> CSS (builtin): {raw_css_bytes:,} B -> {prod_css_bytes:,} B (-{css_pct:.1f}%)"
    )

    if do_sourcemap:
        os.makedirs(SOURCEMAP_DIR, exist_ok=True)
        sm_entries = []
        if bundle_res["sourcemap"] is not None:
            js_map_str = json.dumps(bundle_res["sourcemap"], ensure_ascii=False, separators=(",", ":"))
            js_map_path = os.path.join(SOURCEMAP_DIR, "game.bundle.js.map")
            with open(js_map_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(js_map_str)
            sm_entries.append(("game.bundle.js.map", js_map_str.encode("utf-8")))
        if css_map is not None:
            css_map_str = json.dumps(css_map, ensure_ascii=False, separators=(",", ":"))
            css_map_path = os.path.join(SOURCEMAP_DIR, "styles.css.map")
            with open(css_map_path, "w", encoding="utf-8", newline="\n") as f:
                f.write(css_map_str)
            sm_entries.append(("styles.css.map", css_map_str.encode("utf-8")))
        sym_str = json.dumps(bundle_res["symbols"], ensure_ascii=False, indent=2) + "\n"
        sym_path = os.path.join(SOURCEMAP_DIR, "symbols.json")
        with open(sym_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(sym_str)
        sm_entries.append(("symbols.json", sym_str.encode("utf-8")))
        sm_zip = os.path.join(DIST_DIR, f"ashen_bell_vow_{ver_slug}_sourcemaps_OFFLINE.zip")
        sm_sz = write_zip_from_files(sm_zip, sm_entries)
        print(f"[build_release]   -> Offline SourceMap ZIP (DO NOT UPLOAD PUBLICLY): {sm_zip} ({len(sm_entries)} files | {sm_sz:,} bytes)")

    taptap_zip = os.path.join(DIST_DIR, f"ashen_bell_vow_{ver_slug}_taptap_offline.zip")
    taptap_sz = write_zip_from_files(taptap_zip, [
        ("ashen_bell_vow/index.html", offline_html.encode("utf-8")),
        ("ashen_bell_vow/styles.css", prod_css.encode("utf-8")),
        ("ashen_bell_vow/game.bundle.js", bundle_js.encode("utf-8")),
    ])
    print(f"[build_release]   -> TapTap/4399 Offline ZIP: {taptap_zip}")
    print(f"                     1 top folder `ashen_bell_vow/` (index.html, minified styles.css, minified+obfuscated game.bundle.js) | {taptap_sz:,} bytes | {len(runtime_order)} modules + 3 cycle worlds inlined")

    print(f"[build_release] Step 3/4: Building itch.io flat-root Web ZIP...")
    itch_entries = [
        ("index.html", os.path.join(ROOT, "index.html")),
        ("styles.css", prod_css.encode("utf-8")),
    ]
    for pwa_asset in ("manifest.webmanifest", "sw.js", "icon.svg", "icon-192.png", "icon-512.png"):
        ap = os.path.join(ROOT, pwa_asset)
        if os.path.isfile(ap):
            itch_entries.append((pwa_asset, ap))
    for rel in sorted(runtime_order):
        itch_entries.append((rel, os.path.join(ROOT, rel)))
    for dp, dn, fns in os.walk(os.path.join(ROOT, "data")):
        dn.sort()
        for fn in sorted(fns):
            if fn.endswith(".json"):
                fp = os.path.join(dp, fn)
                rel = os.path.relpath(fp, ROOT).replace("\\", "/")
                itch_entries.append((rel, fp))
    itch_zip = os.path.join(DIST_DIR, f"ashen_bell_vow_{ver_slug}_itch_web.zip")
    itch_sz = write_zip_from_files(itch_zip, itch_entries)
    print(f"[build_release]   -> itch.io Web ZIP:         {itch_zip} ({len(itch_entries)} entries | {itch_sz:,} bytes)")

    print(f"[build_release] Step 4/4: Building full modular source archive...")
    top_dir = f"ashen_bell_vow_{ver_slug}_modular"
    src_entries = []
    for dp, dn, fns in os.walk(ROOT):
        dn[:] = sorted(d for d in dn if d not in ("dist", "__pycache__", ".git", "node_modules"))
        for fn in sorted(fns):
            if fn.endswith(".pyc") or fn == ".DS_Store":
                continue
            fp = os.path.join(dp, fn)
            rel = os.path.relpath(fp, ROOT).replace("\\", "/")
            src_entries.append((f"{top_dir}/{rel}", fp))
    src_zip = os.path.join(DIST_DIR, f"ashen_bell_vow_{ver_slug}_modular.zip")
    src_sz = write_zip_from_files(src_zip, src_entries)
    print(f"[build_release]   -> Full Source ZIP:         {src_zip} ({len(src_entries)} entries | {src_sz:,} bytes)")
    print("[build_release] ALL RELEASE PACKAGES BUILT & VERIFIED!")


if __name__ == "__main__":
    main()
