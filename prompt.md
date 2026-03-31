Você é um arquiteto de software sênior, especialista em integrações com a Meta Platform (Facebook, Instagram, Messenger e WhatsApp Business Platform), OAuth, Embedded Signup, Graph API, segurança de credenciais e SaaS multi-tenant.

Sua missão é analisar a integração atual com a Meta e propor uma refatoração do fluxo de conexão — de configuração manual de credenciais para um fluxo guiado via Facebook Login + Embedded Signup.

## Stack Tecnológica

- **Monorepo:** pnpm 9 + Turborepo
- **Backend:** Fastify 5 + tsyringe (DI) + Zod + TypeScript 5.9 strict
- **Frontend:** Next.js 16 + React 19 + Tailwind CSS 4 + shadcn/ui
- **Chat Backend:** Fastify 5 + Socket.IO 4 (porta 3002)
- **Worker:** BullMQ 5 (processamento de mensagens)
- **Banco ERP:** PostgreSQL 18 (Prisma 7) com RLS por tenant
- **Banco Chat:** MongoDB 8 (Mongoose) com `tenantId` por documento
- **Cache/Fila:** Redis 8
- **Auth:** Better Auth 1.0 + CASL RBAC (5 roles)
- **Criptografia existente:** AES-256-GCM (`packages/shared/src/crypto.ts`) + HMAC-SHA256

## Contexto Atual — O Que Já Existe

O sistema **já possui** uma integração multi-channel funcional em produção. Não é um greenfield — é uma evolução.

### Modelo de Dados (MongoDB — `packages/db-chat/src/models/channel.model.ts`)

```typescript
Channel {
  tenantId: String (indexed)
  name: String
  type: 'WHATSAPP' | 'WEB_CHAT' | 'MESSENGER' | 'INSTAGRAM'
  brokerType: 'BAILEYS' | 'META' | 'WEB_CHAT' | 'MESSENGER' | 'INSTAGRAM'
  phoneNumber?: String
  isActive: Boolean
  status: 'CONNECTED' | 'DISCONNECTED' | 'QR_PENDING'
  lastConnectedAt?: Date
  aiAgentId?: ObjectId
  config: Mixed // credenciais por tipo de canal
}
```

**Config por tipo de canal (hoje):**

| Canal              | Campos em `config`                                                    |
| ------------------ | --------------------------------------------------------------------- |
| MESSENGER          | `metaAppId`, `metaAppSecret`, `metaPageId`, `metaToken`               |
| INSTAGRAM          | `metaAppId`, `metaAppSecret`, `metaPageId`, `metaToken`               |
| WHATSAPP (Meta)    | `metaAppId`, `metaAppSecret`, `metaToken`, `metaPhoneNumberId`        |
| WEB_CHAT           | `widgetColor`, `welcomeMessage`, `offlineMessage`, `allowedOrigins[]` |
| WHATSAPP (Baileys) | Conexão via QR Code/Pairing Code (sem credenciais Meta)               |

### Broker Pattern (Funcional — `apps/chat-worker/src/messaging/`)

5 brokers implementados com interface `Broker { connect, disconnect, sendMessage, isConnected }`:

- `baileys-broker.ts` — WhatsApp via QR/Pairing Code
- `meta-broker.ts` — WhatsApp Cloud API
- `messenger-broker.ts` — Facebook Messenger
- `instagram-broker.ts` — Instagram DM
- `web-chat-broker.ts` — Widget via Socket.IO

**Factory:** `broker-factory.ts` roteia por `brokerType`.

### Webhook (Funcional — `apps/chat-server/src/infra/http/routes/webhook-routes.ts`)

- `GET /chat/webhook/meta` — verificação Meta (challenge)
- `POST /chat/webhook/meta` — recepção de mensagens com validação HMAC-SHA256 **per-tenant** (usa `config.metaAppSecret` do canal)
- Roteamento: `object === 'page'` → Messenger, `object === 'instagram'` → Instagram, outros → WhatsApp Meta
- Lookup do canal por `config.metaPageId` ou `config.metaPhoneNumberId`

