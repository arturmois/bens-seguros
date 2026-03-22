# Analise Consolidada - 3 MVPs: Bens Seguros

## Visao Geral dos MVPs

| Aspecto          | `bens` (MVP1)                   | `bens-seg` (MVP2)                             | `bens-seguros` (MVP3)          |
| ---------------- | ------------------------------- | --------------------------------------------- | ------------------------------ |
| **Maturidade**   | Mais maduro em DDD              | Mais documentado e refinado                   | Mais pratico (deployed)        |
| **Monorepo**     | pnpm + Turbo                    | pnpm + Turbo                                  | pnpm + Turbo                   |
| **Apps**         | web, server, worker, web-legacy | web, server, worker                           | web, chat-server               |
| **Core Package** | Sim (DDD completo)              | Sim (DDD hibrido Full+Light)                  | Nao (logica distribuida)       |
| **DI**           | tsyringe                        | tsyringe                                      | Manual (registry)              |
| **Roles**        | 3 (ADMIN, MANAGER, COMMERCIAL)  | 5 (OWNER, ADMIN, MANAGER, COMMERCIAL, VIEWER) | 3 (MANAGER, ADMIN, COMMERCIAL) |
| **AI**           | Vercel AI SDK + OpenAI          | Anthropic Claude                              | OpenAI (opcional)              |
| **Deploy**       | Docker Compose (local+prod)     | Docker VPS + Vercel                           | GitHub Actions + Hostinger VPS |
| **Fonts**        | Manrope + IBM Plex Sans         | Tailwind default                              | Geist + Geist Mono             |
| **Node.js**      | >= 22.18                        | >= 24 LTS                                     | >= 20                          |
| **CI/CD**        | Turbo scripts                   | Husky + lint-staged + 5 gates                 | GitHub Actions workflow        |

---

## 1. REQUISITOS FUNCIONAIS (Consolidados)

### 1.1 Gestao de Clientes

- CRUD completo (Individual / Empresa)
- Validacao CPF/CNPJ (unico por organizacao)
- Mascara de CPF/CNPJ, telefone, CEP
- Tipos: LEAD, CLIENT, FORMER_CLIENT
- Dados: nome, documento, telefone, email, endereco (JSON), estado civil, profissao, data nascimento
- Tags para classificacao
- Consentimento LGPD
- Soft delete
- **Melhor de cada MVP:** MVP1 tem lead-to-client promotion; MVP2 tem consent tracking; MVP3 tem estrutura mais simples

### 1.2 Propostas (Pipeline Kanban)

- **Estagios:** CAPTURE -> QUOTE -> PROTOCOL -> INSPECTION -> PAYMENT -> POLICY_ISSUED | LOST
- **Tipos de board:** NEW_INSURANCE, RENEWAL
- **Ramos:** AUTO, RESIDENTIAL, CONDOMINIUM, BUSINESS, LIFE, OTHER
- Premio e comissao em centavos (evita floating point)
- Checklist por estagio com tracking de conclusao
- Motivo de perda (lost reason)
- Vinculo com cliente e vendedor
- Renovacao via renewalPolicyId
- Documentos anexados por proposta
- **Melhor de cada MVP:** MVP2 tem state machine mais rigorosa; MVP3 tem Kanban DnD funcional

### 1.3 Apolices

- Emissao a partir de proposta aprovada (1:1 unique)
- Numero da apolice (unico)
- Cobertura (JSON flexivel)
- Status: ACTIVE, CANCELLED, EXPIRED
- Datas: inicio, fim, cancelamento
- Motivo de cancelamento
- Premio em centavos
- Vinculo com cliente, vendedor, proposta
- Suporte a renovacao (multi-life)

### 1.4 Sinistros (Claims)

- Abertura contra apolice
- **Status workflow:** REGISTERED -> IN_ANALYSIS -> AWAITING_DOCUMENT -> PENDING_INSPECTION -> APPROVED/REJECTED -> PAID -> COMPLETED
- Prioridade: NORMAL, HIGH, URGENT
- Descricao do incidente
- Ocorrencias (log de eventos por sinistro)
- Vinculo com seguradora (insurer)
- Atribuicao a agente
- Datas: reportedAt, resolvedAt, closedAt
- **Melhor de cada MVP:** MVP3 tem workflow mais completo com 7 status; MVP1 tem ocorrencias como sub-entidade

### 1.5 Comissoes

