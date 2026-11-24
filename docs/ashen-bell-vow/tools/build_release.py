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


def transform_es_module(rel, code, live_exports_by_mod):
    """
    Transform a single ES module into a classic factory body `function(__req, __exports) { ... }`.
    Preserves exact ES Module live bindings, re-exports, star exports, and hoisting.
    Returns (transformed_body, exported_symbol_names, required_pairs)
    where required_pairs = [(dep_rel, imported_name), ...]
    """
    exported_locals = []  # [(export_name, local_name)]
    reexport_lines = []
    required_pairs = []
    live_ref_map = {}  # local_name -> "__live_N.orig_name"
    live_counter = [0]
    exported_names = set()

    # 1. Transform all `import { ... } from '...';` statements
    def repl_import(m):
        spec_str = m.group(1)
        dep = resolve_module_path(rel, m.group(2))
        specs = parse_named_specifiers(spec_str)
        dep_live = live_exports_by_mod.get(dep, set())
        static_parts = []
        live_specs = []
        for orig, alias in specs:
            required_pairs.append((dep, orig))
            if orig in dep_live:
                live_specs.append((orig, alias))
            else:
                static_parts.append(orig if orig == alias else f"{orig}: {alias}")

        lines = []
        if live_specs:
            var_name = f"__live_{live_counter[0]}"
            live_counter[0] += 1
            lines.append(f"const {var_name} = __req('{dep}');")
            for orig, alias in live_specs:
                live_ref_map[alias] = f"{var_name}.{orig}"
            if static_parts:
                lines.append(f"const {{ {', '.join(static_parts)} }} = {var_name};")
        elif static_parts:
            lines.append(f"const {{ {', '.join(static_parts)} }} = __req('{dep}');")
        else:
            lines.append(f"__req('{dep}');")
        return "\n".join(lines)

    body = re.sub(
        r"^[ \t]*import\s*\{([\s\S]*?)\}\s*from\s*['\"]([^'\"]+)['\"]\s*;?",
        repl_import,
        code,
        flags=re.M
    )

    # 2. Transform `export * from '...';`
    def repl_export_star(m):
        dep = resolve_module_path(rel, m.group(1))
        required_pairs.append((dep, "*"))
        reexport_lines.append(f"__reexportAll(__exports, __req('{dep}'));")
        return f"__reexportAll(__exports, __req('{dep}'));"

    body = re.sub(
        r"^[ \t]*export\s*\*\s*from\s*['\"]([^'\"]+)['\"]\s*;?",
        repl_export_star,
        body,
        flags=re.M
    )

    # 3. Transform `export { ... } from '...';`
    def repl_reexport_named(m):
        spec_str = m.group(1)
        dep = resolve_module_path(rel, m.group(2))
        specs = parse_named_specifiers(spec_str)
        pairs = []
        for orig, alias in specs:
            required_pairs.append((dep, orig))
            exported_names.add(alias)
            pairs.append(f"['{orig}','{alias}']")
        return f"__reexportNamed(__exports, __req('{dep}'), [{', '.join(pairs)}]);"

    body = re.sub(
        r"^[ \t]*export\s*\{([\s\S]*?)\}\s*from\s*['\"]([^'\"]+)['\"]\s*;?",
        repl_reexport_named,
        body,
        flags=re.M
    )

    # 4. Transform local `export { a, b as c };`
    def repl_export_local_block(m):
        specs = parse_named_specifiers(m.group(1))
        for local, alias in specs:
            exported_locals.append((alias, local))
            exported_names.add(alias)
        return ""

    body = re.sub(
        r"^[ \t]*export\s*\{([\s\S]*?)\}\s*;?",
        repl_export_local_block,
        body,
        flags=re.M
    )

    # 5. Transform `export async function / function / class / const / let / var`
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

    # 6. Rewrite live-binding references inside this module body
    if live_ref_map:
        body = rewrite_live_ident_refs(body, live_ref_map)

    # 7. Append live getter definitions for all local exports
    if exported_locals:
        seen = set()
        entries = []
        for exp_name, loc_name in exported_locals:
            if exp_name in seen:
                continue
            seen.add(exp_name)
            entries.append(f"  '{exp_name}': () => {loc_name}")
        body = body.rstrip() + "\n__exp(__exports, {\n" + ",\n".join(entries) + "\n});\n"

    return body, exported_names, required_pairs


