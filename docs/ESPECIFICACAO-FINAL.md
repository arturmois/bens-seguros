# Especificacao Final - Bens Seguros SaaS

> Documento consolidado a partir da analise de 3 MVPs com decisoes de arquitetura validadas.

---

## 1. VISAO GERAL

**Produto:** ERP SaaS multi-tenant para corretoras de seguros brasileiras.

**Stack Core:** TypeScript strict (zero `any`) | Node.js 22 LTS | pnpm 9 + Turborepo

---

## 2. ARQUITETURA DO MONOREPO

```
bens-seguros/
├── apps/
│   ├── web/              # Next.js 16 + React 19 (App Router)
│   ├── server/           # Fastify 5 - API REST do ERP
│   ├── worker/           # BullMQ - jobs assincronos do ERP
│   ├── chat-server/      # Fastify 5 + Socket.IO - API do chat
│   └── chat-worker/      # BullMQ + Baileys + AI bot
├── packages/
│   ├── core/             # DDD - domain, application, infrastructure
│   ├── db/               # Prisma 7 + PostgreSQL 18
│   ├── db-chat/          # Mongoose + MongoDB 8
│   ├── auth/             # Better Auth 1.0 + CASL RBAC
│   ├── ai/               # Vercel AI SDK (multi-provider)
│   ├── env/              # t3-oss/env-core + Zod
│   └── shared/           # Socket.IO types, API types, DTOs
├── config/
│   ├── eslint-config/
│   ├── prettier-config/
│   └── typescript-config/
├── docker-compose.yml
├── docker-compose.prod.yml
└── turbo.json
```

### Apps - Responsabilidades

| App             | Runtime    | Responsabilidade                                                         | Stateful             |
| --------------- | ---------- | ------------------------------------------------------------------------ | -------------------- |
| **web**         | Vercel     | UI, Server Components, Server Actions, proxy auth                        | Nao                  |
| **server**      | Docker VPS | API REST ERP, Swagger/Scalar, CRUD completo                              | Nao                  |
| **worker**      | Docker VPS | Jobs ERP: emissao apolice, comissao, notificacoes, export, policy-expiry | Nao                  |
| **chat-server** | Docker VPS | API REST + Socket.IO chat, webhooks Meta, Redis pub/sub                  | Sim (WebSocket)      |
| **chat-worker** | Docker VPS | Baileys (WA primary), Meta API (fallback), AI bot, lead capture          | Sim (sessao Baileys) |

---

## 3. STACK TECNICA COMPLETA

### Backend

| Tecnologia     | Versao     | Uso                                       |
| -------------- | ---------- | ----------------------------------------- |
| Node.js        | 22 LTS     | Runtime                                   |
| TypeScript     | 5.9 strict | Linguagem                                 |
| Fastify        | 5          | HTTP server + type provider Zod           |
| tsyringe       | latest     | Dependency Injection                      |
| BullMQ         | 5          | Job queue (Redis-backed)                  |
| Prisma         | 7          | ORM PostgreSQL                            |
| Mongoose       | latest     | ODM MongoDB (chat domain)                 |
| Zod            | latest     | Validacao em todas as fronteiras          |
| Pino           | latest     | Structured logging                        |
| Socket.IO      | 4          | Real-time (Redis adapter)                 |
| Better Auth    | 1.0        | Autenticacao                              |
| CASL           | latest     | RBAC ability-based                        |
| Vercel AI SDK  | latest     | Multi-provider AI (Claude Sonnet primary) |
| Baileys        | 7          | WhatsApp Web (primary)                    |
| Meta Graph API | latest     | WhatsApp Business (fallback)              |
| Resend         | latest     | Email transacional                        |
| React Email    | latest     | Templates JSX tipados                     |

### Frontend

| Tecnologia           | Versao | Uso                                  |
| -------------------- | ------ | ------------------------------------ |
| Next.js              | 16     | Framework (App Router)               |
| React                | 19     | UI + Server Components               |
| Tailwind CSS         | 4      | Styling (oklch color space)          |
| shadcn/ui            | latest | Componentes (Radix UI base)          |
| TanStack React Query | 5      | Data fetching + cache                |
| TanStack React Table | 8      | Tabelas                              |
| React Hook Form      | latest | Formularios                          |
| Zod                  | latest | Validacao client-side                |
| Orval                | latest | Codegen OpenAPI -> React Query hooks |
| Framer Motion        | 12     | Animacoes                            |
| @dnd-kit             | latest | Drag & Drop (futuro Kanban)          |
| lucide-react         | latest | Icones                               |
| Sonner               | latest | Toast notifications                  |
| next-themes          | latest | Dark mode                            |
| @react-pdf/renderer  | latest | Geracao PDF                          |
| Socket.IO Client     | 4      | Real-time chat                       |