- **Workflow de aprovacao:** PENDING_COMMERCIAL -> PENDING_ADMIN -> APPROVED -> PAID
- Criacao automatica na emissao da apolice
- Calculo: premio x percentual (em basis points: 5000 = 50%)
- Split entre vendedores
- Suporte a estorno/reversal (cria comissao reversa vinculada)
- Aprovacao por COMMERCIAL e ADMIN
- Export CSV para relatorios
- **Melhor de cada MVP:** MVP2 tem workflow mais completo com REJECTED; MVP3 tem export CSV

### 1.6 Endossos (Endorsements)

- Modificacoes em apolices vigentes
- Snapshot historico (before/after em JSON)
- Data efetiva
- Tipos: alteracao de cobertura, ajuste de premio, etc.

### 1.7 Assistencias

- Solicitacao de servico (guincho, mecanico, chaveiro, etc.)
- **Status:** REQUESTED -> AWAITING_DOCUMENT -> PENDING_INSPECTION -> DISPATCHED -> IN_PROGRESS -> COMPLETED
- Localizacao (endereco + coordenadas)
- Vinculo com apolice e/ou sinistro
- Provedor de servico
- Datas: requestedAt, scheduledAt, completedAt
- **Melhor de cada MVP:** MVP3 tem localizacao com coordenadas; MVP2 tem provider management

### 1.8 Documentos

- Upload multi-entidade (proposta, apolice, sinistro, cliente)
- **Tipos:** DRIVER_LICENSE, VEHICLE_REGISTRATION, POLICY_PDF, CLAIM_PHOTO, etc.
- Metadados: nome, MIME type, tamanho, storage key
- Storage: Cloudflare R2 (S3-compatible) com presigned URLs
- **Melhor de cada MVP:** MVP1 tem R2/S3; MVP3 tem Vercel Blob como fallback

### 1.9 Chat e Mensageria (WhatsApp + Web)

- **Canais:** WhatsApp (Meta API + Baileys), Web
- **Conversas:** BOT -> QUEUE -> HUMAN -> CLOSED (state machine)
- **Mensagens:** TEXT, IMAGE, AUDIO, VIDEO, DOCUMENT
- **Status de mensagem:** PENDING, SENT, DELIVERED, READ, FAILED
- Sender types: CLIENT, AGENT, BOT, SYSTEM
- Lead capture a partir de conversa
- Atribuicao de atendente (handoff)
- Contagem de nao-lidas por agente
- AI bot para respostas iniciais
- Criacao de proposta a partir do chat
- **Melhor de cada MVP:** MVP3 tem implementacao mais madura com dual broker (Meta+Baileys); MVP1 tem Baileys direto; MVP2 tem AI com Claude

### 1.10 Auditoria

- **Acoes:** CREATE, UPDATE, DELETE, LOGIN, LOGOUT, APPROVE, REJECT, ACCESS_DOCUMENT, CHANGE_PERMISSION
- Captura before/after (snapshots JSON)
- IP address + User-Agent
- Indexado por organizacao, tipo de entidade, timestamp
- Compliance trail completo

### 1.11 Notificacoes

- In-app real-time via Socket.IO
- Targeting por usuario
- Read tracking
- Tipos configurados por evento

### 1.12 Dashboard

- Metricas e widgets
- Presenca de usuarios (AVAILABLE, AWAY, IN_MEETING)
- Estatisticas por modulo

### 1.13 Configuracoes

- Gestao de usuarios e membros
- Configuracao de canais WhatsApp
- Configuracao de AI agent
- Configuracao de organizacao

---

## 2. REQUISITOS NAO FUNCIONAIS (Consolidados)

### 2.1 Arquitetura

| Decisao      | Recomendacao                                        | Origem     |
| ------------ | --------------------------------------------------- | ---------- |
| **Monorepo** | pnpm + Turborepo                                    | Todos      |
| **Backend**  | Fastify 5 + TypeScript strict                       | Todos      |
| **Frontend** | Next.js 16 + React 19 (App Router)                  | Todos      |
| **Worker**   | BullMQ + Redis                                      | MVP1, MVP2 |
| **DDD**      | Hibrido (Full para state machines, Light para CRUD) | MVP2       |
| **DI**       | tsyringe (decorator-based)                          | MVP1, MVP2 |
| **API Docs** | Swagger + Scalar (auto-gen via Zod)                 | MVP1, MVP2 |
| **Code Gen** | Orval (OpenAPI -> React Query hooks)                | MVP1, MVP2 |

