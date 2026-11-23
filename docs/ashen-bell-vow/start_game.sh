#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "========================================================"
echo "  Ashen Bell Vow (灰钟残誓 v43.4) - 本地一键启动器"
echo "========================================================"
echo ""

if command -v python3 >/dev/null 2>&1; then
  exec python3 serve_local.py
elif command -v npx >/dev/null 2>&1; then
  echo "正在使用 Node.js (npx serve) 启动本地服务: http://localhost:8080"
  (sleep 2 && (open "http://localhost:8080" 2>/dev/null || xdg-open "http://localhost:8080" 2>/dev/null || true)) &
  exec npx --yes serve -l 8080 .
else
  echo "[错误] 未检测到 python3 或 npx，请安装 Python 3 或使用 VS Code Live Server 运行。"
  exit 1
fi