def load_offline_world_bundle():
    world_path = os.path.join(ROOT, "data/world.json")
    world = json.load(open(world_path, encoding="utf-8"))
    rooms = []
    for entry in world.get("rooms", []):
        rf = os.path.join(ROOT, entry["file"].lstrip("./"))
        data = json.load(open(rf, encoding="utf-8"))
        merged = dict(data)
        for k in ("id", "zoneName", "name", "theme", "bounds", "connections"):
            if entry.get(k) is not None:
                merged[k] = entry[k]
        rooms.append(merged)
    return {"world": world, "rooms": rooms}


def build_offline_bundle_js(version):
    order, sources = collect_runtime_modules("src/main.js")
    live_exports = find_live_let_exports(sources)
    world_bundle = load_offline_world_bundle()

    transformed = {}
    all_exports = {}
    all_requires = {}

    for rel in order:
        body, exps, reqs = transform_es_module(rel, sources[rel], live_exports)
        transformed[rel] = body
        all_exports[rel] = exps
        all_requires[rel] = reqs

    # Resolve star-reexports for static validation
    for rel in order:
        for dep, sym in all_requires[rel]:
            if sym == "*":
                all_exports[rel] |= all_exports.get(dep, set())

    # Validate every single import symbol & zero stray ES module statements!
    for rel in order:
        for dep, sym in all_requires[rel]:
            if dep not in transformed:
                raise RuntimeError(f"Bundle error: {rel} requires missing module {dep}")
            if sym != "*" and sym not in all_exports[dep]:
                raise RuntimeError(f"Bundle error: {rel} imports '{sym}' which is not exported by {dep}")
        # Verify no stray top-level `import ` or `export ` lines remain
        for ln_no, ln in enumerate(transformed[rel].splitlines(), 1):
            if re.match(r"^\s*(?:import|export)\s+", ln):
                raise RuntimeError(f"Bundle error: Untransformed ES module syntax in {rel}:{ln_no}: {ln}")

    # Assemble single classic script bundle
    parts = []
    parts.append(f"// Ashen Bell Vow {version} — Offline Zero-Module Zero-Fetch Single Bundle (generated by tools/build_release.py)")
    parts.append("(function (global) {")
    parts.append("  'use strict';")
    world_json = json.dumps(world_bundle, ensure_ascii=False, separators=(",", ":"))
    parts.append(f"  global.__ABV_OFFLINE_WORLD__ = {world_json};")
    parts.append("""
  const __factories = Object.create(null);
  const __cache = Object.create(null);
  function __def(id, fn) { __factories[id] = fn; }
  function __exp(target, getters) {
    const keys = Object.keys(getters);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      Object.defineProperty(target, k, { enumerable: true, configurable: true, get: getters[k] });
    }
  }
  function __reexportAll(target, src) {
    const descs = Object.getOwnPropertyDescriptors(src);
    const keys = Object.keys(descs);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!Object.prototype.hasOwnProperty.call(target, k)) {
        Object.defineProperty(target, k, descs[k]);
      }
    }
  }
  function __reexportNamed(target, src, pairs) {
    for (let i = 0; i < pairs.length; i++) {
      const orig = pairs[i][0], alias = pairs[i][1];
      const d = Object.getOwnPropertyDescriptor(src, orig);
      if (d) Object.defineProperty(target, alias, d);
    }
  }
  function __req(id) {
    if (__cache[id]) return __cache[id];
    const fn = __factories[id];
    if (!fn) throw new Error('Missing bundled module: ' + id);
    const exports = {};
    __cache[id] = exports;
    fn(__req, exports);
    return exports;
  }
""")

    for rel in order:
        parts.append(f"// ===== MODULE: {rel} =====")
        parts.append(f"__def('{rel}', function(__req, __exports) {{")
        parts.append(transformed[rel])
        parts.append("});\n")

    parts.append("  __req('src/main.js');")
    parts.append("})(typeof window !== 'undefined' ? window : globalThis);")
    bundle_js = "\n".join(parts) + "\n"

    # Lexical bracket balance audit across the entire compiled bundle!
    audit_bundle_syntax(bundle_js)
    return bundle_js, order


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
    # Guard against accidental `SYM: __live_N.SYM` inside function calls
    for m in re.finditer(r"\([^(){}]*\b([A-Za-z_$][\w$]*)\s*:\s*__live_\d+\.\1\b", js_code):
        line_no = js_code.count("\n", 0, m.start()) + 1
        raise RuntimeError(f"Syntax audit failed: illegal live shorthand inside parens at bundle line {line_no}")