### 2.2 Multi-Tenancy

- **PostgreSQL RLS:** `SET app.current_tenant` por transacao
- `createTenantClient(organizationId)` via Prisma extension
- **MongoDB:** campo `tenantId` explicito em todos documentos
- **Middleware:** TenantMiddleware extrai organizacao da sessao
- **Regra:** toda query inclui `organizationId`; nunca confiar em tenant do client-side

### 2.3 Autenticacao e Autorizacao

- **Auth:** Better Auth 1.0 (email/password, OAuth-ready)
- **Sessao:** 7 dias expiry, 1 dia auto-refresh, cookie httpOnly + secure
- **RBAC:** CASL (ability-based) com 5 roles
- **Roles (MVP2 mais completo):**
  - OWNER: acesso total (`manage all`)
  - ADMIN: gestao de recursos exceto Organization
  - MANAGER: acesso operacional completo
  - COMMERCIAL: limitado a proprios proposals/clients
  - VIEWER: somente leitura
- **40+ permissoes granulares** (client:create, proposal:approve, commission:approve:admin, etc.)
- **Middleware chain:** authMiddleware -> requireAuth -> tenantMiddleware -> requireAbility
- **Frontend:** ProtectedRoute + hasPermission/hasAnyPermission/hasAllPermissions

### 2.4 Seguranca

- Helmet para HTTP headers (CSRF, XSS protection)
- Rate limiting (100 req/min global)
- CORS restrito a origens confiadas
- Session cookies httpOnly + secure
- Sem secrets hardcoded (env-based)
- Security headers: X-Frame-Options DENY, X-Content-Type-Options nosniff
- Permissions-Policy restritiva
- **Validacao:** Zod em todas as fronteiras (HTTP, env, APIs externas)

### 2.5 Performance

- Database: indices em (organizationId, status), (organizationId, createdAt DESC)
- Frontend: code splitting, lazy loading, React Compiler (MVP3), Suspense streaming
- Redis: cache, sessao, pub/sub, BullMQ
- Paginacao: cursor-based (nao offset)
- Socket.IO: Redis adapter para horizontal scaling
- Turbo caching para builds

### 2.6 Qualidade de Codigo

- **TypeScript strict mode** - zero `any` (MVP2)
- **Zod** em todas as fronteiras
- **Pino** para logging estruturado (nao console.log)
- **Conventional Commits:** feat:, fix:, refactor:, test:, docs:, chore:
- **Husky + lint-staged** pre-commit hooks
- **5 gates obrigatorios:** lint, typecheck, build, test, acceptance criteria (MVP2)
- **Kebab-case** para arquivos: `client-form.tsx`, `use-clients.ts`
- **Componentes max ~200 linhas:** extrair sub-componentes

### 2.7 Testes

- **Framework:** Vitest + React Testing Library
- **Unit tests:** use cases com repositorios mockados
- **DDD Full:** cobertura obrigatoria para TODAS transicoes de state machine
- **DDD Light:** cobertura para validacao + happy path
- **E2E:** Playwright (MVP3)
- **4 estados UI obrigatorios:** Empty, Loading, Error, Success

### 2.8 Observabilidade

- **Error tracking:** Sentry (MVP1, MVP2)
- **Logging:** Pino structured (backend)
- **Audit logs:** em database (compliance)
- **Health check:** endpoint `/health`

### 2.9 Deploy e Infraestrutura

- **Docker** multi-stage builds
- **Docker Compose** para dev local (PostgreSQL, MongoDB, Redis)
- **CI/CD:** GitHub Actions (MVP3 mais maduro)
- **Frontend:** Vercel (Next.js optimized)
- **Backend:** VPS Docker (Hostinger ou similar)
- **Storage:** Cloudflare R2 (S3-compatible)

### 2.10 Bancos de Dados

- **PostgreSQL 18:** dados relacionais multi-tenant com RLS
- **MongoDB 8:** dominio de chat/mensageria (replica set obrigatorio)
- **Redis 8:** cache, filas, pub/sub, Socket.IO adapter

---

## 3. DESIGN SYSTEM (Melhor de Cada MVP)

### 3.1 Componentes UI

