# Fase 0: Foundation - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Setup monorepo com 5 apps, packages compartilhados, Docker, CI/CD e design system base.

**Architecture:** pnpm workspaces + Turborepo orquestrando 5 apps (web, server, worker, chat-server, chat-worker) e 7 packages (core, db, db-chat, auth, ai, env, shared). Docker Compose para dev local (PostgreSQL 18, MongoDB 8, Redis 8).

**Tech Stack:** pnpm 9, Turbo, TypeScript 5.9 strict, Next.js 16, Fastify 5, BullMQ 5, Prisma 7, Mongoose, Docker, Nginx, GitHub Actions.

**Spec:** `/home/artur/projects/ESPECIFICACAO-FINAL.md`

---

## Required Context Documents

> **OBRIGATORIO:** Antes de implementar, o agente DEVE ler os documentos referenciados em cada task. Documentos na raiz e em `docs/` contem decisoes que sobrescrevem detalhes deste plano.

### Mapa de Documentos por Task

| Task                        | Documentos para Ler                                                                                                                                    | O que Impacta                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| **1-2** (Root + Configs)    | `CLAUDE.md` (naming, lint rules)                                                                                                                       | Regras de naming, ESLint rules, TypeScript strict                                          |
| **3** (@repo/env)           | `SECURITY-SPEC.md` (SEC-1)                                                                                                                             | Adicionar `ENCRYPTION_KEY` para PII encryption                                             |
| **4** (@repo/shared)        | `ESPECIFICACAO-FINAL.md` sec.7 (Response Pattern), `CHAT-SPEC.md` sec.9 (Socket events)                                                                | API response types, Socket.IO events completos                                             |
| **5** (@repo/db)            | `ARCHITECTURE-DECISIONS.md` (GAP-2, GAP-5)                                                                                                             | Migration strategy, seed structure                                                         |
| **9** (web)                 | `ESPECIFICACAO-FINAL.md` sec.9 (Design System), `docs/UI-PATTERNS.md` sec.1 (Estilo Visual), `docs/FRONTEND-PATTERNS.md` (Server Components, Suspense) | Design tokens oklch, Inter font, provider structure                                        |
| **10** (server)             | `ARCHITECTURE-DECISIONS.md` (GAP-7: tsup build), `SECURITY-SPEC.md` (S1, S6, S14)                                                                      | **Build usa `tsup` (nao `tsc`)**, bodyLimit 10MB, Cache-Control, Content-Type enforcement  |
| **11-13** (worker, chat-\*) | `ARCHITECTURE-DECISIONS.md` (GAP-7: tsup build)                                                                                                        | **Build usa `tsup` (nao `tsc`)**, tsup.config.ts por app                                   |
| **14** (Docker)             | `ARCHITECTURE-DECISIONS.md` (GAP-7: Dockerfile corrigido 4-stage)                                                                                      | **Dockerfiles com 4 stages** (deps → build → prod-deps → runner), prisma generate no build |
| **15** (CI/CD)              | `ESPECIFICACAO-FINAL.md` sec.4 (Deploy)                                                                                                                | Deploy flow: prisma migrate deploy antes de restart                                        |

### Discrepancias Conhecidas (Doc > Plano)

> Quando houver conflito entre este plano e os documentos de arquitetura, **o documento de arquitetura prevalece**.

1. **GAP-7 (ARCHITECTURE-DECISIONS.md):** Apps backend usam `tsup` para build (nao `tsc`). Cada app backend precisa de `tsup.config.ts` com `noExternal: ['@repo/*']`. O plano original usava `tsc` — **CORRIGIDO abaixo**.
2. **GAP-7 (ARCHITECTURE-DECISIONS.md):** Dockerfiles tem 4 stages (deps → build → prod-deps → runner) com prisma generate no build stage. O plano original tinha 3 stages simplificados — **CORRIGIDO abaixo**.
3. **SECURITY-SPEC.md (S6):** Fastify precisa de `bodyLimit: 10 * 1024 * 1024` (10MB) — **CORRIGIDO no Task 10**.
4. **SECURITY-SPEC.md (SEC-1):** `ENCRYPTION_KEY` precisa estar no @repo/env — **CORRIGIDO no Task 3**.

### Referencia: `_reference/`

O diretorio `_reference/` contem 3 MVPs anteriores (`bens/`, `bens-seg/`, `bens-seguros/`) com implementacoes reais que podem ser consultados como referencia. Nao sao normativos — os documentos em `docs/` sao a fonte de verdade.

---

## File Structure

