# CI & Security Quick Wins — Design Spec

**Data:** 2026-04-06
**Origem:** `CODE-REVIEW-REPORT.md` items P2-3, P2-4, P2-10
**Escopo:** 3 quick wins de CI/seguranca (~1h total)

---

## Fix 1: pnpm audit no CI (P2-4)

**Problema:** O CI roda lint, typecheck, build, test — mas nao roda `pnpm audit`. Vulnerabilidades em dependencias nao sao detectadas no pipeline.

**Solucao:** Adicionar step `pnpm audit --audit-level high` no workflow `.github/workflows/ci.yml`, apos `pnpm install --frozen-lockfile`.

**Detalhes:**

- `--audit-level high` — ignora low/moderate (ruido)
- `continue-on-error: true` — nao bloqueia CI (vulnerabilidades transitivas podem nao ter fix upstream)
- Serve como **visibilidade**, nao como gate blocker
- Posicionar apos install e antes de lint (nao depende de build)

**Arquivo:** `.github/workflows/ci.yml`

---

## Fix 2: Coverage report no Vitest (P2-3)

**Problema:** Nenhum dos 4 vitest configs tem `coverage` configurado. Nao ha como medir cobertura.

**Solucao:** Adicionar bloco `coverage` nos 5 vitest configs:

- `packages/core/vitest.config.ts`
- `packages/shared/vitest.config.ts`
- `packages/auth/vitest.config.ts`
- `apps/server/vitest.config.ts`
- `apps/chat-server/vitest.config.ts`

**Config:**

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'lcov'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
}
```

**CI:** Adicionar step `pnpm test -- --coverage` como step separado apos `pnpm test`. Usar `continue-on-error: true` — sem threshold minimo por agora (server tem ~0% cobertura, forcaria falha).

**Dependencia:** Instalar `@vitest/coverage-v8` como devDependency no root do monorepo.

**Arquivo:** 5 vitest configs + `.github/workflows/ci.yml` + `package.json` (root)

---

## Fix 3: Docker non-root user (P2-10)

**Problema:** `Dockerfile.server` e `Dockerfile.chat` nao criam usuario non-root. Containers rodam como root, ampliando superficie de ataque.

**Solucao:** Adicionar antes do `CMD` no stage `runner` de ambos os Dockerfiles:

```dockerfile
RUN addgroup --system app && adduser --system --ingroup app app
USER app
```

**Verificacoes:**

- `HEALTHCHECK` usa `node -e "fetch(...)"` — roda como user `app`, funciona porque e HTTP fetch local
- Arquivos copiados com `COPY` pertencem a root por padrao, mas sao read-only para o app (OK — Node.js so precisa ler)
- `node_modules/.prisma/` e outros binarios sao read-only (OK)
- Sem escrita em disco necessaria no runtime (uploads vao para R2 em producao, nao filesystem local)

**Arquivos:** `Dockerfile.server`, `Dockerfile.chat`

---

## Fora de Escopo

- Threshold minimo de cobertura (definir depois de aumentar cobertura do server)
- Turborepo Remote Caching (P3-6 — backlog separado)
- Testes de integracao para server (P2-1 — escopo maior, proximo ciclo)
