# Bens Seguros - Architecture Decisions (Gaps Resolvidos)

> Decisoes tecnicas que fecham ambiguidades identificadas na analise de gaps.

---

## GAP-1: Orval Codegen Pipeline

**Decisao:** Orval com spec versionada.

### Pipeline

```
1. Server build:  fastify-swagger gera OpenAPI spec
2. Export:        spec salva em packages/shared/api-spec.json (commitada)
3. Orval:         le spec, gera hooks em apps/web/src/api/generated/
4. CI:            valida que spec esta sincronizada com server
```

### Configuracao (`apps/web/orval.config.ts`)

```ts
export default {
  'bens-api': {
    input: {
      target: '../../packages/shared/api-spec.json',
    },
    output: {
      target: './src/api/generated/',
      client: 'react-query',
      mode: 'tags-split', // 1 arquivo por tag (clients, proposals, etc.)
      override: {
        mutator: {
          path: './src/api/custom-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
}
```

### Custom Instance (`apps/web/src/api/custom-instance.ts`)

```ts
// Fetch configurado com base URL, credentials, error interceptor
// Traduz HTTP errors para tipos tipados
// Reutilizado por todos hooks gerados
```

### Scripts

```json
{
  "api:export": "cd apps/server && pnpm build && node scripts/export-spec.js",
  "api:generate": "cd apps/web && pnpm orval",
  "api:sync": "pnpm api:export && pnpm api:generate"
}
```

### Regras

- Frontend desenvolve em paralelo usando spec como contrato
- Spec commitada no repo (`packages/shared/api-spec.json`)
- CI roda `api:export` e verifica diff - se spec mudou sem commit, falha
- Hooks gerados nunca editados manualmente (gitignore ou regenera no build)

---

## GAP-2: Migrations Strategy (Producao)

**Decisao:** Prisma migrate com backward-compatible migrations.

### Ambientes

| Ambiente | Comando                 | Quando                                     |
| -------- | ----------------------- | ------------------------------------------ |
| **Dev**  | `prisma migrate dev`    | Ao alterar schema.prisma                   |
| **CI**   | `prisma migrate deploy` | No pipeline, antes de deploy               |
| **Prod** | `prisma migrate deploy` | Via SSH no GitHub Action, antes de restart |

### Regras de Migration

- Toda migration deve ser **backward-compatible** (app antiga funciona com schema novo)
- **Adicionar coluna:** sempre nullable ou com default
- **Renomear coluna:** criar nova, migrar dados, remover antiga em migration separada (2 deploys)
- **Remover coluna:** primeiro deploy remove uso no codigo, segundo deploy remove coluna
- **Novo enum value:** adicionar e seguro, remover nao

### Rollback

- Rollback = deploy da versao anterior da app
- Schema novo e compativel com app antiga (migrations aditivas)
- Nunca rodar `prisma migrate reset` em producao

### Deploy Order (GitHub Action)

```
1. prisma migrate deploy  (atualiza schema)
2. docker pull + restart   (atualiza app)
3. health check           (verifica)
4. rollback se falhar     (deploy versao anterior)
```

### Diretorio

```
packages/db/prisma/
  migrations/
    20260320_init/
    20260321_add_clients/
    ...
  schema.prisma
  seed.ts
```

---

## GAP-3: i18n / Localizacao

**Decisao:** Hardcoded pt-BR com constantes centralizadas.

### Textos e Labels

- Direto no codigo em portugues brasileiro
- Sem lib de i18n (zero overhead)
- Produto 100% brasileiro, sem plano de internacionalizacao

### Mensagens de Erro e Validacao

```
features/<module>/lib/messages.ts
```

```ts
// features/clients/lib/messages.ts
export const CLIENT_MESSAGES = {
  created: 'Cliente cadastrado com sucesso',
  updated: 'Cliente atualizado',
  deleted: 'Cliente removido',
  notFound: 'Cliente nao encontrado',
  duplicateDocument: 'Ja existe um cliente com este documento',
  invalidCpf: 'CPF invalido',
  invalidCnpj: 'CNPJ invalido',
} as const
```

### Formatacao (centralizada em `lib/formatters.ts`)