- **Base:** Radix UI primitives (acessibilidade nativa)
- **Preset:** shadcn/ui (50+ componentes pre-integrados)
- **Variantes:** class-variance-authority (cva)
- **Icones:** lucide-react (562+ icones)
- **Animacoes:** Framer Motion
- **Drag & Drop:** @dnd-kit (Kanban)
- **Toasts:** Sonner
- **Temas:** next-themes (light/dark)

### 3.2 Tipografia (Melhor: MVP1)

- **Heading:** Manrope (Google Fonts)
- **Body:** IBM Plex Sans (400/500/600)
- **Mono:** IBM Plex Mono (para dados/codigo)
- _Alternativa MVP3: Geist + Geist Mono (mais moderno)_

### 3.3 Cores (Melhor: MVP1 - mais institucional)

- **Primary:** `#1f4b5f` (teal institucional)
- **Accent:** `#b98927` (gold para highlights comerciais)
- **Destructive:** `#b42318` (red para acoes perigosas)
- **Chart colors:** brand palette (teal, green, gold, amber, red)
- _Alternativa MVP3: oklch color space (mais moderno, melhor contraste)_

### 3.4 Layout

- Sidebar colapsavel (mobile-first)
- Page Header padronizado
- Tables com opcoes de densidade (compact/normal/comfortable)
- Skeletons para loading states
- Sheet para navegacao mobile

### 3.5 Formularios

- React Hook Form + Zod
- Componentes integrados com shadcn/ui Form
- Validacao visual (error states)
- Combobox para selecoes complexas

---

## 4. PADROES DE ARQUITETURA RECOMENDADOS

### 4.1 Backend - Do MVP2 (Hibrido DDD)

#### DDD Full (Modulos com state machine complexa)

```
modules/<Module>/
  domain/
    <Entity>.ts          # Private constructor + create()/restore()
    <Module>Repository.ts # Interface (port)
    <Module>Errors.ts    # Domain errors
    events/              # Domain events
  application/
    <UseCase>.ts         # @injectable() com execute(dto, ctx)
    <UseCase>.spec.ts    # Testes unitarios
    dtos/
  infrastructure/
    Prisma<Module>Repository.ts
    <Module>Mapper.ts    # Domain <-> Persistence
```

**Modulos Full:** Proposal, Commission, Conversation (Chat)

#### DDD Light (CRUD com validacao)

```
modules/<Module>/
  types/schemas.ts       # Zod schemas
  application/
    <UseCase>.ts         # Logica simplificada
  infrastructure/
    Prisma<Module>Repository.ts
```

**Modulos Light:** Client, Policy, Claim, Endorsement, Assistance, Document, Occurrence

### 4.2 Frontend - Do MVP2/MVP3

#### Feature-Based Architecture

```
features/<feature>/
  actions/       # Server Actions (next-safe-action)
  components/    # UI + forms
  hooks/         # Custom hooks
  lib/           # Business logic + utils
  types/         # Domain types + Zod schemas
  api/           # API client wrapper
```

### 4.3 Padroes Transversais

- **Presenter Pattern:** entity -> HTTP DTO (MVP1)
- **Mapper Pattern:** domain <-> persistence (MVP1, MVP2)
- **Repository Interface:** domain define contrato, infra implementa (todos)
- **Event-Driven:** domain events + Redis pub/sub (todos)
- **Broker Pattern:** multi-channel messaging extensivel (MVP3)
- **Tenant Isolation:** RLS + middleware (MVP1, MVP2)
- **Error Standardization:** classes customizadas com .code e .message (todos)
- **Zod-First API:** schemas definem request/response, Swagger auto-gerado (MVP1, MVP2)

### 4.4 Response Pattern (padrao de todos MVPs)

```json
// Sucesso
{ "success": true, "data": {}, "meta": { "total": 10, "nextCursor": "..." } }

// Erro
{ "success": false, "error": { "code": "CONFLICT", "message": "..." } }
```

---

## 5. STACK TECNICA FINAL RECOMENDADA