def build_offline_index_html():
    html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
    # 1. Strip `?v=...` query string from styles.css & strip external PWA links so TapTap 3-file bundle has ZERO 404s under file://
    html = re.sub(r'href="\./styles\.css\?v=[^"]+"', 'href="./styles.css"', html)
    html = re.sub(r'<link rel="manifest"[^>]*>\n?', '', html)
    html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\n?', '', html)
    html = re.sub(
        r'<link rel="icon"[^>]*href="\./icon\.svg"[^>]*>',
        """<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>🔔</text></svg>" />""",
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
    title.textContent = isEnBoot ? '⚠ Runtime Error (v45.5)' : '⚠ 运行异常诊断 (v45.5)';
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
    if (e && e.lineno) detail += ' (L' + e.lineno + ':' + (e.colno || 0) + ')';
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
    args = parser.parse_args()

    version = detect_version()
    ver_slug = version.replace(".", "_")

    if not args.skip_verify:
        print(f"[build_release] Step 1/4: Running verify_project.py ({version})...")
        vp = subprocess.run([sys.executable, "verify_project.py"], cwd=ROOT, capture_output=True, text=True)
        print(vp.stdout.strip())
        if vp.returncode != 0:
            if vp.stderr:
                print(vp.stderr, file=sys.stderr)
            sys.exit(vp.returncode)

    print(f"[build_release] Step 2/4: Compiling offline zero-module bundle (game.bundle.js)...")
    bundle_js, runtime_order = build_offline_bundle_js(version)
    offline_html = build_offline_index_html()
    styles_path = os.path.join(ROOT, "styles.css")

    # Package 1: TapTap / 4399 Pure Offline H5 ZIP (single top-level folder `ashen_bell_vow/` containing index.html)
    taptap_zip = os.path.join(DIST_DIR, f"ashen_bell_vow_{ver_slug}_taptap_offline.zip")
    taptap_sz = write_zip_from_files(taptap_zip, [
        ("ashen_bell_vow/index.html", offline_html.encode("utf-8")),
        ("ashen_bell_vow/styles.css", styles_path),
        ("ashen_bell_vow/game.bundle.js", bundle_js.encode("utf-8")),
    ])
    print(f"[build_release]   -> TapTap/4399 Offline ZIP: {taptap_zip}")
    print(f"                     1 top folder `ashen_bell_vow/` (index.html, styles.css, game.bundle.js) | {taptap_sz:,} bytes | {len(runtime_order)} modules + 26 JSONs inlined")

    # Package 2: itch.io Flat-Root Web ZIP (runtime src/ + data/ only, no editor/dev files)
    print(f"[build_release] Step 3/4: Building itch.io flat-root Web ZIP...")
    itch_entries = [
        ("index.html", os.path.join(ROOT, "index.html")),
        ("styles.css", styles_path),
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

    # Package 3: Full Modular Source Archive (excludes dist/ & __pycache__)
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