```
bens-seguros/
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml             # Workspace definition
├── turbo.json                      # Turbo pipeline config
├── .npmrc                          # pnpm config
├── .gitignore
├── .prettierrc.mjs
├── .eslintrc.mjs
├── docker-compose.yml              # Dev: postgres + mongo + redis
├── docker-compose.prod.yml         # Prod: all services
├── nginx/
│   └── default.conf                # Reverse proxy config
├── Dockerfile.server               # server + worker image
├── Dockerfile.chat                 # chat-server + chat-worker image
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint, typecheck, test on PR
│       ├── deploy-server.yml       # Build + deploy server/worker
│       └── deploy-chat.yml         # Build + deploy chat-server/chat-worker
├── config/
│   ├── eslint-config/
│   │   ├── package.json
│   │   └── index.mjs
│   ├── prettier-config/
│   │   ├── package.json
│   │   └── index.mjs
│   └── typescript-config/
│       ├── package.json
│       ├── base.json
│       ├── nextjs.json
│       └── node.json
├── packages/
│   ├── env/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts            # createEnv + all env vars
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── api-types.ts        # Success/Error response types
│   │       └── socket-events.ts    # Socket.IO event types
│   ├── db/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── prisma/
│   │       └── schema.prisma       # PostgreSQL schema (empty, ready)
│   ├── db-chat/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── connection.ts       # Mongoose connection
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       └── container.ts        # tsyringe container setup
│   ├── auth/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts            # Placeholder
│   └── ai/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts            # Placeholder
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.mjs
│   │   └── src/
│   │       ├── app/
│   │       │   ├── layout.tsx      # Root layout (Inter font, providers)
│   │       │   ├── page.tsx        # Landing redirect
│   │       │   └── globals.css     # Tailwind + oklch design tokens
│   │       ├── components/
│   │       │   └── ui/             # shadcn/ui base components
│   │       │       └── button.tsx  # First component to validate setup
│   │       ├── lib/
│   │       │   └── utils.ts        # cn() helper
│   │       └── providers/
│   │           └── index.tsx       # ThemeProvider + QueryProvider
│   ├── server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── app.ts              # Fastify app factory
│   │       ├── server.ts           # HTTP entrypoint
│   │       └── worker.ts           # BullMQ entrypoint
│   ├── worker/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── index.ts            # BullMQ worker entrypoint
│   ├── chat-server/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── app.ts              # Fastify + Socket.IO factory
│   │       └── index.ts            # Entrypoint
│   └── chat-worker/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           └── index.ts            # BullMQ + Baileys entrypoint
```

---

## Task 1: Root Monorepo Setup

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.npmrc`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repository**

> **NOTA:** O projeto ja existe em `/home/artur/projects/` com docs, specs e CLAUDE.md. Inicializar git AQUI (nao criar subdiretorio). Os arquivos de documentacao devem ser commitados junto.

```bash
cd /home/artur/projects
git init
```

- [ ] **Step 2: Create root package.json**

```json
{
  "name": "bens-seguros",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "engines": {
    "node": ">=22.18.0"
  },
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "test": "turbo test",
    "test:watch": "turbo test:watch",
    "clean": "turbo clean",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\""
  },
  "devDependencies": {
    "prettier": "^3.8.1",
    "prettier-plugin-tailwindcss": "^0.6.12",
    "turbo": "^2.8.12"
  }
}
```

- [ ] **Step 3: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'config/*'
```

- [ ] **Step 4: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": ["NODE_ENV", "DATABASE_URL", "MONGODB_URL", "REDIS_URL"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", "generated/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "test:watch": {
      "cache": false,
      "persistent": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "clean": {
      "cache": false
    }
  }
}
```

- [ ] **Step 5: Create .npmrc**

```
auto-install-peers=true
strict-peer-dependencies=false
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
.next/
dist/
generated/
.turbo/
*.tsbuildinfo
.env
.env.local
.env.*.local
.DS_Store
```

- [ ] **Step 7: Install pnpm and run initial install**

```bash
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install
```

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: initialize monorepo with pnpm + turbo"
```

---

## Task 2: Shared Configs (ESLint, Prettier, TypeScript)

**Files:**

- Create: `config/eslint-config/package.json`
- Create: `config/eslint-config/index.mjs`
- Create: `config/prettier-config/package.json`
- Create: `config/prettier-config/index.mjs`
- Create: `config/typescript-config/package.json`
- Create: `config/typescript-config/base.json`
- Create: `config/typescript-config/nextjs.json`
- Create: `config/typescript-config/node.json`
- Create: `.prettierrc.mjs`

- [ ] **Step 1: Create TypeScript configs**

`config/typescript-config/package.json`:

```json
{
  "name": "@config/typescript-config",
  "private": true,
  "version": "0.0.0"
}
```

`config/typescript-config/base.json`:

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true
  },
  "exclude": ["node_modules", "dist"]
}
```

`config/typescript-config/node.json`:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

`config/typescript-config/nextjs.json`:

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "noEmit": true,
    "plugins": [{ "name": "next" }]
  }
}
```

- [ ] **Step 2: Create ESLint config**

`config/eslint-config/package.json`:

```json
{
  "name": "@config/eslint-config",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "dependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^16.0.0",
    "eslint-plugin-import": "^2.31.0"
  }
}
```

`config/eslint-config/index.mjs`:

```js
import tseslint from '@typescript-eslint/eslint-plugin'
import tsparser from '@typescript-eslint/parser'

export const baseConfig = {
  files: ['**/*.ts', '**/*.tsx'],
  languageOptions: {
    parser: tsparser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
  },
  plugins: {
    '@typescript-eslint': tseslint,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
}

export const nextConfig = {
  ...baseConfig,
}

export const nodeConfig = {
  ...baseConfig,
}
```

- [ ] **Step 3: Create Prettier config**

`config/prettier-config/package.json`:

```json
{
  "name": "@config/prettier-config",
  "private": true,
  "version": "0.0.0",
  "type": "module"
}
```

`config/prettier-config/index.mjs`:

```js
export default {
  semi: true,
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  plugins: ['prettier-plugin-tailwindcss'],
}
```

`.prettierrc.mjs` (root):