```ts
export const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100
  )

export const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date)

export const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(date)

export const formatPhone = (phone: string) => {
  /* mascara */
}
export const formatCpf = (cpf: string) => {
  /* mascara */
}
export const formatCnpj = (cnpj: string) => {
  /* mascara */
}
```

### Regras

- Nunca `toLocaleDateString()` sem locale explicito
- Sempre usar formatters centralizados
- Se precisar de i18n no futuro: extrair constantes para JSON

---

## GAP-4: Timezone

**Decisao:** UTC no banco, Sao Paulo fixo na exibicao.

### Camadas

| Camada               | Timezone                 | Motivo                                    |
| -------------------- | ------------------------ | ----------------------------------------- |
| **PostgreSQL**       | UTC                      | Prisma `DateTime` armazena UTC por padrao |
| **MongoDB**          | UTC                      | `Date` em JavaScript e UTC                |
| **Server (Fastify)** | UTC                      | Processar em UTC, sem conversao           |
| **Worker (BullMQ)**  | UTC                      | Cron jobs em UTC                          |
| **Frontend**         | `America/Sao_Paulo` fixo | Exibicao para usuarios brasileiros        |

### Regras

- Banco: nunca armazenar com timezone (`timestamptz` nao necessario, Prisma usa UTC)
- Server: `new Date()` retorna UTC, nunca converter no backend
- Frontend: usar `formatDate()` / `formatDateTime()` centralizados (sempre com `timeZone: 'America/Sao_Paulo'`)
- Nunca `new Date().toLocaleDateString()` (depende do browser do usuario)
- "Dias no estagio": calculo em UTC (diferenca de dias inteiros, timezone nao afeta)

### Cron Jobs (BullMQ)

```ts
// Policy expiry check - roda 3am UTC (meia-noite em SP)
{
  pattern: '0 3 * * *'
}
// Audit archive - roda 1o do mes 4am UTC
{
  pattern: '0 4 1 * *'
}
```

---

## GAP-5: Seed Data

**Decisao:** Seed em 3 camadas via `prisma db seed`.

### Arquivo: `packages/db/prisma/seed.ts`

### Camada 1: Referencia (sempre, idempotente)

```ts
// Roda em todos ambientes (dev, staging, prod)
// Usa upsert para nao duplicar
await prisma.insurer.upsert({ where: { name: 'Porto Seguro' }, ... })
await prisma.insurer.upsert({ where: { name: 'Bradesco Seguros' }, ... })
await prisma.insurer.upsert({ where: { name: 'SulAmerica' }, ... })
// InsuranceBranch populado via enum (AUTO, RESIDENTIAL, etc.)
```

### Camada 2: Bootstrap (1x, idempotente)

```ts
// Cria Organization default + User OWNER
// Le ADMIN_EMAIL e ADMIN_PASSWORD do .env
const org = await prisma.organization.upsert({
  where: { slug: 'default' },
  create: { name: 'Minha Corretora', slug: 'default' },
  update: {},
})
// Cria usuario OWNER com Better Auth
```

### Camada 3: Dev-only (flag `--dev`)

```ts
// Gera dados fake para desenvolvimento visual
// 50 clients (mix LEAD, CLIENT, FORMER_CLIENT)
// 30 proposals em varios estagios
// 10 policies ativas
// 5 claims abertos
// 15 commissions em varios status
// Usa @faker-js/faker
```

### Scripts

```json
{
  "db:seed": "prisma db seed",
  "db:seed:dev": "prisma db seed -- --dev"
}
```

### package.json (prisma config)

```json
{
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  }
}
```

### Regras

- Tudo idempotente (upsert, nao insert)
- CI roda camada 1+2 no deploy
- Dev roda 1+2+3 no setup local
- Faker apenas em devDependencies

---

## GAP-6: Error Boundary (Frontend)

**Decisao:** 3 niveis de error boundary.

### Nivel 1: `global-error.tsx` (root)

```
app/global-error.tsx
```

- Captura erros fatais (layout quebrou, JS crash)
- Pagina fullscreen: "Algo deu errado" + botao "Recarregar pagina"
- Reporta ao Sentry com contexto (user, org, route)
- Nao mostra stack trace em producao

### Nivel 2: `error.tsx` por route group

```
app/(dashboard)/error.tsx    # Erros em qualquer pagina do ERP
app/(auth)/error.tsx         # Erros em login/register
```

