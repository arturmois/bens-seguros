# Backlog

Itens identificados durante revisões/QA que não cabem na PR atual mas precisam ser endereçados. Cada entrada tem origem (PR/skill/QA), arquivos afetados e nível de prioridade. Quando um item virar PR mergeado, **remover a entrada deste arquivo** — o histórico fica em `git log` (mensagem do squash + SHA).

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