### Infraestrutura

| Tecnologia              | Uso                                                |
| ----------------------- | -------------------------------------------------- |
| PostgreSQL 18           | Dados ERP multi-tenant (RLS)                       |
| MongoDB 8               | Chat domain (replica set)                          |
| Redis 8                 | Cache, filas, pub/sub, Socket.IO adapter           |
| Docker + Docker Compose | Containerizacao                                    |
| Nginx                   | Reverse proxy + SSL termination                    |
| Cloudflare R2           | Storage documentos (S3-compatible, presigned URLs) |
| Vercel                  | Deploy frontend                                    |
| Hostinger VPS           | Deploy backend (Docker)                            |
| GitHub Actions          | CI/CD                                              |
| Sentry                  | Error tracking + performance                       |
| Bull Board              | Dashboard de filas                                 |

---

## 4. DEPLOY

```
┌──────────────────────────────────────────────────┐
│                    VERCEL                         │
│  web (Next.js) - auto-deploy via git push        │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│              HOSTINGER VPS (Docker)               │
│                                                  │
│  nginx:alpine (:80/:443) - reverse proxy + SSL   │
│  server (:3001) - Fastify API ERP                │
│  worker - BullMQ jobs ERP                        │
│  chat-server (:3002) - Fastify + Socket.IO       │
│  chat-worker - BullMQ + Baileys + AI             │
│                                                  │
│  postgres:18 (:5432) - volume: pg-data           │
│  mongo:8 (:27017) - volume: mongo-data           │
│  redis:8 (:6379) - volume: redis-data            │
└──────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│                   EXTERNO                        │
│  Cloudflare R2 - storage documentos              │
│  Sentry - error tracking                         │
│  Meta API - WhatsApp Business (fallback)         │
│  Resend - email transacional                     │
│  Anthropic/OpenAI - AI multi-provider            │
└──────────────────────────────────────────────────┘
```

### Nginx Routing

```
api.dominio.com/api/v1/*      -> server:3001
api.dominio.com/chat/*        -> chat-server:3002
api.dominio.com/socket.io/*   -> chat-server:3002 (WebSocket upgrade)
api.dominio.com/docs          -> server:3001/docs
```

### CI/CD (GitHub Actions)

- `apps/web/**` mudou -> Vercel auto-deploy
- `apps/server/**` ou `apps/worker/**` mudou -> build Docker -> push Hub -> SSH VPS -> restart server + worker
- `apps/chat-server/**` ou `apps/chat-worker/**` mudou -> build Docker -> push Hub -> SSH VPS -> restart chat-server + chat-worker
- `packages/**` mudou -> rebuild dependentes

### Imagens Docker: 2 no total

- `bens-server:latest` (roda como server ou worker via entrypoint)
- `bens-chat:latest` (roda como chat-server ou chat-worker via entrypoint)

---

## 5. MULTI-TENANCY

- **PostgreSQL RLS:** `SET app.current_tenant` por transacao
- **Prisma extension:** `createTenantClient(organizationId)` wrapa queries com RLS
- **MongoDB:** campo `tenantId` explicito em todos documentos
- **Middleware chain:** authMiddleware -> requireAuth -> tenantMiddleware -> requireAbility
- **Regra:** toda query inclui `organizationId`; nunca confiar em tenant do client-side

---

## 6. AUTENTICACAO E AUTORIZACAO

### Auth

- Better Auth 1.0 (email/password, OAuth-ready)
- Sessao: 7 dias expiry, 1 dia auto-refresh
- Cookie: httpOnly + secure
- Organization plugin: multi-org por usuario

### RBAC - 5 Roles

| Role           | Escopo                                                           |
| -------------- | ---------------------------------------------------------------- |
| **OWNER**      | Dono da corretora. `manage all`. Unico por org, nao removivel    |
| **ADMIN**      | Gestao completa exceto Organization. Aprova comissoes            |
| **MANAGER**    | Acesso operacional completo. Aprova comissoes                    |
| **COMMERCIAL** | Limitado a proprios proposals/clients. Read policies/commissions |
| **VIEWER**     | Read-only em todos recursos. Para parceiros/seguradoras          |

### Permissoes

- 40+ permissoes granulares (client:create, proposal:approve, commission:approve:admin, etc.)
- CASL abilities computadas por role
- Frontend: `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`
- Backend: `requireAbility('action', 'Subject')` middleware
- Rotas protegidas via middleware + ProtectedRoute component

