#!/usr/bin/env bash
set -euo pipefail

target="${1:-all}"

case "$target" in
  all)
    ports=(3005 8088)
    ;;
  frontend)
    ports=(3005)
    ;;
  backend)
    ports=(8088)
    ;;
  *)
    echo "用法: $0 [all|frontend|backend]" >&2
    exit 1
    ;;
esac

for port in "${ports[@]}"; do
  pids="$(lsof -ti :"$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "停止端口 $port 上的进程"
    kill -9 $pids 2>/dev/null || true
  fi
done