| Camada              | Tecnologia                                        | Justificativa                           |
| ------------------- | ------------------------------------------------- | --------------------------------------- |
| **Runtime**         | Node.js 22 LTS                                    | Estavel, LTS, compativel com todos MVPs |
| **Linguagem**       | TypeScript 5.9 strict                             | Todos usam, zero `any` do MVP2          |
| **Monorepo**        | pnpm 9 + Turbo                                    | Consenso entre MVPs                     |
| **Frontend**        | Next.js 16 + React 19                             | Todos usam                              |
| **Backend**         | Fastify 5                                         | Todos usam                              |
| **Worker**          | BullMQ 5 + Redis                                  | MVP1, MVP2                              |
| **ORM**             | Prisma 7 (PostgreSQL) + Mongoose/Prisma (MongoDB) | Maturidade                              |
| **Auth**            | Better Auth 1.0                                   | Todos usam                              |
| **RBAC**            | CASL                                              | MVP1, MVP2 (mais robusto)               |
| **DI**              | tsyringe                                          | MVP1, MVP2 (mais maduro que manual)     |
| **Validacao**       | Zod                                               | Todos usam                              |
| **UI**              | shadcn/ui + Radix UI + Tailwind CSS 4             | Todos usam                              |
| **Forms**           | React Hook Form + Zod                             | Todos usam                              |
| **Data Fetching**   | TanStack React Query + Orval                      | MVP1, MVP2                              |
| **Tables**          | TanStack React Table                              | Todos usam                              |
| **Real-time**       | Socket.IO 4 + Redis adapter                       | Todos usam                              |
| **AI**              | Anthropic Claude (Vercel AI SDK)                  | MVP2 mais moderno                       |
| **Storage**         | Cloudflare R2 (S3-compatible)                     | MVP1                                    |
| **Monitoring**      | Sentry                                            | MVP1, MVP2                              |
| **CI/CD**           | GitHub Actions + Docker                           | MVP3                                    |
| **Deploy Frontend** | Vercel                                            | MVP2, MVP3                              |
| **Deploy Backend**  | Docker VPS                                        | Todos                                   |
| **Testes**          | Vitest + RTL + Playwright                         | Combinacao dos 3                        |

---

## 6. SCHEMA DE BANCO CONSOLIDADO

### PostgreSQL (Entidades Core)

1. **Auth:** User, Session, Account, Verification
2. **Multi-tenancy:** Organization, Member, Invitation
3. **ERP:** Client, Proposal, ProposalChecklistItem, Policy, Endorsement, Claim, Occurrence, Commission, Assistance, Document
4. **Referencia:** Insurer, InsuranceBranch (MVP2)
5. **Operacional:** Notification, AuditLog
6. **WhatsApp:** WhatsAppBrokerConfig, WhatsAppSession, WhatsAppConnectionLog (MVP3)

### MongoDB (Chat Domain)

1. Channel, Conversation, Message, Contact
2. User (attendant), AiAgent
3. LeadCapture, InsuranceProposalRequest
4. UnreadCount, BaileysAuthState

---

## 7. GAPS E AMBIGUIDADES IDENTIFICADAS

### Arquitetura

- G1: Chat-server separado (MVP3) vs integrado no server (MVP1/MVP2)?
- G2: MongoDB via Mongoose (MVP1) vs Prisma MongoDB (MVP3)?
- G3: DI manual (MVP3) vs tsyringe (MVP1/MVP2)?
- G4: Quantos apps no monorepo final? (web + server + worker? ou mais?)

### Funcional

- G5: 3 roles (MVP1/MVP3) vs 5 roles (MVP2)? OWNER e VIEWER sao necessarios?
- G6: AI provider: OpenAI (MVP1), Claude (MVP2), ou multi-provider?
- G7: WhatsApp: apenas Meta API oficial, apenas Baileys, ou dual-broker?
- G8: Web chat (canal web) esta no escopo de producao?
- G9: Dashboard: quais metricas especificas sao necessarias?
- G10: Notificacoes: apenas in-app ou tambem email/push?
- G11: Relatorios: alem do CSV de comissoes, quais outros?

### Design System

- G12: Fonte: Manrope+IBM Plex (MVP1) ou Geist (MVP3)?
- G13: Cores: paleta teal+gold (MVP1) ou oklch moderno (MVP3)?
- G14: Dark mode e obrigatorio para producao?

### Infraestrutura

- G15: Deploy: Hostinger VPS ou outro provider?
- G16: CI/CD: GitHub Actions e suficiente?
- G17: Monitoramento: Sentry e suficiente ou precisa de mais (Grafana, etc.)?

### Dados

- G18: Soft delete em todas entidades ou apenas clientes?
- G19: Retencao de audit logs: quanto tempo?
- G20: TTL de mensagens no MongoDB: 365 dias (MVP3) esta adequado?