### Auto-Registro de Webhook (Parcial — `channel-routes.ts`)

Ao criar/atualizar canal, o sistema automaticamente:

1. Registra app subscription: `POST /v21.0/{appId}/subscriptions`
2. Registra page subscription (Messenger): `POST /v21.0/{pageId}/subscribed_apps`

**Limitação:** Instagram exige ativação manual no Meta Dashboard (não é possível via API).

### Validação de Credenciais (`channel-meta-service.ts`)

- Valida token: `GET /{pageId}/conversations` (Messenger) ou `GET /{pageId}?fields=id,name,username` (Instagram/WA)
- Valida app: `GET /{appId}?access_token={appId}|{appSecret}`
- Hook no frontend: `useValidateMetaChannel()`

### UI Atual (`apps/web/src/features/channels/`)

- Formulário manual com campos: App ID, App Secret, Page ID, Token
- Validação Zod + teste de conexão antes de salvar
- CRUD completo de canais

### Segurança Existente

- ✅ HMAC-SHA256 per-tenant para webhook
- ✅ `timingSafeEqual` para comparação de assinatura
- ✅ Timing-safe no HMAC
- ✅ JWT para widget visitors (24h TTL)
- ✅ Rate limiting (widget + Socket.IO)
- ✅ CORS dinâmico por canal (web chat)
- ✅ AES-256-GCM + HMAC para PII (CPF/CNPJ no PostgreSQL)
- ❌ **Credenciais Meta armazenadas em PLAIN TEXT no MongoDB** (gap crítico)
- ❌ Sem rotação/renovação automática de tokens
- ❌ Sem audit log de alterações de credenciais

### Variáveis de Ambiente Meta

```
META_WEBHOOK_VERIFY_TOKEN  — token global de verificação webhook (env)
CHAT_WEBHOOK_PUBLIC_URL    — URL pública do webhook (opcional, default: CHAT_SERVER_URL/chat/webhook/meta)
ENCRYPTION_KEY             — chave AES-256-GCM já existente (64 hex chars)
```

Credenciais de app (`metaAppId`, `metaAppSecret`, `metaToken`) são **per-tenant** no MongoDB, não em env.

## Problemas do Fluxo Atual

1. **UX ruim:** Usuário precisa navegar no Meta for Developers, criar app, gerar token, copiar IDs técnicos
2. **Erro operacional alto:** Token gerado antes de adicionar permissões não herda novos scopes (descoberto em produção)
3. **Setup WhatsApp complexo:** Múltiplos WABAs criados automaticamente, system user precisa de role no app, número só pode estar em 1 WABA
4. **Credenciais em plaintext:** `metaAppSecret` e `metaToken` sem criptografia no MongoDB
5. **Sem refresh de token:** Tokens de longa duração sem rotação automática
6. **Sem discovery de assets:** Usuário digita Page ID manualmente em vez de selecionar de uma lista
7. **Instagram bloqueado:** Requer App Review para `instagram_manage_messages` — usuário não sabe disso
8. **Onboarding lento:** Cada tenant precisa criar seu próprio Facebook App

## Objetivo da Refatoração

Substituir o modelo de "cada tenant cria seu próprio Facebook App" por um modelo onde:

- O SaaS (Bens Seguros) possui **um Facebook App centralizado** (já publicado em produção)
- O cliente clica em "Conectar com Facebook/Meta"
- Faz login via Facebook Login / Embedded Signup
- Concede permissões necessárias
- O sistema descobre automaticamente Pages, Instagram Business Accounts, WABAs e Phone Numbers
- O cliente seleciona qual ativo vincular ao canal
- Credenciais são trocadas, criptografadas e armazenadas automaticamente
- Tokens são renovados automaticamente

**O Baileys (WhatsApp via QR Code) continua existindo** como alternativa ao WhatsApp Cloud API. O dual-broker pattern é mantido.

## O Que Você Deve Fazer

### 1. Diagnóstico do Fluxo Atual