```js
export { default } from '@config/prettier-config'
```

- [ ] **Step 4: Install dependencies and verify**

```bash
pnpm install
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add shared eslint, prettier, typescript configs"
```

---

## Task 3: Package - @repo/env

> **Ref:** `SECURITY-SPEC.md` (SEC-1) — adicionar `ENCRYPTION_KEY` para criptografia de PII (CPF/CNPJ).

**Files:**

- Create: `packages/env/package.json`
- Create: `packages/env/tsconfig.json`
- Create: `packages/env/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@repo/env",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "@t3-oss/env-core": "^0.12.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "@config/typescript-config/node.json",
  "include": ["src"]
}
```

- [ ] **Step 3: Create src/index.ts with all env vars**

```ts
import { createEnv } from '@t3-oss/env-core'
import { z } from 'zod'

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    DATABASE_URL: z.string().url(),
    MONGODB_URL: z.string().url(),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    AUTH_SECRET: z.string().min(32),
    SOCKET_JWT_SECRET: z.string().min(16),
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
    API_URL: z.string().url().default('http://localhost:3001'),
    CHAT_SERVER_URL: z.string().url().default('http://localhost:3002'),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().default('bens-seguros'),
    R2_PUBLIC_URL: z.string().url().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    SENTRY_DSN: z.string().url().optional(),
    META_WHATSAPP_TOKEN: z.string().optional(),
    META_WHATSAPP_VERIFY_TOKEN: z.string().optional(),
    META_WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
    // SEC-1: PII encryption key (see SECURITY-SPEC.md)
    ENCRYPTION_KEY: z.string().min(32).optional(),
  },
  clientPrefix: 'NEXT_PUBLIC_',
  client: {
    NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3001'),
    NEXT_PUBLIC_CHAT_SERVER_URL: z
      .string()
      .url()
      .default('http://localhost:3002'),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
})
```

- [ ] **Step 4: Commit**

```bash
git add packages/env/
git commit -m "feat: add @repo/env package with typed environment variables"
```

---

## Task 4: Package - @repo/shared

> **Ref:** `ESPECIFICACAO-FINAL.md` sec.7 (Response Pattern) para api-types. `CHAT-SPEC.md` sec.9 para eventos Socket.IO completos — os eventos aqui sao um subset inicial, a lista completa sera expandida na Fase 5.

**Files:**

- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/api-types.ts`
- Create: `packages/shared/src/socket-events.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@repo/shared",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./api-types": "./src/api-types.ts",
    "./socket-events": "./src/socket-events.ts"
  },
  "dependencies": {
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create api-types.ts**

```ts
import { z } from 'zod'

export const apiSuccessSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z
      .object({
        total: z.number().optional(),
        nextCursor: z.string().optional(),
      })
      .optional(),
  })

export const apiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
})

export type ApiSuccess<T> = {
  success: true
  data: T
  meta?: { total?: number; nextCursor?: string }
}

export type ApiError = {
  success: false
  error: { code: string; message: string }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError
```

- [ ] **Step 3: Create socket-events.ts**

```ts
export const SOCKET_EVENTS = {
  // Chat
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  MESSAGE_STATUS: 'message_status',
  CONVERSATION_OPENED: 'conversation_opened',
  CONVERSATION_CLOSED: 'conversation_closed',
  CONVERSATION_ASSIGNED: 'conversation_assigned',
  // Presence
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  USER_TYPING: 'user_typing',
  // WhatsApp
  WHATSAPP_STATUS: 'whatsapp_status',
  WHATSAPP_QR: 'whatsapp_qr',
  // Notifications
  NOTIFICATION: 'notification',
} as const

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]
```

- [ ] **Step 4: Create index.ts barrel export**

```ts
export * from './api-types.js'
export * from './socket-events.js'
```

- [ ] **Step 5: Commit**

```bash
git add packages/shared/
git commit -m "feat: add @repo/shared package with api types and socket events"
```

---

## Task 5: Package - @repo/db (Prisma + PostgreSQL)

> **Ref:** `ARCHITECTURE-DECISIONS.md` (GAP-2: migration strategy, GAP-5: seed data structure). Schema sera populado na Fase 1 — aqui apenas o scaffold com Prisma client singleton e tenant extension.

**Files:**

- Create: `packages/db/package.json`
- Create: `packages/db/tsconfig.json`
- Create: `packages/db/prisma/schema.prisma`
- Create: `packages/db/src/index.ts`
- Create: `packages/db/src/tenant-client.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@repo/db",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./tenant": "./src/tenant-client.ts"
  },
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/adapter-pg": "^7.0.0",
    "@prisma/client": "^7.4.0",
    "pg": "^8.13.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "prisma": "^7.4.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create initial schema.prisma (empty, with RLS support)**

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Auth & Multi-tenancy models will be added in Fase 1
// ERP models will be added in Fase 2+
```

- [ ] **Step 3: Create src/index.ts**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

export { PrismaClient } from '@prisma/client'
export type * from '@prisma/client'
```

- [ ] **Step 4: Create src/tenant-client.ts**

```ts
import { prisma } from './index.js'

export function createTenantClient(organizationId: string) {
  return prisma.$extends({
    query: {
      $allOperations({ args, query }) {
        return prisma.$transaction(async (tx) => {
          await tx.$executeRawUnsafe(
            `SET LOCAL app.current_tenant = '${organizationId}'`
          )
          return query(args)
        })
      },
    },
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/db/
git commit -m "feat: add @repo/db package with prisma + postgresql + tenant client"
```

---

## Task 6: Package - @repo/db-chat (Mongoose + MongoDB)

**Files:**

- Create: `packages/db-chat/package.json`
- Create: `packages/db-chat/tsconfig.json`
- Create: `packages/db-chat/src/index.ts`
- Create: `packages/db-chat/src/connection.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@repo/db-chat",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./connection": "./src/connection.ts"
  },
  "dependencies": {
    "mongoose": "^8.10.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create src/connection.ts**

```ts
import mongoose from 'mongoose'

let isConnected = false

export async function connectMongoDB(uri: string): Promise<void> {
  if (isConnected) return

  await mongoose.connect(uri, {
    retryWrites: true,
    w: 'majority',
  })

  isConnected = true
}

export async function disconnectMongoDB(): Promise<void> {
  if (!isConnected) return
  await mongoose.disconnect()
  isConnected = false
}
```

- [ ] **Step 3: Create src/index.ts**

```ts
export { connectMongoDB, disconnectMongoDB } from './connection.js'
// Mongoose models will be exported here as they are created in Fase 5
```

- [ ] **Step 4: Commit**

```bash
git add packages/db-chat/
git commit -m "feat: add @repo/db-chat package with mongoose + mongodb connection"
```

---

## Task 7: Package - @repo/core (DDD Container)

**Files:**

- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/container.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@repo/core",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./container": "./src/container.ts"
  },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest watch"
  },
  "dependencies": {
    "@repo/db": "workspace:*",
    "reflect-metadata": "^0.2.0",
    "tsyringe": "^4.8.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "typescript": "^5.9.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create src/container.ts**

```ts
import 'reflect-metadata'
import { container } from 'tsyringe'

export { container }
export { injectable, inject, singleton } from 'tsyringe'
```

- [ ] **Step 3: Create src/index.ts**

```ts
export { container, injectable, inject, singleton } from './container.js'
// Domain modules will be exported here as they are created
```

- [ ] **Step 4: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['reflect-metadata'],
  },
})
```

- [ ] **Step 5: Commit**

```bash
git add packages/core/
git commit -m "feat: add @repo/core package with tsyringe DI container"
```

---

## Task 8: Package - @repo/auth and @repo/ai (Placeholders)

**Files:**

- Create: `packages/auth/package.json`
- Create: `packages/auth/tsconfig.json`
- Create: `packages/auth/src/index.ts`
- Create: `packages/ai/package.json`
- Create: `packages/ai/tsconfig.json`
- Create: `packages/ai/src/index.ts`

- [ ] **Step 1: Create @repo/auth placeholder**

`packages/auth/package.json`:

```json
{
  "name": "@repo/auth",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {},
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "typescript": "^5.9.0"
  }
}
```

`packages/auth/src/index.ts`:

```ts
// Better Auth + CASL setup will be implemented in Fase 1
export {}
```

- [ ] **Step 2: Create @repo/ai placeholder**

`packages/ai/package.json`:

```json
{
  "name": "@repo/ai",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {},
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "typescript": "^5.9.0"
  }
}
```

`packages/ai/src/index.ts`:

```ts
// Vercel AI SDK multi-provider setup will be implemented in Fase 6
export {}
```

- [ ] **Step 3: Commit**

```bash
git add packages/auth/ packages/ai/
git commit -m "chore: add @repo/auth and @repo/ai placeholder packages"
```

---

## Task 9: App - web (Next.js 16)

> **Ref:** `ESPECIFICACAO-FINAL.md` sec.9 (Design System: Inter font, oklch colors, teal #1f4b5f + gold #b98927). `docs/UI-PATTERNS.md` sec.1 (Swiss Modernism, @coss/style radius 0.625rem). `docs/FRONTEND-PATTERNS.md` (Server-first, React Compiler, staleTime 60s, ReactQueryDevtools apenas em dev).

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/lib/utils.ts`
- Create: `apps/web/src/providers/index.tsx`
- Create: `apps/web/src/components/ui/button.tsx`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@app/web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/shared": "workspace:*",
    "@repo/env": "workspace:*",
    "next": "^16.1.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "next-themes": "^0.4.0",
    "@tanstack/react-query": "^5.64.0",
    "tailwind-merge": "^2.6.0",
    "clsx": "^2.1.0",
    "class-variance-authority": "^0.7.1",
    "lucide-react": "^0.475.0",
    "sonner": "^2.0.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "@config/eslint-config": "workspace:*",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create next.config.ts**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ['@repo/shared', '@repo/env', '@repo/auth'],
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()',
        },
      ],
    },
  ],
}

export default nextConfig
```

- [ ] **Step 3: Create globals.css with oklch design tokens**

```css
@import 'tailwindcss';