---

## 7. DDD HIBRIDO

### DDD Full (State machines complexas)

**Modulos:** Proposal, Commission, Conversation (Chat)

```
modules/<Module>/
  domain/
    <Entity>.ts           # Private constructor + create()/restore()
    <Module>Repository.ts # Interface (port)
    <Module>Errors.ts     # Domain errors
    events/               # Domain events
  application/
    <UseCase>.ts          # @injectable() com execute(dto, ctx)
    <UseCase>.spec.ts     # Testes obrigatorios para TODAS transicoes
    dtos/
  infrastructure/
    Prisma<Module>Repository.ts
    <Module>Mapper.ts     # Domain <-> Persistence
```

**State Machines:**

- Proposal: CAPTURE -> QUOTE -> PROTOCOL -> INSPECTION -> PAYMENT -> POLICY_ISSUED | LOST
- Commission: PENDING_COMMERCIAL -> PENDING_ADMIN -> APPROVED -> PAID | REJECTED | REVERSED
- Conversation: BOT_ACTIVE -> WAITING_HUMAN -> HUMAN_ACTIVE -> CLOSED

### DDD Light (CRUD com validacao)

**Modulos:** Client, Policy, Claim, Endorsement, Assistance, Document, Occurrence

```
modules/<Module>/
  types/schemas.ts        # Zod schemas
  application/
    <UseCase>.ts          # Logica simplificada
  infrastructure/
    Prisma<Module>Repository.ts
```

### Padroes Transversais

- **Presenter:** entity -> HTTP DTO
- **Mapper:** domain <-> persistence
- **Repository Interface:** domain define contrato, infra implementa
- **Event-Driven:** domain events + Redis pub/sub
- **Broker Pattern:** multi-channel messaging (Baileys primary, Meta fallback)
- **Error Standardization:** classes customizadas com .code e .message

### Response Pattern (API)

```json
{ "success": true, "data": {}, "meta": { "total": 10, "nextCursor": "..." } }
{ "success": false, "error": { "code": "CONFLICT", "message": "..." } }
```

---

## 8. MODULOS FUNCIONAIS

### 8.1 Clientes

- CRUD Individual / Empresa
- CPF/CNPJ unico por organizacao
- Tipos: LEAD, CLIENT, FORMER_CLIENT
- Lead-to-client promotion
- Dados: nome, documento, telefone, email, endereco (JSON), estado civil, profissao, data nascimento
- Tags, consentimento LGPD
- **Soft delete: sim**

### 8.2 Propostas

- **Estagios:** CAPTURE -> QUOTE -> PROTOCOL -> INSPECTION -> PAYMENT -> POLICY_ISSUED | LOST
- Tipos board: NEW_INSURANCE, RENEWAL
- **Duas views:** Tabela (TanStack Table) + Kanban (@dnd-kit) com toggle. Kanban agrupa por estagio, drag-and-drop avanca/reverte stage
- Ramos: AUTO, RESIDENTIAL, CONDOMINIUM, BUSINESS, LIFE, OTHER
- Premio e comissao em centavos
- Checklist por estagio
- Motivo de perda
- Documentos anexados
- **Soft delete: sim**

### 8.3 Apolices

- Emissao a partir de proposta (1:1 unique)
- Numero unico, cobertura (JSON)
- Status: ACTIVE, CANCELLED, EXPIRED
- Datas: inicio, fim, cancelamento
- Renovacao via renewalPolicyId
- **Soft delete: sim**

### 8.4 Sinistros

- Workflow: REGISTERED -> IN_ANALYSIS -> AWAITING_DOCUMENT -> PENDING_INSPECTION -> APPROVED/REJECTED -> PAID -> COMPLETED
- Prioridade: NORMAL, HIGH, URGENT
- Ocorrencias (sub-entidade log)
- Vinculo com seguradora
- Atribuicao a agente
- **Soft delete: sim**

### 8.5 Comissoes

- Workflow: PENDING_COMMERCIAL -> PENDING_ADMIN -> APPROVED -> PAID | REJECTED | REVERSED
- Criacao automatica na emissao da apolice
- Calculo: premio x percentual (basis points)
- Split entre vendedores
- Estorno/reversal
- Export CSV
- **Soft delete: sim**

### 8.6 Endossos

- Modificacoes em apolices vigentes
- Snapshot before/after (JSON)
- Data efetiva
- Soft delete: nao

### 8.7 Assistencias