- Quais são os problemas concretos do modelo "tenant cria seu próprio app"
- Riscos de segurança com credenciais em plaintext
- Impactos no onboarding, suporte e escalabilidade
- O que funciona bem e deve ser preservado (broker pattern, webhook HMAC per-tenant, auto-register)

### 2. Arquitetura Proposta

Desenhe a nova arquitetura considerando:

- **Facebook Login** para Messenger + Instagram (OAuth com scopes: `pages_messaging`, `pages_manage_metadata`, `instagram_basic`, `instagram_manage_messages`)
- **Embedded Signup** para WhatsApp Business Platform (fluxo específico do WhatsApp Cloud API)
- **App centralizado** (Bens Seguros como Tech Provider) vs. per-tenant apps
- Backend como responsável por trocar code → token, renovar, criptografar
- Frontend apenas inicia o fluxo de conexão (popup/redirect)
- Compatibilidade com o modelo de dados existente (`Channel` no MongoDB)
- Compatibilidade com o broker pattern existente (não quebrar brokers)
- Multi-tenancy: cada tenant vê e gerencia apenas seus ativos

### 3. Fluxo de Conexão Passo a Passo

Para cada produto (Messenger, Instagram, WhatsApp), descreva:

- Clique do usuário no botão de conectar
- Popup Facebook Login / Embedded Signup
- Consentimento e permissões solicitadas
- Callback para o backend (code exchange)
- Troca de short-lived token por long-lived token
- Discovery automático de assets:
  - Pages (`/me/accounts`)
  - Instagram Business Accounts (`/{page-id}?fields=instagram_business_account`)
  - WABAs (`/debug_token` + Business discovery)
  - Phone Numbers do WhatsApp
- Tela de seleção de assets
- Persistência no MongoDB (canal vinculado ao tenant)
- Registro automático de webhook
- Validação final da conexão

### 4. Experiência do Usuário

- Quais botões e telas devem existir (manter compatibilidade com `apps/web/src/features/channels/`)
- Como reduzir campos manuais (idealmente ZERO campos técnicos para o usuário)
- Como mostrar assets disponíveis para seleção (Pages, Instagram accounts, WhatsApp numbers)
- Como exibir status da integração (CONNECTED, DISCONNECTED, EXPIRED, NEEDS_REAUTH)
- Como tratar erros de permissão (scope insuficiente, App Review pendente)
- Como reconectar quando token expirar
- Como manter o fluxo manual como fallback (para tenants que já têm seu próprio app)

### 5. Segurança

Detalhe como resolver os gaps atuais:

- **Criptografia de credenciais:** Usar AES-256-GCM existente (`packages/shared/src/crypto.ts`) para `metaToken` e `metaAppSecret` no MongoDB
- **Rotação de tokens:** Long-lived tokens duram 60 dias — implementar refresh automático
- **App Secret centralizado:** Apenas o app secret do SaaS em env, não mais per-tenant
- **State parameter:** Validação anti-CSRF no OAuth callback (incluir tenantId + nonce)
- **Segregação por tenant:** Garantir que assets de um tenant não são visíveis para outro
- **Audit log:** Registrar todas as operações de conexão/desconexão/reconexão
- **Logs seguros:** Nunca logar tokens ou secrets — usar masking
- **Revogação:** Ao desconectar, revogar permissões via API (`/me/permissions`)

### 6. Evolução do Modelo de Dados

O modelo `Channel` no MongoDB precisa evoluir. Proponha:

- Como adicionar campos para o novo fluxo (e.g., `metaUserId`, `tokenExpiresAt`, `scopes[]`, `connectionMethod: 'oauth' | 'manual'`)
- Como criptografar `config.metaToken` e `config.metaAppSecret` (migração de plaintext → encrypted)
- Se precisa de uma entidade separada (e.g., `MetaConnection`) ou se o `Channel.config` é suficiente
- Como armazenar múltiplos assets descobertos antes da seleção do usuário
- Status granulares: `CONNECTED`, `DISCONNECTED`, `TOKEN_EXPIRED`, `NEEDS_REAUTH`, `PERMISSION_REVOKED`

### 7. Endpoints e Backend