@theme {
  /* Primary: Teal #1f4b5f */
  --color-primary-50: oklch(0.97 0.01 200);
  --color-primary-100: oklch(0.93 0.02 200);
  --color-primary-200: oklch(0.85 0.04 200);
  --color-primary-300: oklch(0.73 0.07 200);
  --color-primary-400: oklch(0.58 0.09 200);
  --color-primary-500: oklch(0.45 0.08 200);
  --color-primary-600: oklch(0.38 0.07 200);
  --color-primary-700: oklch(0.33 0.06 200);
  --color-primary-800: oklch(0.28 0.05 200);
  --color-primary-900: oklch(0.24 0.04 200);

  /* Accent: Gold #b98927 */
  --color-accent-50: oklch(0.97 0.02 80);
  --color-accent-100: oklch(0.93 0.05 80);
  --color-accent-200: oklch(0.87 0.08 80);
  --color-accent-300: oklch(0.79 0.12 80);
  --color-accent-400: oklch(0.72 0.14 80);
  --color-accent-500: oklch(0.65 0.14 80);
  --color-accent-600: oklch(0.56 0.13 80);
  --color-accent-700: oklch(0.48 0.11 80);
  --color-accent-800: oklch(0.4 0.09 80);
  --color-accent-900: oklch(0.34 0.07 80);

  /* Destructive: Red #b42318 */
  --color-destructive-50: oklch(0.97 0.01 25);
  --color-destructive-100: oklch(0.93 0.04 25);
  --color-destructive-500: oklch(0.55 0.2 25);
  --color-destructive-600: oklch(0.48 0.18 25);
  --color-destructive-700: oklch(0.42 0.16 25);

  /* Font */
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  /* Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.65rem;
  --radius-xl: 0.875rem;
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 286);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 286);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 286);
  --primary: var(--color-primary-600);
  --primary-foreground: oklch(0.98 0.005 200);
  --secondary: oklch(0.967 0.001 286);
  --secondary-foreground: oklch(0.21 0.006 286);
  --muted: oklch(0.967 0.001 286);
  --muted-foreground: oklch(0.55 0.015 286);
  --accent: var(--color-accent-500);
  --accent-foreground: oklch(0.98 0.01 80);
  --destructive: var(--color-destructive-500);
  --destructive-foreground: oklch(0.98 0.01 25);
  --border: oklch(0.92 0.004 286);
  --input: oklch(0.92 0.004 286);
  --ring: var(--color-primary-500);
}

.dark {
  --background: oklch(0.13 0.005 286);
  --foreground: oklch(0.98 0.005 286);
  --card: oklch(0.16 0.005 286);
  --card-foreground: oklch(0.98 0.005 286);
  --popover: oklch(0.16 0.005 286);
  --popover-foreground: oklch(0.98 0.005 286);
  --primary: var(--color-primary-400);
  --primary-foreground: oklch(0.13 0.005 200);
  --secondary: oklch(0.22 0.006 286);
  --secondary-foreground: oklch(0.98 0.005 286);
  --muted: oklch(0.22 0.006 286);
  --muted-foreground: oklch(0.65 0.015 286);
  --accent: var(--color-accent-400);
  --accent-foreground: oklch(0.13 0.01 80);
  --destructive: var(--color-destructive-600);
  --destructive-foreground: oklch(0.98 0.01 25);
  --border: oklch(0.25 0.004 286);
  --input: oklch(0.25 0.004 286);
  --ring: var(--color-primary-400);
}

body {
  font-family: var(--font-sans);
  background: var(--background);
  color: var(--foreground);
}
```

- [ ] **Step 4: Create layout.tsx with Inter font + providers**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/providers'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Bens Seguros',
  description: 'ERP para corretoras de seguros',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Create providers**

```tsx
'use client'

import { ThemeProvider } from 'next-themes'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000 },
        },
      })
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 6: Create utils.ts and page.tsx**

`src/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

`src/app/page.tsx`:

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <h1 className="text-primary-600 text-3xl font-semibold">Bens Seguros</h1>
    </main>
  )
}
```

- [ ] **Step 7: Create first shadcn component (button) to validate design system**

```tsx
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90',
        destructive:
          'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90',
        outline:
          'border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--muted)]',
        secondary:
          'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:opacity-80',
        ghost: 'hover:bg-[var(--muted)] hover:text-[var(--muted-foreground)]',
        link: 'text-[var(--primary)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Step 8: Commit**

```bash
git add apps/web/
git commit -m "feat: add web app with next.js 16, design system tokens, dark mode"
```

---

## Task 10: App - server (Fastify 5)

> **Ref:** `ARCHITECTURE-DECISIONS.md` (GAP-7: build usa `tsup`, nao `tsc` — packages internos sao bundlados no dist). `SECURITY-SPEC.md` (S1: Cache-Control, S6: bodyLimit 10MB, S14: Content-Type enforcement). Ver GAP-7 para tsup.config.ts completo.

**Files:**

- Create: `apps/server/package.json`
- Create: `apps/server/tsconfig.json`
- Create: `apps/server/tsup.config.ts`
- Create: `apps/server/src/app.ts`
- Create: `apps/server/src/server.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@app/server",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsup",
    "start": "node dist/server.js",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/core": "workspace:*",
    "@repo/db": "workspace:*",
    "@repo/env": "workspace:*",
    "@repo/shared": "workspace:*",
    "@repo/auth": "workspace:*",
    "fastify": "^5.7.0",
    "@fastify/cors": "^11.0.0",
    "@fastify/helmet": "^13.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "@fastify/swagger": "^9.0.0",
    "@scalar/fastify-api-reference": "^1.0.0",
    "fastify-type-provider-zod": "^4.0.0",
    "pino": "^9.0.0",
    "zod": "^3.24.0",
    "reflect-metadata": "^0.2.0",
    "tsyringe": "^4.8.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "tsup": "^8.4.0",
    "tsx": "^4.19.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create tsup.config.ts (GAP-7)**

> Ref: `ARCHITECTURE-DECISIONS.md` GAP-7 — tsup bundla app + packages internos num dist/ autocontido.

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    server: 'src/server.ts',
  },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: [
    '@repo/core',
    '@repo/db',
    '@repo/env',
    '@repo/shared',
    '@repo/auth',
  ],
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

- [ ] **Step 3: Create app.ts (Fastify factory)**

> Ref: `SECURITY-SPEC.md` S6 (bodyLimit 10MB), S1 (Cache-Control no-store).

```ts
import 'reflect-metadata'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    bodyLimit: 10 * 1024 * 1024, // S6: 10MB
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })

  await app.register(helmet)

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Bens Seguros API',
        version: '1.0.0',
      },
    },
  })

  app.get('/health', async () => ({ status: 'ok' }))

  return app
}
```

- [ ] **Step 4: Create server.ts (entrypoint)**

```ts
import { buildApp } from './app.js'

const start = async () => {
  const app = await buildApp()

  const port = Number(process.env.PORT ?? 3001)
  const host = process.env.HOST ?? '0.0.0.0'

  await app.listen({ port, host })
  app.log.info(`Server running on http://${host}:${port}`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 5: Commit**

```bash
git add apps/server/
git commit -m "feat: add server app with fastify 5, swagger, helmet, rate limit"
```

---

## Task 11: App - worker (BullMQ ERP)

> **Ref:** `ARCHITECTURE-DECISIONS.md` (GAP-7: build usa `tsup`). Worker compartilha imagem Docker com server.

**Files:**

- Create: `apps/worker/package.json`
- Create: `apps/worker/tsconfig.json`
- Create: `apps/worker/tsup.config.ts`
- Create: `apps/worker/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@app/worker",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/core": "workspace:*",
    "@repo/db": "workspace:*",
    "@repo/env": "workspace:*",
    "bullmq": "^5.70.0",
    "ioredis": "^5.4.0",
    "reflect-metadata": "^0.2.0",
    "tsyringe": "^4.8.0",
    "pino": "^9.0.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "tsup": "^8.4.0",
    "tsx": "^4.19.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create tsup.config.ts (GAP-7)**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: ['@repo/core', '@repo/db', '@repo/env'],
  external: [
    'bullmq',
    'ioredis',
    '@prisma/client',
    'prisma',
    'pino',
    'tsyringe',
    'reflect-metadata',
    'zod',
  ],
})
```

- [ ] **Step 3: Create src/index.ts**

```ts
import 'reflect-metadata'
import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import pino from 'pino'

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
})

const connection = new IORedis(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  }
)

logger.info('ERP Worker started. Waiting for jobs...')

// Queue processors will be registered here in Fase 2+

const gracefulShutdown = async () => {
  logger.info('Shutting down worker...')
  await connection.quit()
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
```

- [ ] **Step 4: Commit**

```bash
git add apps/worker/
git commit -m "feat: add worker app with bullmq + redis connection"
```

---

## Task 12: App - chat-server (Fastify + Socket.IO)

> **Ref:** `ARCHITECTURE-DECISIONS.md` (GAP-7: build usa `tsup`). `CHAT-SPEC.md` (Socket.IO tenant isolation, rooms prefixadas). Ver GAP-7 para tsup.config.ts do chat-server.

**Files:**

- Create: `apps/chat-server/package.json`
- Create: `apps/chat-server/tsconfig.json`
- Create: `apps/chat-server/tsup.config.ts`
- Create: `apps/chat-server/src/app.ts`
- Create: `apps/chat-server/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@app/chat-server",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/db-chat": "workspace:*",
    "@repo/env": "workspace:*",
    "@repo/shared": "workspace:*",
    "fastify": "^5.7.0",
    "@fastify/cors": "^11.0.0",
    "fastify-type-provider-zod": "^4.0.0",
    "socket.io": "^4.8.0",
    "@socket.io/redis-adapter": "^8.3.0",
    "ioredis": "^5.4.0",
    "zod": "^3.24.0",
    "pino": "^9.0.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "tsup": "^8.4.0",
    "tsx": "^4.19.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create tsup.config.ts (GAP-7)**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
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

- [ ] **Step 3: Create app.ts**

```ts
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import IORedis from 'ioredis'
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod'

export async function buildChatApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
  })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  })

  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
  const pubClient = new IORedis(redisUrl)
  const subClient = pubClient.duplicate()

  const io = new Server(app.server, {
    cors: {
      origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
      credentials: true,
    },
    adapter: createAdapter(pubClient, subClient),
  })

  app.decorate('io', io)

  app.get('/health', async () => ({ status: 'ok' }))

  return { app, io }
}
```

- [ ] **Step 4: Create index.ts**

```ts
import { buildChatApp } from './app.js'

const start = async () => {
  const { app } = await buildChatApp()

  const port = Number(process.env.CHAT_PORT ?? 3002)
  const host = process.env.HOST ?? '0.0.0.0'

  await app.listen({ port, host })
  app.log.info(`Chat server running on http://${host}:${port}`)
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 5: Commit**

```bash
git add apps/chat-server/
git commit -m "feat: add chat-server app with fastify + socket.io + redis adapter"
```

---

## Task 13: App - chat-worker (BullMQ + Baileys)

> **Ref:** `ARCHITECTURE-DECISIONS.md` (GAP-7: build usa `tsup`). `CHAT-SPEC.md` sec.3 (Baileys connection manager) e sec.11 (BullMQ filas do chat).

**Files:**

- Create: `apps/chat-worker/package.json`
- Create: `apps/chat-worker/tsconfig.json`
- Create: `apps/chat-worker/tsup.config.ts`
- Create: `apps/chat-worker/src/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@app/chat-worker",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsup",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@repo/db-chat": "workspace:*",
    "@repo/env": "workspace:*",
    "@repo/shared": "workspace:*",
    "@repo/ai": "workspace:*",
    "bullmq": "^5.70.0",
    "ioredis": "^5.4.0",
    "baileys": "^7.0.0-rc.9",
    "pino": "^9.0.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "tsup": "^8.4.0",
    "tsx": "^4.19.0",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create tsup.config.ts (GAP-7)**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'node22',
  outDir: 'dist',
  clean: true,
  splitting: false,
  sourcemap: true,
  noExternal: ['@repo/db-chat', '@repo/env', '@repo/shared', '@repo/ai'],
  external: ['bullmq', 'ioredis', 'mongoose', 'baileys', 'pino', 'zod'],
})
```

- [ ] **Step 3: Create src/index.ts**

```ts
import pino from 'pino'
import IORedis from 'ioredis'

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
})

const connection = new IORedis(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  }
)

logger.info('Chat Worker started. Waiting for jobs...')

// Baileys connection + queue processors will be added in Fase 5

const gracefulShutdown = async () => {
  logger.info('Shutting down chat worker...')
  await connection.quit()
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)
```

- [ ] **Step 4: Commit**

```bash
git add apps/chat-worker/
git commit -m "feat: add chat-worker app with bullmq + redis connection"
```

---

## Task 14: Docker Compose (Dev + Prod)

> **Ref:** `ARCHITECTURE-DECISIONS.md` (GAP-7: Dockerfiles corrigidos com 4 stages, prisma generate no build). `ESPECIFICACAO-FINAL.md` sec.4 (Deploy, Nginx routing). `SECURITY-SPEC.md` (S16: portas nao-padrao em producao).

**Files:**

- Create: `docker-compose.yml`
- Create: `docker-compose.prod.yml`
- Create: `Dockerfile.server`
- Create: `Dockerfile.chat`
- Create: `nginx/default.conf`
- Create: `.env.example`

- [ ] **Step 1: Create docker-compose.yml (dev)**

```yaml
services:
  postgres:
    image: postgres:18-alpine
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: bens
      POSTGRES_PASSWORD: bens_dev
      POSTGRES_DB: bens_seguros
    volumes:
      - pg-data:/var/lib/postgresql/data

  mongodb:
    image: mongo:8
    restart: unless-stopped
    ports:
      - '27017:27017'
    command: ['--replSet', 'rs0', '--bind_ip_all']
    volumes:
      - mongo-data:/data/db

  mongo-init:
    image: mongo:8
    depends_on:
      - mongodb
    restart: 'no'
    command: >
      mongosh --host mongodb --eval "
        try { rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: 'mongodb:27017' }] }) }
        catch(e) { if (e.codeName !== 'AlreadyInitialized') throw e; }
      "

  redis:
    image: redis:8-alpine
    restart: unless-stopped
    ports:
      - '6379:6379'
    command: redis-server --requirepass bens_dev
    volumes:
      - redis-data:/data

volumes:
  pg-data:
  mongo-data:
  redis-data:
```

- [ ] **Step 2: Create docker-compose.prod.yml**

```yaml
services:
  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - server
      - chat-server

  server:
    image: ${DOCKERHUB_USERNAME}/bens-server:latest
    restart: always
    command: ['node', 'dist/server.js']
    env_file: .env
    depends_on:
      - postgres
      - redis

  worker:
    image: ${DOCKERHUB_USERNAME}/bens-server:latest
    restart: always
    command: ['node', 'dist/worker.js']
    env_file: .env
    depends_on:
      - postgres
      - redis

  chat-server:
    image: ${DOCKERHUB_USERNAME}/bens-chat:latest
    restart: always
    command: ['node', 'dist/index.js']
    env_file: .env
    depends_on:
      - mongodb
      - redis

  chat-worker:
    image: ${DOCKERHUB_USERNAME}/bens-chat:latest
    restart: always
    command: ['node', 'dist/worker.js']
    env_file: .env
    volumes:
      - baileys-auth:/app/auth
    depends_on:
      - mongodb
      - redis

  postgres:
    image: postgres:18-alpine
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pg-data:/var/lib/postgresql/data

  mongodb:
    image: mongo:8
    restart: always
    command: ['--replSet', 'rs0', '--bind_ip_all']
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:8-alpine
    restart: always
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis-data:/data

volumes:
  pg-data:
  mongo-data:
  redis-data:
  baileys-auth:
```

- [ ] **Step 3: Create Dockerfile.server (GAP-7: 4 stages)**

> Ref: `ARCHITECTURE-DECISIONS.md` GAP-7 — Dockerfile corrigido com 4 stages: deps → build → prod-deps → runner.

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

- [ ] **Step 4: Create Dockerfile.chat (GAP-7: 4 stages)**

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

- [ ] **Step 5: Create nginx/default.conf**

```nginx
upstream server {
    server server:3001;
}

upstream chat {
    server chat-server:3002;
}

server {
    listen 80;
    server_name api.localhost;

    location /api/v1/ {
        proxy_pass http://server;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /docs {
        proxy_pass http://server;
    }

    location /chat/ {
        proxy_pass http://chat;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /socket.io/ {
        proxy_pass http://chat;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://server;
    }
}
```

- [ ] **Step 6: Create .env.example**

```env
# Database
DATABASE_URL=postgresql://bens:bens_dev@localhost:5432/bens_seguros
MONGODB_URL=mongodb://localhost:27017/bens_chat?replicaSet=rs0
REDIS_URL=redis://:bens_dev@localhost:6379

# Auth
AUTH_SECRET=your-auth-secret-at-least-32-characters-long
SOCKET_JWT_SECRET=your-socket-jwt-secret

# URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
CHAT_SERVER_URL=http://localhost:3002
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CHAT_SERVER_URL=http://localhost:3002

# Storage (Cloudflare R2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=bens-seguros
R2_PUBLIC_URL=

# AI (multi-provider)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Email
RESEND_API_KEY=

# WhatsApp (Meta fallback)
META_WHATSAPP_TOKEN=
META_WHATSAPP_VERIFY_TOKEN=
META_WHATSAPP_PHONE_NUMBER_ID=

# Monitoring
SENTRY_DSN=

# Security (SEC-1: PII encryption)
ENCRYPTION_KEY=your-encryption-key-at-least-32-characters
```

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml docker-compose.prod.yml Dockerfile.server Dockerfile.chat nginx/ .env.example
git commit -m "feat: add docker compose (dev + prod), dockerfiles, nginx config"
```

---

## Task 15: GitHub Actions CI/CD

> **Ref:** `ESPECIFICACAO-FINAL.md` sec.4 (CI/CD flow, deploy order). `ARCHITECTURE-DECISIONS.md` (GAP-2: prisma migrate deploy antes de restart). `_reference/bens-seguros/` contem workflows funcionais como referencia.

**Files:**

- Create: `.github/workflows/ci.yml`
- Create: `.github/workflows/deploy-server.yml`
- Create: `.github/workflows/deploy-chat.yml`

- [ ] **Step 1: Create ci.yml (PR validation)**

```yaml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build
      - run: pnpm test
```

- [ ] **Step 2: Create deploy-server.yml**

```yaml
name: Deploy Server

on:
  push:
    branches: [main]
    paths:
      - 'apps/server/**'
      - 'apps/worker/**'
      - 'packages/core/**'
      - 'packages/db/**'
      - 'packages/auth/**'
      - 'packages/env/**'
      - 'packages/shared/**'
      - 'Dockerfile.server'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: Dockerfile.server
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/bens-server:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/bens-server:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/bens-seguros
            docker compose -f docker-compose.prod.yml pull server
            docker compose -f docker-compose.prod.yml up -d server worker
```

- [ ] **Step 3: Create deploy-chat.yml**

```yaml
name: Deploy Chat

on:
  push:
    branches: [main]
    paths:
      - 'apps/chat-server/**'
      - 'apps/chat-worker/**'
      - 'packages/db-chat/**'
      - 'packages/ai/**'
      - 'packages/env/**'
      - 'packages/shared/**'
      - 'Dockerfile.chat'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: Dockerfile.chat
          push: true
          tags: |
            ${{ secrets.DOCKERHUB_USERNAME }}/bens-chat:latest
            ${{ secrets.DOCKERHUB_USERNAME }}/bens-chat:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/bens-seguros
            docker compose -f docker-compose.prod.yml pull chat-server
            docker compose -f docker-compose.prod.yml up -d chat-server chat-worker
```

- [ ] **Step 4: Commit**

```bash
git add .github/
git commit -m "feat: add github actions ci/cd for server and chat deployments"
```

---

## Task 16: Husky + lint-staged

**Files:**

- Create: `.husky/pre-commit`
- Modify: `package.json` (add lint-staged config)

- [ ] **Step 1: Install husky + lint-staged**

```bash
pnpm add -Dw husky lint-staged
pnpm exec husky init
```

- [ ] **Step 2: Create pre-commit hook**

`.husky/pre-commit`:

```bash
pnpm exec lint-staged
```

- [ ] **Step 3: Add lint-staged config to root package.json**

Add to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add .husky/ package.json
git commit -m "chore: add husky pre-commit with lint-staged"
```

---

## Task 17: Validate Full Setup

- [ ] **Step 1: Install all dependencies**

```bash
pnpm install
```

Expected: no errors, all workspaces resolved.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors across all packages and apps.

- [ ] **Step 3: Start Docker containers**

```bash
docker compose up -d
```

Expected: postgres, mongodb, redis all healthy.

- [ ] **Step 4: Run dev servers**

```bash
pnpm dev
```

Expected: web on :3000, server on :3001, chat-server on :3002 all running.

- [ ] **Step 5: Verify health endpoints**

```bash
curl http://localhost:3001/health
curl http://localhost:3002/health
```

Expected: `{"status":"ok"}` from both.

- [ ] **Step 6: Verify web app renders**

Open http://localhost:3000 - should show "Bens Seguros" with teal color and Inter font.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: verify full monorepo setup working"
```