- Status: REQUESTED -> AWAITING_DOCUMENT -> PENDING_INSPECTION -> DISPATCHED -> IN_PROGRESS -> COMPLETED
- Localizacao (endereco + coordenadas)
- Provedor de servico
- Soft delete: nao

### 8.8 Documentos

- Multi-entidade: proposta, apolice, sinistro, cliente
- Tipos: DRIVER_LICENSE, VEHICLE_REGISTRATION, POLICY_PDF, CLAIM_PHOTO, etc.
- Storage: Cloudflare R2 + presigned URLs
- Metadados: nome, MIME, tamanho, storage key
- Soft delete: nao (hard delete remove do R2 tambem)

### 8.9 Chat e Mensageria

- **WhatsApp:** Baileys (primario) + Meta API (fallback)
- **Web chat:** preparado na arquitetura, nao implementado agora
- Conversas: BOT_ACTIVE -> WAITING_HUMAN -> HUMAN_ACTIVE -> CLOSED
- Mensagens: TEXT, IMAGE, AUDIO, VIDEO, DOCUMENT
- Status: PENDING, SENT, DELIVERED, READ, FAILED
- Sender types: CLIENT, AGENT, BOT, SYSTEM
- Lead capture a partir de conversa
- Atribuicao de atendente
- Contagem de nao-lidas
- AI bot (Claude Sonnet via Vercel AI SDK)
- **TTL mensagens: 730 dias. Midia movida para R2 apos 90 dias**

### 8.10 Auditoria

- Acoes: CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT, ACCESS_DOCUMENT, CHANGE_PERMISSION
- Before/after snapshots (JSON)
- IP + User-Agent
- **Retencao: 5 anos. Archive apos 12 meses (tabela particionada por ano)**

### 8.11 Notificacoes

- **In-app:** Socket.IO real-time + sino no dashboard
- **Email:** Resend + React Email para eventos criticos offline
  - Sinistro aberto
  - Comissao aprovada
  - Apolice vencendo (30 dias)
  - Convite para organizacao
- Read tracking

### 8.12 Dashboard

- Propostas por estagio (resumo numerico + link para Kanban)
- Apolices ativas vs vencendo em 30 dias
- Sinistros abertos por prioridade
- Comissoes pendentes vs pagas no mes
- Taxa de conversao proposta -> apolice
- Graficos de tendencia (ultimos 6 meses)

### 8.13 Configuracoes

- Gestao de usuarios e membros
- Configuracao de canais WhatsApp
- Configuracao de AI agent
- Organizacao (nome, logo, slug)

### 8.14 Dados de Referencia

- Insurer (seguradoras)
- InsuranceBranch (ramos de seguro)

---

## 9. DESIGN SYSTEM

### Tipografia

- **Fonte:** Inter (variable font)
- **Pesos:** 400 (body), 500 (labels), 600 (headings), 700 (emphasis)

### Paleta de Cores (oklch)

- **Primary:** `#1f4b5f` teal institucional (oklch scale)
- **Accent:** `#b98927` gold comercial (oklch scale)
- **Destructive:** `#b42318` red (acoes perigosas)
- **Muted:** grays neutros
- **Chart colors:** teal, green, gold, amber, red
- **Dark mode:** ativo desde o lancamento via next-themes + CSS variables

### Componentes

- **Base:** Radix UI (acessibilidade nativa)
- **Preset:** shadcn/ui (50+ componentes)
- **Variantes:** class-variance-authority (cva)
- **Icones:** lucide-react
- **Animacoes:** Framer Motion
- **Toasts:** Sonner

### Convencoes UI

- 4 estados obrigatorios em listagens: Empty, Loading, Error, Success
- Componentes max ~200 linhas
- Kebab-case: `client-form.tsx`, `use-clients.ts`
- Tables com opcoes de densidade (compact/normal/comfortable)
- Mobile-first responsive
- Sidebar colapsavel

### Frontend Architecture

```
features/<feature>/
  actions/       # Server Actions (next-safe-action)
  components/    # UI + forms
  hooks/         # Custom hooks
  lib/           # Business logic + utils
  types/         # Domain types + Zod schemas
  api/           # API client wrapper
```

---

## 10. BANCO DE DADOS

### PostgreSQL (ERP Domain)

**Auth:** User, Session, Account, Verification
**Multi-tenancy:** Organization, Member, Invitation
**ERP:** Client, Proposal, ProposalChecklistItem, Policy, Endorsement, Claim, Occurrence, Commission, Assistance, Document
**Referencia:** Insurer, InsuranceBranch
**Operacional:** Notification, AuditLog, AuditLogArchive (particionada)
**WhatsApp:** WhatsAppBrokerConfig, WhatsAppSession, WhatsAppConnectionLog

