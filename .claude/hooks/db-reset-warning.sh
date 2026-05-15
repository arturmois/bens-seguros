#!/usr/bin/env bash
# Hook C — avisa sobre RLS após pnpm db:reset / prisma migrate reset.
# Não bloqueia — só injeta additionalContext.
set -euo pipefail

input=$(cat)
cmd=$(echo "$input" | jq -r '.tool_input.command // empty')

if [ -z "$cmd" ]; then
  exit 0
fi

if echo "$cmd" | grep -qE 'db:reset|prisma migrate reset'; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: "AVISO: Após `pnpm db:reset` ou `prisma migrate reset`, é OBRIGATÓRIO rodar `psql $DATABASE_URL -f packages/db/prisma/rls-policies.sql` ou o server :3001 entra em crash loop (RLS policies não são re-aplicadas automaticamente). Ver memory: db-reset-skips-rls."
    }
  }'
fi

exit 0
