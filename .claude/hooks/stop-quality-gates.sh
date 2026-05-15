#!/usr/bin/env bash
# Hook B — no Stop event, roda lint+typecheck nos packages afetados pela sessão.
# Bloqueia o stop se algum gate falhar (forçando o agente a corrigir antes de claim "done").
set -uo pipefail

# Cleanup garantido: temp files em /tmp são removidos mesmo se script abortar (timeout, signal).
trap 'rm -f /tmp/typecheck-$$-*.log /tmp/typecheck-$$-*.rc /tmp/lint-$$-*.log /tmp/lint-$$-*.rc' EXIT

input=$(cat)
transcript_path=$(echo "$input" | jq -r '.transcript_path // empty')

if [ -z "$transcript_path" ] || ! [ -f "$transcript_path" ]; then
  exit 0
fi

# Extrair file_paths de Edit/Write/MultiEdit na sessão (transcript é JSONL)
edited_files=$(
  jq -r 'select(.type=="tool_use" or .type=="assistant") | .. | objects | select(.name=="Edit" or .name=="Write" or .name=="MultiEdit") | .input.file_path // empty' "$transcript_path" 2>/dev/null \
  | sort -u
)

# Se não houve edits, skip
if [ -z "$edited_files" ]; then
  exit 0
fi

# Filtrar TS/TSX em apps/ ou packages/, extrair package
# Real Claude Code transcripts usam paths absolutos — strip do CLAUDE_PROJECT_DIR (ou cwd) primeiro
project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
affected_pkgs=$(
  echo "$edited_files" \
  | sed "s|^${project_dir}/||" \
  | grep -E '\.(ts|tsx)$' \
  | grep -oE '^(apps|packages)/[^/]+' \
  | sort -u
)

if [ -z "$affected_pkgs" ]; then
  exit 0
fi

# Rodar lint e typecheck em paralelo pra cada package
errors=()
for pkg in $affected_pkgs; do
  pkg_path="./$pkg"
  safe_pkg="${pkg//\//_}"
  ( pnpm --filter "$pkg_path" typecheck > "/tmp/typecheck-$$-${safe_pkg}.log" 2>&1; echo $? > "/tmp/typecheck-$$-${safe_pkg}.rc" ) &
  ( pnpm --filter "$pkg_path" lint > "/tmp/lint-$$-${safe_pkg}.log" 2>&1; echo $? > "/tmp/lint-$$-${safe_pkg}.rc" ) &
done
wait

for pkg in $affected_pkgs; do
  safe_pkg="${pkg//\//_}"
  if [ "$(cat /tmp/typecheck-$$-${safe_pkg}.rc)" != "0" ]; then
    errors+=("[$pkg] typecheck FAILED:")
    errors+=("$(cat /tmp/typecheck-$$-${safe_pkg}.log)")
  fi
  if [ "$(cat /tmp/lint-$$-${safe_pkg}.rc)" != "0" ]; then
    errors+=("[$pkg] lint FAILED:")
    errors+=("$(cat /tmp/lint-$$-${safe_pkg}.log)")
  fi
  rm -f "/tmp/typecheck-$$-${safe_pkg}.log" "/tmp/typecheck-$$-${safe_pkg}.rc" "/tmp/lint-$$-${safe_pkg}.log" "/tmp/lint-$$-${safe_pkg}.rc"
done

if [ ${#errors[@]} -gt 0 ]; then
  reason=$(printf '%s\n' "${errors[@]}")
  prefix=$'Quality gates falharam antes de Stop. Corrija antes de claim "done":\n\n'
  jq -n --arg reason "$reason" --arg prefix "$prefix" '{decision: "block", reason: ($prefix + $reason)}'
  exit 0
fi

exit 0
