---
description: Regenerate Orval API client (hooks + types + Zod) from the running server's OpenAPI spec. Verifies server is up, regenerates, runs typecheck on web, reports changes.
---

# /regen-api

Executa a sequência abaixo exatamente. Pare na primeira falha — não tente fix automático.

## Passos

1. **Verificar server :3001**

   ```bash
   curl -sf http://localhost:3001/health > /dev/null || { echo "❌ Server :3001 down. Inicie com: pnpm --filter @app/server dev"; exit 1; }
   ```

2. **Regenerar API client**

   ```bash
   pnpm --filter @app/web generate:api
   ```

3. **Typecheck no web**

   ```bash
   pnpm --filter @app/web typecheck
   ```

4. **Mostrar arquivos alterados**

   ```bash
   git status apps/web/src/api/
   ```

## Se algum passo falhar

- Passo 1 → instruir o usuário a iniciar o server e re-rodar `/regen-api`.
- Passo 2 → mostrar erro do Orval; verificar `apps/web/orval.config.ts` e a saúde do OpenAPI spec em `http://localhost:3001/api/docs`.
- Passo 3 → typecheck error indica que o backend mudou contract de forma breaking. Não fix automaticamente — reportar pro usuário decidir.

## NÃO fazer

- NÃO commitar automaticamente os arquivos gerados.
- NÃO modificar manualmente arquivos em `apps/web/src/api/` — sempre re-gerar.
- NÃO instalar dependências como parte deste comando.
