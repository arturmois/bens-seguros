# Quick Wins Residuais — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os 3 itens residuais da auditoria de quick wins: upgrade do pacote `ai`, Cache-Control no chat-server, e lazy-loading do QR code.

**Architecture:** Fixes isolados sem dependencia entre si. Podem ser executados em paralelo.

**Tech Stack:** pnpm, Fastify hooks, next/dynamic

---

## File Structure

```
packages/ai/package.json                              # Modify: bump ai version
apps/chat-server/src/app.ts                            # Modify: add Cache-Control hook
apps/web/src/features/channels/components/channel-qr-tab.tsx  # Modify: dynamic import
```

---

## Task 1: Upgrade `ai` package (C2)

**Context:** `ai@4.3.19` tem vulnerabilidade low (GHSA-rwvc-j5jr-mgvh — file type whitelist bypass). Fix em `>=5.0.52`. O projeto nao usa file upload via AI SDK, entao o risco e teorico, mas convem atualizar.

**Files:**

- Modify: `packages/ai/package.json`

- [ ] **Step 1: Bump ai version**

```bash
cd /home/artur/projects && pnpm --filter @repo/ai up ai@^5.0.52
```

- [ ] **Step 2: Verify no breaking changes**

```bash
pnpm typecheck --filter @repo/ai
```

Expected: PASS (API surface usada — `generateText`, `streamText`, `CoreMessage`, `ToolSet` — e estavel entre v4 e v5)

- [ ] **Step 3: Run audit to confirm fix**

```bash
pnpm audit
```

Expected: Zero vulnerabilidades HIGH/CRITICAL. Se `ai` v5 trouxer breaking changes, fixar para a minor mais recente do v5.x.

- [ ] **Step 4: Commit**

```bash
git add packages/ai/package.json pnpm-lock.yaml
git commit -m "fix(deps): upgrade ai SDK to fix file type whitelist bypass (GHSA-rwvc-j5jr-mgvh)"
```

---

## Task 2: Cache-Control headers no chat-server (SEC-07)

**Context:** O server principal ja tem Cache-Control `no-store` em todas as rotas `/api/`. O chat-server nao tem — rotas `/chat/` retornam sem cache headers.

**Files:**

- Modify: `apps/chat-server/src/app.ts`

- [ ] **Step 1: Add onSend hook**

Adicionar o hook apos o registro dos plugins existentes, antes do registro das rotas. Copiar o pattern do server principal adaptando o prefixo:

```typescript
app.addHook('onSend', async (request, reply, payload) => {
  if (request.url.startsWith('/chat/')) {
    void reply.header(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, max-age=0'
    )
    void reply.header('Pragma', 'no-cache')
  }
  return payload
})
```

- [ ] **Step 2: Verify**

```bash
pnpm typecheck --filter chat-server
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/chat-server/src/app.ts
git commit -m "fix(chat-server): add Cache-Control no-store headers on /chat/ API routes"
```

---

## Task 3: Lazy-load QR code component (M4)

**Context:** `qrcode.react` (~10-15KB) e importado estaticamente no `channel-qr-tab.tsx`. Como o QR dialog so abre quando o usuario clica em "Conectar WhatsApp", convem lazy-loadar.

**Files:**

- Modify: `apps/web/src/features/channels/components/channel-qr-tab.tsx`

- [ ] **Step 1: Convert QRCodeSVG to dynamic import**

Substituir o import estatico:

```typescript
// Antes:
import { QRCodeSVG } from 'qrcode.react'

// Depois:
import dynamic from 'next/dynamic'

const QRCodeSVG = dynamic(
  () => import('qrcode.react').then((mod) => ({ default: mod.QRCodeSVG })),
  { ssr: false, loading: () => <div className="h-64 w-64 animate-pulse rounded-lg bg-muted" /> }
)
```

- [ ] **Step 2: Verify typecheck**

```bash
pnpm typecheck --filter web
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/channels/components/channel-qr-tab.tsx
git commit -m "perf(web): lazy-load qrcode.react in channel QR dialog"
```

---

## Task 4: Update backlog docs

- [ ] **Step 1: Remove resolved items from fix backlog**

Atualizar `docs/plans/fix/README.md` para marcar C2, SEC-07, M4 como resolvidos. Remover H1 (ja estava corrigido).

- [ ] **Step 2: Commit**

```bash
git add docs/plans/fix/README.md
git commit -m "docs: update fix backlog — mark C2, H1, SEC-07, M4 as resolved"
```
