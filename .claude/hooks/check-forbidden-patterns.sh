#!/usr/bin/env bash
# Hook A — bloqueia padrões proibidos em Edit/Write antes da gravação.
# Lê tool input via stdin (JSON), aplica regexes contextuais, retorna decision: block se match.
set -euo pipefail

input=$(cat)

# Extrair file_path e conteúdo (new_string pra Edit, content pra Write)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
new_content=$(echo "$input" | jq -r '.tool_input.new_string // .tool_input.content // empty')

# Skip se não é arquivo TS/TSX
if ! [[ "$file_path" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

violations=()

# Pattern 1: console.log fora de test files / scripts
if [[ ! "$file_path" =~ \.(spec|test)\.(ts|tsx)$ ]] && [[ ! "$file_path" =~ ^scripts/ ]]; then
  if echo "$new_content" | grep -qE 'console\.log\('; then
    violations+=("console.log encontrado em $file_path — use Pino logger (CLAUDE.md ABSOLUTE PROHIBITIONS).")
  fi
fi

# Pattern 2: any em posição de tipo
if echo "$new_content" | grep -qE ':\s*any\b|<any>|as any\b|Array<any>|Promise<any>|Record<[^,]+,\s*any>'; then
  violations+=("Tipo 'any' encontrado em $file_path — use 'unknown' + type narrowing (CLAUDE.md ABSOLUTE PROHIBITIONS).")
fi

# Pattern 3: eslint-disable / ts-ignore / ts-expect-error
if echo "$new_content" | grep -qE '//\s*(eslint-disable|@ts-ignore|@ts-expect-error)'; then
  violations+=("Comentário eslint-disable/ts-ignore/ts-expect-error encontrado em $file_path — fix the code, not the linter (CLAUDE.md ABSOLUTE PROHIBITIONS).")
fi

# Pattern 4: process.env em apps server-side ou packages (allow apps/web/* NEXT_PUBLIC_*)
if [[ "$file_path" =~ ^apps/(server|chat-server|worker|chat-worker)/ ]] || [[ "$file_path" =~ ^packages/ ]]; then
  if echo "$new_content" | grep -qE 'process\.env\.[A-Z_]+'; then
    violations+=("process.env encontrado em $file_path — use 'import { env } from \"@repo/env\"' (CLAUDE.md ABSOLUTE PROHIBITIONS).")
  fi
fi

# Se violations, bloquear
if [ ${#violations[@]} -gt 0 ]; then
  reason=$(printf '%s\n' "${violations[@]}")
  jq -n --arg reason "$reason" '{decision: "block", reason: $reason}'
  exit 0
fi

exit 0
