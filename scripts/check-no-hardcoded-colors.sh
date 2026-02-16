#!/usr/bin/env bash
set -euo pipefail

PATTERN='(bg|text|border|from|to|via|ring|fill|stroke)-(red|green|blue|yellow|orange|amber|emerald|slate|gray|zinc|stone|cyan|indigo|violet|purple|pink|rose)-'

if rg -n "$PATTERN" src >/tmp/hardcoded-colors.txt; then
  echo "Hardcoded Tailwind colors detected. Use semantic tokens (primary, muted, info, success, warning, destructive, chart-1..5)."
  cat /tmp/hardcoded-colors.txt
  exit 1
fi

echo "No hardcoded Tailwind colors found in src/."