Sugira os novos endpoints necessários no `apps/chat-server` (padrão: Fastify + Zod schema):

- Iniciar conexão OAuth (gera URL do Facebook Login / Embedded Signup)
- Callback da Meta (recebe code, troca por token)
- Listar assets conectáveis (pages, instagram accounts, phone numbers)
- Selecionar e vincular asset a um canal
- Status da integração
- Reconectar (re-auth quando token expirar)
- Desconectar (revogar + limpar credenciais)
- Refresh de token (cron job ou on-demand)

Para cada endpoint: método HTTP, payload, resposta, regras de negócio, autenticação.

### 8. Estratégia de Migração

O sistema tem canais em produção configurados manualmente. Explique:

- Como migrar canais existentes (plaintext → encrypted) sem downtime
- Como manter compatibilidade com canais configurados manualmente (tenant com seu próprio app)
- Como fazer rollout gradual (flag `connectionMethod: 'oauth' | 'manual'`)
- Como identificar canais aptos à migração
- Como descontinuar o fluxo manual com segurança

### 9. Observabilidade

- Logs essenciais (conexão, token refresh, webhook delivery, errors)
- Métricas (taxa de sucesso de conexão, tokens expirando, webhook failures)
- Alertas (token expirado sem refresh, webhook delivery failure rate)
- Como facilitar suporte sem expor secrets

### 10. Limitações Reais da Meta Platform

Documente limitações conhecidas (confirmadas em produção):

- Tokens não herdam permissões adicionadas depois da geração (precisa regenerar)
- Instagram requer App Review para `instagram_manage_messages`
- WhatsApp Embedded Signup cria novo WABA — números precisam ser migrados
- System User token requer role no app (não basta asset assignment)
- Phone number só pode estar em 1 WABA por vez
- Webhook verify token é global (GET request não identifica tenant)
- Instagram webhook subscription não é possível via API (requer dashboard)

### 11. Entrega Prática

No final, entregue:

#### A. Plano de refatoração em 3-4 fases executáveis

Separado por: criptografia de credenciais → OAuth/Embedded Signup → token management → migração

#### B. Lista de tarefas técnicas

Quebrada em: frontend (`apps/web`), backend (`apps/chat-server`), worker (`apps/chat-worker`), shared (`packages/shared`), banco (MongoDB), segurança, DevOps

#### C. Fluxo ideal end-to-end

Diagrama textual do início ao fim para cada produto (Messenger, Instagram, WhatsApp)

#### D. Comparativo "Fluxo atual vs fluxo proposto"

Tabela lado a lado mostrando a evolução

#### E. Riscos e pontos de atenção

Incluindo dependências de App Review, limitações de API, e edge cases descobertos em produção

## Regras Importantes

- Não proponha soluções que ignorem o modelo real de autenticação da Meta
- Considere que **o Facebook App do SaaS já existe e está publicado** (App ID: 1558286935264766)
- O objetivo é esconder a complexidade técnica do usuário final, não eliminar autenticação
- **Preserve o broker pattern** — a refatoração é no fluxo de conexão, não no envio/recepção de mensagens
- **Preserve o webhook HMAC per-tenant** — se migrar para app centralizado, ajustar para usar app secret global
- **O Baileys (WhatsApp via QR) continua** — é alternativa válida ao Cloud API
- Sempre que houver dependência de App Review ou limitação da Meta, deixe explícito
- Pense como alguém evoluindo uma integração real em produção, não construindo do zero
- A resposta deve ser prática e pronta para servir como base de implementação

## Formato da Resposta

1. Resumo executivo
2. Diagnóstico do fluxo atual (o que funciona, o que não funciona)
3. Arquitetura proposta (com diagramas textuais)
4. Fluxo novo passo a passo (por produto: Messenger, Instagram, WhatsApp)
5. UX recomendada (telas, botões, estados)
6. Segurança e criptografia (resolver gaps atuais)
7. Evolução do modelo de dados (MongoDB)
8. Endpoints e backend
9. Estratégia de migração (zero downtime)
10. Plano de implementação por fases
11. Limitações da Meta e riscos
12. Recomendação final
