#!/usr/bin/env python3
"""Offline SourceMap v3 Stack-Trace Decoder for Ashen Bell Vow (v50.1).

Usage:
  python3 tools/decode_stack.py dist/sourcemaps/game.bundle.js.map 12:4832
  python3 tools/decode_stack.py dist/sourcemaps/game.bundle.js.map --stack "TypeError: x is undefined (L12:4832)"
  python3 tools/decode_stack.py dist/sourcemaps/styles.css.map 180:0
"""
import argparse
import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from minify_obfuscate import lookup_sourcemap


def format_location(map_obj, gen_line, gen_col, context=2):
    hit = lookup_sourcemap(map_obj, gen_line, gen_col)
    if not hit:
        return f"  [UNMAPPED] L{gen_line}:{gen_col}"
    src = hit["source"] or "<runtime>"
    orig_line = hit["line"]
    orig_col = hit["column"]
    name_tag = f"  (orig symbol: {hit['name']})" if hit.get("name") else ""
    out = [f"  L{gen_line}:{gen_col}  ==>  {src}:{orig_line}:{orig_col}{name_tag}"]

    contents = map_obj.get("sourcesContent") or []
    sidx = hit.get("sourceIndex")
    if sidx is not None and 0 <= sidx < len(contents) and contents[sidx]:
        src_lines = contents[sidx].splitlines()
        lo = max(1, orig_line - context)
        hi = min(len(src_lines), orig_line + context)
        for ln in range(lo, hi + 1):
            marker = ">>" if ln == orig_line else "  "
            out.append(f"    {marker} {ln:4d} | {src_lines[ln - 1]}")
    return "\n".join(out)


def decode_stack_text(map_obj, stack_text, context=2):
    pat = re.compile(r"(?:(?:game\.bundle\.js|styles\.css):|\bL)(\d+):(\d+)|\b(\d+):(\d+)\b")
    hits = []
    seen = set()
    for m in pat.finditer(stack_text):
        ln = int(m.group(1) or m.group(3))
        col = int(m.group(2) or m.group(4))
        key = (ln, col)
        if key not in seen:
            seen.add(key)
            hits.append(key)
    if not hits:
        return "No line:col coordinates found in stack text."
    return "\n\n".join(format_location(map_obj, ln, col, context=context) for ln, col in hits)


def main():
    parser = argparse.ArgumentParser(description="Decode minified JS/CSS line:col or stack traces via offline SourceMap v3.")
    parser.add_argument("map_file", help="Path to offline .map file (e.g. dist/sourcemaps/game.bundle.js.map)")
    parser.add_argument("coords", nargs="*", help="One or more line:col coordinates (1-based line, 0-based col)")
    parser.add_argument("--stack", help="Raw error banner text or browser stack trace string to decode")
    parser.add_argument("--context", type=int, default=2, help="Source context lines above/below match (default: 2)")
    args = parser.parse_args()

    with open(args.map_file, "r", encoding="utf-8") as f:
        map_obj = json.load(f)

    if args.stack:
        print(decode_stack_text(map_obj, args.stack, context=args.context))
        return

    if not args.coords:
        if not sys.stdin.isatty():
            print(decode_stack_text(map_obj, sys.stdin.read(), context=args.context))
            return
        parser.error("Provide at least one line:col coordinate or --stack '...'")

    for c in args.coords:
        m = re.match(r"^[Ll]?(\d+):(\d+)$", c.strip())
        if not m:
            print(f"  [INVALID] '{c}' (expected line:col, e.g. 12:4832)")
            continue
        print(format_location(map_obj, int(m.group(1)), int(m.group(2)), context=args.context))


if __name__ == "__main__":
    main()