- `(dashboard)/error.tsx`: mantem sidebar + header visiveis, mostra area de conteudo com erro + botao retry
- `(auth)/error.tsx`: mostra card de erro + link para tentar novamente

### Nivel 3: Error boundary inline em componentes criticos

```tsx
// Erro em 1 tab nao derruba as outras
<Tabs>
  <TabContent value="proposals">
    <ErrorBoundary
      fallback={
        <ErrorCard message="Erro ao carregar propostas" onRetry={retry} />
      }
    >
      <Suspense fallback={<TableSkeleton />}>
        <ProposalsTab />
      </Suspense>
    </ErrorBoundary>
  </TabContent>
  <TabContent value="policies">
    <ErrorBoundary
      fallback={
        <ErrorCard message="Erro ao carregar apolices" onRetry={retry} />
      }
    >
      <Suspense fallback={<TableSkeleton />}>
        <PoliciesTab />
      </Suspense>
    </ErrorBoundary>
  </TabContent>
</Tabs>
```

### Componente Reutilizavel

```
components/error-card.tsx     # Card de erro com mensagem + retry
components/error-boundary.tsx # Class component wrapper (React Error Boundary)
```

### Sentry Integration

```tsx
// global-error.tsx
'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        {/* fullscreen error page */}
        <button onClick={reset}>Recarregar</button>
      </body>
    </html>
  )
}
```

### Regras

- Nivel 1 captura tudo que escapa dos niveis 2 e 3
- Nivel 2 preserva layout (sidebar, header)
- Nivel 3 isola falha por componente (tab, card, widget)
- Sentry recebe: error, user.id, organizationId, pathname
- Dev mostra stack trace, prod mostra mensagem amigavel
- Botao retry usa `reset()` do Next.js (re-renderiza o segment)

---

## Resumo de Todas as Decisoes

| #       | Gap                 | Decisao                                                                                                                                                                                                            |
| ------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GAP-1   | Orval codegen       | Spec versionada commitada + Orval gera hooks + CI valida sync                                                                                                                                                      |
| GAP-2   | Migrations          | `prisma migrate` backward-compatible, deploy antes de restart                                                                                                                                                      |
| GAP-3   | i18n                | Hardcoded pt-BR, constantes por modulo, `Intl` formatters centralizados                                                                                                                                            |
| GAP-4   | Timezone            | UTC no banco, `America/Sao_Paulo` fixo na exibicao, formatters centralizados                                                                                                                                       |
| GAP-5   | Seed data           | 3 camadas (referencia + bootstrap + dev-fake), tudo idempotente                                                                                                                                                    |
| GAP-6   | Error boundary      | 3 niveis (global + route group + inline), Sentry integrado                                                                                                                                                         |
| GAP-7   | Build & Docker      | Internal Packages (TS cru) + tsup bundle para backend + transpilePackages para Next.js                                                                                                                             |
| AUTH-1  | Onboarding          | Self-service com setup wizard 2 steps (User + Organization)                                                                                                                                                        |
| AUTH-2  | Invitations         | Email com link tokenizado (7 dias) + fallback copiar link                                                                                                                                                          |
| AUTH-3  | Org switching       | Dropdown sidebar + tela `/select-org` se 2+ orgs + clear cache ao trocar                                                                                                                                           |
| AUTH-4  | Password reset      | Email com link tokenizado (1h) + revoga todas sessoes + mensagem generica                                                                                                                                          |
| AUTH-5  | Sessions            | Multi-device (max 5), lista em Settings, encerrar individual/todas, revoga ao trocar senha                                                                                                                         |
| AUTH-6  | OWNER transfer      | Transfer para ADMIN elegivel, confirmacao por digitacao, antigo OWNER vira ADMIN                                                                                                                                   |
| AUTH-7  | Permissao granular  | COMMERCIAL ve apenas seus (salespersonId), MANAGER+ ve tudo da org                                                                                                                                                 |
| AUTH-8  | Rate limit auth     | Camadas: 5 login/email/15min, 3 forgot/email/1h, 3 register/IP/1h, 100 api/user/min                                                                                                                                |
| BILLING | Billing/monetizacao | Adiado. Campo `plan: 'FREE'` na Organization como seed. Sem Stripe, sem limites, sem tela de billing. Implementar quando tiver 2+ clientes                                                                         |
| MOD-1   | Arquitetura modular | **Aprovada (revisada), migração em andamento.** Monolito modular em `packages/core/src/modules` + `platform` + `shared-kernel`, import direto do `index.ts` do provider, Prisma restrito por módulo, sem event bus |

