#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
echo "=== Ashen Bell Vow v45.5 - Level Editor Launcher ==="
if command -v python3 >/dev/null 2>&1; then
  exec python3 serve_local.py --editor
elif command -v python >/dev/null 2>&1; then
  exec python serve_local.py --editor
else
  echo "[ERROR] Python 3 not found."
  exit 1
fi
