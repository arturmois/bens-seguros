# Backlog

Itens identificados durante revisões/QA que não cabem na PR atual mas precisam ser endereçados. Cada entrada tem origem (PR/skill/QA), arquivos afetados e nível de prioridade. Quando um item virar PR, mover pra `## Concluído` com SHA do merge.

## Prioridade baixa

### Adicionar `CHAT_MESSENGER`/`CHAT_INSTAGRAM` ao enum `ContactSource`

**Origem:** PR #210 (TODO inline em `apps/chat-worker/src/processors/ai-bot-processor.ts`, helper `channelTypeToContactSource`)
**Trigger:** quando canais Meta (Messenger/Instagram) forem para produção.
**Hoje:** ambos caem em `MANUAL` com `logger.warn`. Atribuição perdida no Postgres.

**Ação:**

- Adicionar membros ao enum em `packages/db/prisma/schema.prisma`.
- Migration (`pnpm db:migrate --name add-meta-contact-sources`).
- Atualizar `channelTypeToContactSource` em `apps/chat-worker/src/processors/ai-bot-processor.ts` (mapear `MESSENGER` → `CHAT_MESSENGER`, `INSTAGRAM` → `CHAT_INSTAGRAM`).
- Remover o TODO e o `logger.warn`.

### Extrair `channelTypeToContactSource` para módulo testável

**Origem:** PR #210 (test-analyzer + type-design-analyzer, 2026-05-01)
**Bloqueio atual:** `apps/chat-worker` não tem infra de Vitest configurada.

**Ação:**

- Configurar Vitest em `apps/chat-worker` (vitest.config.ts + script `test` em package.json + env block para `@repo/env`).
- Mover helper de `apps/chat-worker/src/processors/ai-bot-processor.ts` para `apps/chat-worker/src/lib/channel-source-mapping.ts`.
- Adicionar 4 testes (um por `ChannelType`) + 1 caso negativo verificando o `throw` em valor desconhecido.

### Edit Web Chat channel — UX cache stale

**Origem:** QA E2E webchat (2026-05-01)
**Sintoma:** Após criar canal Web Chat sem agente IA, abrir o dialog "Editar canal" mostra o agente IA correto na primeira render, mas se o `aiAgentId` for alterado externamente (Mongo), o React Query continua servindo cache stale por 60s.

**Ação:**

- Não é bug do código — é comportamento esperado de cache. Documentar o `staleTime: 60_000` na tabela de canais ou reduzir para o caso de detail dialogs.
- Alternativa: invalidar `[CHANNELS_KEY]` ao abrir o dialog em modo edit.

## Concluído

- **2026-05-02 — `89633e71` (PR #210) — Propagar `ContactSource` derivado do canal no `/api/internal/leads`**
  Capture-lead recebe `ChannelType` e mapeia para `ContactSource` via `channelTypeToContactSource`; rota tightena `body.source` com `z.nativeEnum(ContactSource)` e default `'MANUAL'`; chat-worker propaga atribuição correta por canal.

- **2026-05-02 — `fcb670c7` (PR #211) — Convergir `ContactSource` em `@repo/db` (HIGH + MEDIUM-1)**
  Removidos os exports errados de `@repo/shared`; `ContactSource` re-exportado de `@repo/db` virou fonte canônica; `packages/core` domain, `apps/server` contacts schemas e `packages/db-chat/contact.model.ts` (que era semanticamente `ChannelType`) alinhados.

- **2026-05-02 — `504c3051` (PR #215, ex-#212) — Centralizar `ChannelType`/`BrokerType` em `@repo/shared` (MEDIUM-2)**
  `@repo/shared` virou fonte única; 4 duplicatas inline (db-chat model, chat-server domain, chat-server route, web frontend) consolidadas. `db-chat/index.ts` re-exporta de `@repo/shared` para manter o contrato público que o chat-worker usa. `z.enum(CHANNEL_TYPES)` agora é a validação canônica nas rotas.

- **2026-05-02 — `a0684e9d` (PR #216, ex-#213) — Welcome default WEB_CHAT + cobertura `body.source` ignorado (LOW)**
  `POST /chat/channels` aplica default `'Olá! Como podemos ajudá-lo?'` em `config.welcomeMessage` para canais Web Chat sem mensagem; teste novo em `create-lead.spec.ts` complementa os testes do #210 cobrindo o caminho de contato existente (atribuição preservada).