---

## AUTH-1: Onboarding Flow

**Decisao:** Self-service com setup wizard 2 steps.

### Fluxo

```
/register
  Step 1: nome, email, senha → cria User (Better Auth signUp)
  Step 2: nome da corretora, CNPJ → cria Organization + Member(OWNER)
  → redireciona para /dashboard
```

### Regras

- Step 1 cria User via Better Auth `signUp.email`
- Step 2 cria Organization + Member(OWNER) via API
- CNPJ validado (formato + digitos verificadores)
- Se Step 1 ok mas Step 2 falhar: usuario existe mas sem org, proximo login redireciona para Step 2
- Seed popula seguradoras default na org recem-criada
- Futuro: adicionar trial period, planos de assinatura

---

## AUTH-2: Invitation Flow

**Decisao:** Email com link tokenizado + fallback copiar link.

### Fluxo

```
OWNER/ADMIN → Settings > Membros > "Convidar"
  → preenche email + role
  → cria Invitation (token, expiresAt: 7 dias)
  → envia email via Resend com link /invite/[token]

Convidado clica link:
  → se tem conta: aceita convite, cria Member, entra na org
  → se nao tem: cria conta (Step 1) + aceita convite
```

### Fallback

- Se email nao chega: OWNER pode copiar link na listagem de convites pendentes
- Convites expirados: botao "Reenviar" na listagem

### Regras

- Invitation.status: `pending` → `accepted` | `expired`
- Max 20 convites por org por hora (rate limit AUTH-8)
- Nao pode convidar email ja membro da org (409 Conflict)
- Nao pode convidar com role superior ao seu (ADMIN nao convida OWNER)

---

## AUTH-3: Org Switching

**Decisao:** Dropdown no sidebar + tela intermediaria.

### Componente

```
Sidebar (topo):
  ┌──────────────────────────┐
  │  🏢 Minha Corretora  ▾  │  ← dropdown se 2+ orgs
  │     Plano: Free          │
  └──────────────────────────┘
```

### Fluxo ao trocar org

1. Atualiza `session.activeOrganizationId` via Better Auth `organization.setActive`
2. `queryClient.clear()` (limpa todo cache React Query)
3. Reset Zustand stores (nao carregar dados da org anterior)
4. Redireciona para `/dashboard`

### Fluxo apos login

- 1 org → entra direto no dashboard
- 2+ orgs → redireciona para `/select-org` (cards com nome + logo + role)
- 0 orgs (convidado sem org) → redireciona para `/no-organization` com mensagem

### Regras

- Trocar org DEVE limpar todo state (seguranca)
- Se usuario com 1 org: dropdown nao aparece (apenas nome da org)
- `activeOrganizationId` armazenado na Session (server-side, nao localStorage)

---

## AUTH-4: Password Reset

**Decisao:** Email com link tokenizado + revoga sessoes.

### Fluxo

```
/forgot-password
  → digita email
  → cria Verification (token, expiresAt: 1h)
  → envia email via Resend com link /reset-password/[token]
  → mensagem: "Se o email existir, enviamos um link"

/reset-password/[token]
  → valida token (existe + nao expirou)
  → form: nova senha (min 8 chars) + confirmar senha
  → ao salvar: atualiza senha + deleta TODAS sessoes do usuario
  → redireciona para /login com toast "Senha alterada"
```

### Regras

- Mensagem generica (nao revela se email existe no sistema)
- Token expira em 1 hora (unico uso)
- Apos reset: todas sessoes revogadas (forca re-login em todos devices)
- Max 3 requests por email em 1h (rate limit AUTH-8)
- Better Auth plugin `forgetPassword` implementa a maior parte

---

## AUTH-5: Session Management

**Decisao:** Multi-device com visibilidade e controle.

### Tela Settings > Seguranca > Sessoes Ativas