**Indices:** (organizationId, status), (organizationId, createdAt DESC), (organizationId, clientId)
**RLS:** `organization_id = app.current_tenant` em todas tabelas
**Soft delete:** `deletedAt` nullable em Client, Proposal, Policy, Commission, Claim

### MongoDB (Chat Domain)

**Collections:** Channel, Conversation, Message, Contact, User, AiAgent, LeadCapture, InsuranceProposalRequest, UnreadCount, BaileysAuthState

**TTL:** Message 730 dias
**Indice unico:** (tenantId, contactId, channelId) em Conversation
**Replica set obrigatorio** (transacoes Prisma/Mongoose)

### Redis

- BullMQ filas (ERP + chat)
- Socket.IO adapter (horizontal scaling)
- Cache de sessao
- Pub/sub (eventos real-time)

---

## 11. SEGURANCA

- TypeScript strict, zero `any`
- Zod em todas fronteiras (HTTP, env, APIs externas)
- Helmet (CSRF, XSS headers)
- Rate limiting (100 req/min global)
- CORS restrito
- Cookies httpOnly + secure
- Sem secrets hardcoded (env-based via t3-env)
- Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff
- Permissions-Policy restritiva
- RLS PostgreSQL (tenant isolation)
- Presigned URLs para documentos (expiracao temporal)

---

## 12. QUALIDADE

### Gates Obrigatorios (5)

1. `pnpm lint` - zero errors (ESLint flat config)
2. `pnpm typecheck` - zero errors (TypeScript strict)
3. `pnpm build` - build sucesso
4. `pnpm test` - todos testes passam
5. Acceptance criteria atendidos

### Testes

- **Unit:** Vitest - todos use cases (obrigatorio DDD Full: todas transicoes de state machine)
- **Integration:** Vitest + Docker test containers - repositorios contra banco real
- **E2E:** Playwright - 5 fluxos criticos (login, proposta->apolice, sinistro, comissao, chat)

### Convencoes

- Conventional Commits: feat:, fix:, refactor:, test:, docs:, chore:
- Husky + lint-staged (pre-commit)
- Kebab-case para arquivos
- Pino structured logging (nao console.log)
- Componentes max ~200 linhas

---

## 13. OBSERVABILIDADE

- **Sentry:** error tracking + performance (todas 5 apps)
- **Bull Board:** dashboard web para filas BullMQ
- **Pino:** structured logging (JSON, stdout)
- **Audit logs:** compliance trail em banco
- **Health check:** `/health` em server e chat-server

---

## 14. DECISOES REGISTRADAS

| #   | Decisao         | Escolha                                                          |
| --- | --------------- | ---------------------------------------------------------------- |
| 1   | Chat-server     | Separado do server ERP                                           |
| 2   | Monorepo        | 5 apps (web, server, worker, chat-server, chat-worker)           |
| 3   | MongoDB ORM     | Mongoose                                                         |
| 4   | Roles           | 5 (OWNER, ADMIN, MANAGER, COMMERCIAL, VIEWER)                    |
| 5   | WhatsApp        | Baileys primario + Meta API fallback                             |
| 6   | Web chat        | Preparado na arquitetura, nao implementado agora                 |
| 7   | Notificacoes    | In-app (Socket.IO) + email (Resend)                              |
| 8   | Tipografia      | Inter (variable font)                                            |
| 9   | Cores           | Teal #1f4b5f + Gold #b98927 em oklch                             |
| 10  | Dark mode       | Ativo desde o lancamento                                         |
| 11  | AI provider     | Multi-provider (Vercel AI SDK), Claude Sonnet primario           |
| 12  | Storage         | Cloudflare R2 + presigned URLs                                   |
| 13  | Hosting backend | Hostinger VPS (Docker)                                           |
| 14  | Monitoramento   | Sentry + Bull Board                                              |
| 15  | Soft delete     | Entidades criticas (Client, Proposal, Policy, Commission, Claim) |
| 16  | Audit logs      | 5 anos retencao, archive apos 12 meses                           |
| 17  | TTL mensagens   | 730 dias texto, midia para R2 apos 90 dias                       |
| 18  | Testes          | Unit + Integration + E2E seletivo (5 fluxos)                     |
| 19  | Email provider  | Resend + React Email                                             |
| 20  | Dashboard       | Operacional + financeiro essencial                               |
| 20b | Propostas       | Tabela + Kanban com toggle (drag-and-drop avanca stage)          |