```
┌──────────────────────────────────────────────────────────┐
│  Chrome · Windows · 189.45.xx.xx                        │
│  Ultimo acesso: hoje, 14:30         [Esta sessao]       │
├──────────────────────────────────────────────────────────┤
│  Safari · iPhone · 200.12.xx.xx                         │
│  Ultimo acesso: ontem, 09:15        [Encerrar]          │
├──────────────────────────────────────────────────────────┤
│  Firefox · Linux · 177.88.xx.xx                         │
│  Ultimo acesso: 3 dias atras        [Encerrar]          │
└──────────────────────────────────────────────────────────┘
              [Encerrar todas exceto esta]
```

### Regras

- Max 5 sessoes simultaneas por usuario
- Se criar 6a sessao: sessao mais antiga revogada automaticamente
- Sessao expira em 7 dias, refresh diario (ja definido)
- Apos troca de senha: revoga TODAS sessoes
- Exibe: browser (parse userAgent), IP (mascarado parcial), ultimo acesso
- Botao "Encerrar" individual + "Encerrar todas exceto esta"
- IP armazenado no Session (Prisma schema ja tem `ipAddress`)

---

## AUTH-6: OWNER Transfer

**Decisao:** Transfer para ADMIN com confirmacao forte.

### Fluxo

```
Settings > Organizacao > "Transferir propriedade"
  → lista membros ADMIN elegiveis
  → seleciona novo OWNER
  → Dialog: "Digite o nome da organizacao para confirmar"
  → digita nome exato → botao "Transferir" ativa
  → ao confirmar:
    - membro selecionado: role → OWNER
    - antigo OWNER: role → ADMIN
    - email notifica ambos
```

### Regras

- Apenas OWNER pode transferir
- Apenas membros ADMIN sao elegiveis (COMMERCIAL/VIEWER nao)
- Antigo OWNER vira ADMIN (nao perde acesso)
- 1 OWNER por org (invariante no banco: unique constraint)
- OWNER nao pode sair da org sem transferir antes
- OWNER nao pode ser removido por ninguem (nem por si mesmo, deve transferir)

---

## AUTH-7: Permissao Granular (Ownership)

**Decisao:** COMMERCIAL filtrado por `salespersonId`, demais veem tudo da org.

### Matriz de Visibilidade

| Entidade   | COMMERCIAL                    | MANAGER | ADMIN | OWNER |
| ---------- | ----------------------------- | ------- | ----- | ----- |
| Client     | Todos da org (read)           | Todos   | Todos | Todos |
| Proposal   | Apenas seus (`salespersonId`) | Todos   | Todos | Todos |
| Policy     | Todos (read-only)             | Todos   | Todos | Todos |
| Commission | Apenas suas (`salespersonId`) | Todas   | Todas | Todas |
| Claim      | Todos (read-only)             | Todos   | Todos | Todos |
| Document   | Vinculados aos seus proposals | Todos   | Todos | Todos |

### Implementacao CASL

```ts
case 'COMMERCIAL':
  can(['create', 'read', 'update'], 'Proposal', { salespersonId: userId })
  can('read', 'Commission', { salespersonId: userId })
  can('read', ['Client', 'Policy', 'Claim'])
  break
```

### Implementacao Repository (Backend)

```ts
// Se role COMMERCIAL, adiciona filtro automatico
const where = {
  organizationId,
  ...(role === 'COMMERCIAL' && { salespersonId: userId }),
}
```

### Implementacao Frontend

- Tabelas: API ja retorna filtrado (backend filtra)
- Botoes de acao: `hasPermission` + verificar ownership se COMMERCIAL
- COMMERCIAL nao ve botao "Editar" em proposta de outro vendedor

---

## AUTH-8: Rate Limit por Auth

**Decisao:** Rate limit em camadas com keyGenerator customizado.

### Configuracao

| Endpoint                         | Limite        | Janela | Key            |
| -------------------------------- | ------------- | ------ | -------------- |
| `POST /api/auth/sign-in`         | 5 tentativas  | 15 min | email          |
| `POST /api/auth/sign-in`         | 20 tentativas | 15 min | IP             |
| `POST /api/auth/forgot-password` | 3 requests    | 1 hora | email          |
| `POST /api/auth/sign-up`         | 3 contas      | 1 hora | IP             |
| Invitations (por org)            | 20 convites   | 1 hora | organizationId |
| API geral                        | 100 requests  | 1 min  | userId + orgId |

### Implementacao

```ts
// Auth routes - rate limit especifico
app.register(rateLimit, {
  max: 5,
  timeWindow: '15 minutes',
  keyGenerator: (request) => {
    const body = request.body as { email?: string }
    return `login:${body?.email ?? request.ip}`
  },
  hook: 'preHandler',
})

// API routes - rate limit geral
app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (request) =>
    `api:${request.user?.id}:${request.organizationId}`,
})
```

### Resposta 429

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Muitas tentativas. Tente novamente em 15 minutos."
  }
}
```

Header: `Retry-After: 900`

## GAP-7: Monorepo Build Strategy para Docker

**Problema:** Packages exportam TypeScript cru (`./src/index.ts`). Em dev funciona (tsx resolve). Em Docker, `node dist/server.js` nao importa `.ts`. Alem disso, pnpm usa symlinks que Docker COPY nao segue.

**Decisao:** Internal Packages (padrao Turbo) + tsup para apps backend.

### Estrategia por Camada

| Camada                                      | Build Strategy                                       | Motivo                                                   |
| ------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| **Packages** (`@repo/*`)                    | Sem build. Exportam TS cru (`./src/index.ts`)        | DX em dev: type-checking direto, sem build intermediario |
| **Next.js** (`apps/web`)                    | `transpilePackages` no `next.config.ts`              | Next.js resolve TS de packages internos nativamente      |
| **Backend** (`apps/server`, `worker`, etc.) | `tsup` bundla app + packages num `dist/` autocontido | Produz JS puro que roda com `node dist/index.js`         |
| **Docker**                                  | `pnpm deploy --filter` para flat node_modules        | Elimina symlinks, copia apenas deps de producao          |

### Package.json dos Packages (sem mudanca)

```json
{
  "name": "@repo/env",
  "exports": { ".": "./src/index.ts" }
}
```

Continua exportando TS cru. Nao precisa de build step.

### tsup Config para Apps Backend

`apps/server/tsup.config.ts`:

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    server: 'src/server.ts',
    worker: 'src/worker.ts',
  },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  // Bundla packages internos (@repo/*) dentro do output
  noExternal: [
    '@repo/core',
    '@repo/db',
    '@repo/env',
    '@repo/shared',
    '@repo/auth',
  ],
  // NÃO bundla deps externas (fastify, prisma, etc.)
  external: [
    'fastify',
    '@fastify/*',
    '@prisma/client',
    'prisma',
    'bullmq',
    'ioredis',
    'socket.io',
    'pino',
    'better-auth',
    '@casl/*',
    'tsyringe',
    'reflect-metadata',
    'zod',
  ],
})
```

`apps/chat-server/tsup.config.ts`:

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: ['@repo/db-chat', '@repo/env', '@repo/shared'],
  external: [
    'fastify',
    '@fastify/*',
    'mongoose',
    'bullmq',
    'ioredis',
    'socket.io',
    '@socket.io/*',
    'pino',
    'zod',
  ],
})
```

Mesmo padrao para `apps/chat-worker/tsup.config.ts` (com `@repo/ai` em noExternal e `baileys` em external).

### Package.json das Apps Backend

```json
{
  "name": "@app/server",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsup",
    "start": "node dist/server.js"
  },
  "devDependencies": {
    "tsup": "^8.4.0"
  }
}
```

### Next.js Config (Frontend)

```ts
// apps/web/next.config.ts
const nextConfig: NextConfig = {
  transpilePackages: ['@repo/shared', '@repo/env', '@repo/auth'],
  // ...
}
```

### Dockerfile.server (Corrigido)

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# --- DEPS ---
FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY apps/worker/package.json apps/worker/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/env/package.json packages/env/
COPY packages/shared/package.json packages/shared/
COPY packages/auth/package.json packages/auth/
COPY config/typescript-config/package.json config/typescript-config/
RUN pnpm install --frozen-lockfile

# --- BUILD ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY . .

# Prisma generate (cria client no node_modules)
RUN cd packages/db && pnpm exec prisma generate

# tsup bundla app + packages internos
RUN cd apps/server && pnpm build

# --- PRODUCTION DEPS ---
FROM base AS prod-deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile --prod

# --- RUNNER ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Apenas deps externas de producao
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/server/node_modules ./apps/server/node_modules

# Prisma client gerado
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/packages/db/prisma ./prisma

# dist/ bundlado (contem app + packages internos)
COPY --from=builder /app/apps/server/dist ./dist

EXPOSE 3001
CMD ["node", "dist/server.js"]
```

### Dockerfile.chat (Corrigido)

```dockerfile
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/chat-server/package.json apps/chat-server/
COPY apps/chat-worker/package.json apps/chat-worker/
COPY packages/db-chat/package.json packages/db-chat/
COPY packages/env/package.json packages/env/
COPY packages/shared/package.json packages/shared/
COPY packages/ai/package.json packages/ai/
COPY config/typescript-config/package.json config/typescript-config/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN cd apps/chat-server && pnpm build
RUN cd apps/chat-worker && pnpm build

FROM base AS prod-deps
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/chat-server/package.json apps/chat-server/
COPY apps/chat-worker/package.json apps/chat-worker/
RUN pnpm install --frozen-lockfile --prod

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/apps/chat-server/dist ./chat-server/dist
COPY --from=builder /app/apps/chat-worker/dist ./chat-worker/dist
EXPOSE 3002
CMD ["node", "chat-server/dist/index.js"]
```

### Fluxo Completo

```
DEV (local):
  packages/ exportam TS cru
  tsx resolve imports direto
  zero build intermediario

BUILD (CI/Docker):
  prisma generate        → cria client em node_modules/.prisma
  tsup (apps backend)    → bundla app + @repo/* internos → dist/
  next build (web)       → transpilePackages resolve TS

DOCKER:
  deps stage             → pnpm install --frozen-lockfile
  build stage            → prisma generate + tsup
  prod-deps stage        → pnpm install --prod (so deps externas)
  runner stage           → node dist/server.js (standalone)
```

### Checklist de Validacao

- [ ] `pnpm build` no root compila todos os apps sem erro
- [ ] `docker build -f Dockerfile.server .` completa sem erro
- [ ] Container roda: `docker run bens-server node dist/server.js` → responde /health
- [ ] Prisma queries funcionam dentro do container
- [ ] Nenhum `@repo/*` em node_modules do runner (tudo bundlado no dist/)
- [ ] Source maps disponiveis para Sentry (`sourcemap: true` no tsup)

### Regras

- Packages NUNCA tem build step (exportam TS cru)
- Apps backend SEMPRE usam tsup para bundle de producao
- Next.js usa `transpilePackages` (nao precisa de tsup)
- `noExternal` inclui todos `@repo/*` (bundla dentro do dist)
- `external` inclui todas deps npm (ficam em node_modules)
- Prisma generate roda no Dockerfile (nao commitado)
- Docker multi-stage: deps → build → prod-deps → runner (imagem minima)

---

## DB-RLS — Two Database Users Pattern (2026-04-13)

### Contexto

PostgreSQL RLS (Row Level Security) com `FORCE ROW LEVEL SECURITY` exige que `app.current_tenant` esteja setado via `SET config` antes de cada query. O DI container registra repositorios como singletons com o `prisma` global, que NAO seta tenant. Resultado: queries via DI retornam vazio quando RLS esta ativo.

### Decisao

Dois Prisma clients com dois DB users:

| Client        | Env Var              | DB User                 | RLS      | Uso                                         |
| ------------- | -------------------- | ----------------------- | -------- | ------------------------------------------- |
| `prisma`      | `DATABASE_URL`       | `app_user`              | Enforced | Base para `tenantPrisma` (defense-in-depth) |
| `prismaAdmin` | `DATABASE_ADMIN_URL` | `bens_prod` (superuser) | Bypassed | DI container repos, workers, internal API   |

```
packages/db/src/index.ts:
  export const prisma = ...       // app_user, RLS enforced
  export const prismaAdmin = ...  // bens_prod, bypasses RLS (fallback: prisma)
```

### Regras

- `container-registrations.ts`: repos que acessam tabelas com RLS DEVEM usar `prismaAdmin`
- Workers/jobs cross-tenant: DEVEM usar `prismaAdmin` (nao tem tenant context)
- `tenantPrisma` (`createTenantClient`): continua como defense-in-depth para endpoints sensiveis
- App-level `WHERE organizationId` e a isolacao PRIMARIA — `prismaAdmin` confia nesse filtro
- Novas tabelas com RLS: lembrar que DI repos NAO funcionam com `prisma` global
- `DATABASE_ADMIN_URL` deve estar em `.env` local e prod. Sem ele, `prismaAdmin` cai pra `prisma`

### Anti-patterns

- NAO usar `prisma` global em DI repos quando a tabela tem `FORCE ROW LEVEL SECURITY`
- NAO criar policy RLS com match estrito sem fallback se o sistema usa prisma global sem tenant
- NAO expor `prismaAdmin` em endpoints publicos sem validacao de organizationId no app-level

---

## MOD-1 — Arquitetura Modular por Bounded Context (2026-09-13)

> **Status:** aprovada (revisada após review), migração em andamento. Alvo e passos em [`architecture/2026-09-13-migration-plan.md`](architecture/2026-09-13-migration-plan.md). Mapa vivo em [`architecture/context-map.md`](architecture/context-map.md). Base: [`audits/2026-09-13-domain-analysis.md`](audits/2026-09-13-domain-analysis.md). O design original [`architecture/2026-09-13-modular-architecture.md`](architecture/2026-09-13-modular-architecture.md) foi substituído por esta revisão e é só racional histórico.

### Contexto

A análise de domínio encontrou 23 módulos planos em `packages/core` com 4 ciclos de import (proposal⇄contact, proposal⇄policy, proposal⇄document, goal⇄dashboard), `export *` na raiz expondo repositórios Prisma, 38 arquivos de rotas/workers importando `@repo/db` com regras de negócio, e a lógica de conversa duplicada entre `chat-server` e `chat-worker`. A primeira proposta (14 contextos, ports por consumidor, eventos e outbox) foi revisada para uma versão com menos cerimônia.

### Decisão

- **Monolito modular** em `packages/core/src/`:
  - `shared-kernel/` — ids, money (`Cents`, `BasisPoints`), domain-error, cursor-page, json.
  - `platform/` — audit, storage, lookups (cep, vehicle), csv, cache.
  - `modules/` — domínio: `sales` (leads, proposals, policies), `commissions`, `servicing` (claims, occurrences, assistance); simples: `clients`, `insurers`, `documents`, `workspace`, `billing`, `notifications` (só entrega), `performance` (goals + dashboard), `search`; processo: `compliance` (anonimização de cliente).
  - `packages/conversations` fica para depois, fora deste plano.
- **Chamada entre módulos = import direto do `index.ts` público do provider.** Ports só para fornecedores externos e para chat → ERP (HMAC).
- **Sem event bus, sem outbox, sem UnitOfWork.** `prisma.$transaction` só onde atomicidade é necessária.
- **Prisma restrito por módulo:** cada módulo recebe `Pick<PrismaClient, delegates próprios>`; escrita em tabela de outro módulo não compila.
- **Tokens de DI são classes abstratas** (visíveis no import), não strings.
- **Workspace é ACL sobre o Better Auth:** o Better Auth escreve as tabelas de identidade; workspace expõe queries e extensões de domínio.
- **Contrato de entitlements fica em `@repo/auth/entitlements`:** `billing` produz, `auth` consome, `auth` nunca importa `@repo/core`.

### Regras

- Dependências permitidas entre módulos: tabela em `architecture/context-map.md` §2. Nova dependência = nova linha no mapa + revisão na PR.
- Importar outro módulo só pelo `index.ts` dele; nunca `domain/`, `application/` ou `infrastructure/` de outro módulo.
- `shared-kernel` não importa nada; `platform` não importa módulos.
- Migração segue as regras do plano §0: um passo = uma PR, sem mudança de comportamento, sem mudança de contrato HTTP, "mover, depois mudar".

### Anti-patterns

- NÃO introduzir gateway, evento de domínio ou outbox entre módulos
- NÃO importar internals de outro módulo nem via string token de DI
- NÃO colocar regra de negócio em rota interna, processor ou AI tool
- NÃO escrever em tabela de outro módulo, nem via `prismaAdmin`

### Migração

7 fases incrementais descritas em [`architecture/2026-09-13-migration-plan.md`](architecture/2026-09-13-migration-plan.md): 1 identidade & workspace → 2 diretório de membros → 3 domínio sales → 4 persistência de sales → 5 comissões & dinheiro → 6 dependências legadas → 7 enforcement. Correções de gaps (S#) são tickets separados depois da fase 7.
