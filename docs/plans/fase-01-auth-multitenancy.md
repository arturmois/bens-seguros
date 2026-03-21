# Fase 1: Auth & Multi-tenancy - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar autenticacao (Better Auth), RBAC (CASL) com 5 roles, e multi-tenancy (Organizations, Members, Invitations) com RLS no PostgreSQL.

**Architecture:** Better Auth gerencia sessoes/cookies. CASL define abilities por role. Cada request passa por middleware chain: authMiddleware -> requireAuth -> tenantMiddleware -> requireAbility. PostgreSQL usa RLS via `app.current_tenant`.

**Tech Stack:** Better Auth 1.0, CASL, Prisma 7, PostgreSQL 18, Next.js 16 middleware, Fastify hooks.

**Spec:** `/home/artur/projects/ESPECIFICACAO-FINAL.md` (Secao 6)

**Depends on:** Fase 0 completa

---

## File Structure

```
packages/
├── db/prisma/schema.prisma          # Add auth + org models
├── auth/src/
│   ├── index.ts                     # Better Auth server config
│   ├── client.ts                    # Better Auth client
│   ├── abilities.ts                 # CASL ability definitions
│   ├── roles.ts                     # Role enum + permissions matrix
│   └── types.ts                     # Auth types
apps/
├── server/src/
│   ├── middlewares/
│   │   ├── auth-middleware.ts       # Extract user from session
│   │   ├── tenant-middleware.ts     # Extract + validate org
│   │   └── ability-middleware.ts    # CASL authorization
│   ├── routes/
│   │   ├── auth-routes.ts           # Better Auth catch-all
│   │   ├── v1/
│   │   │   ├── tenant-routes.ts     # Org lookup
│   │   │   └── user-routes.ts       # User management
│   ├── handlers/
│   │   ├── auth.handlers.ts
│   │   ├── tenant.handlers.ts
│   │   └── user.handlers.ts
│   └── schemas/
│       ├── auth.schemas.ts
│       ├── tenant.schemas.ts
│       └── user.schemas.ts
├── web/src/
│   ├── lib/
│   │   ├── auth.ts                  # Better Auth server instance
│   │   ├── auth-client.ts           # Better Auth client instance
│   │   └── permissions.ts           # Frontend RBAC matrix
│   ├── proxy.ts                     # Next.js middleware (route protection)
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   └── (dashboard)/
│   │       └── layout.tsx           # Authenticated layout shell
│   ├── features/
│   │   └── auth/
│   │       ├── components/
│   │       │   ├── login-form.tsx
│   │       │   ├── register-form.tsx
│   │       │   └── org-switcher.tsx
│   │       └── hooks/
│   │           └── use-auth.ts
│   ├── components/
│   │   └── layout/
│   │       ├── app-shell.tsx
│   │       ├── sidebar.tsx
│   │       └── header.tsx
```

---

## Task 1: Prisma Schema - Auth & Organization Models

**Files:**

- Modify: `packages/db/prisma/schema.prisma`

- [ ] **Step 1: Add auth models to schema.prisma**

```prisma
// === ENUMS ===

enum Role {
  OWNER
  ADMIN
  MANAGER
  COMMERCIAL
  VIEWER
}

// === AUTH (Better Auth) ===

model User {
  id                  String    @id @default(cuid())
  email               String    @unique
  name                String
  emailVerified       Boolean   @default(false)
  image               String?
  isSuperAdmin        Boolean   @default(false)
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  sessions            Session[]
  accounts            Account[]
  members             Member[]
}

model Session {
  id                    String    @id @default(cuid())
  token                 String    @unique
  expiresAt             DateTime
  ipAddress             String?
  userAgent             String?
  activeOrganizationId  String?
  userId                String
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

model Account {
  id              String    @id @default(cuid())
  accountId       String
  providerId      String
  userId          String
  accessToken     String?
  refreshToken    String?
  idToken         String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope           String?
  password        String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model Verification {
  id          String    @id @default(cuid())
  identifier  String
  value       String
  expiresAt   DateTime
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

// === MULTI-TENANCY ===

model Organization {
  id        String    @id @default(cuid())
  name      String    @unique
  slug      String    @unique
  logo      String?
  active    Boolean   @default(true)
  metadata  Json?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  members     Member[]
  invitations Invitation[]
}

model Member {
  id                String       @id @default(cuid())
  organizationId    String
  userId            String
  role              Role         @default(COMMERCIAL)
  active            Boolean      @default(true)
  commissionSplitPercentage Int? @default(0)
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([organizationId, userId])
  @@index([organizationId])
  @@index([userId])
}

model Invitation {
  id              String       @id @default(cuid())
  organizationId  String
  email           String
  role            Role         @default(COMMERCIAL)
  status          String       @default("pending") // pending, accepted, expired
  expiresAt       DateTime
  invitedBy       String
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([email])
}
```

- [ ] **Step 2: Run prisma generate**

```bash
cd packages/db && pnpm db:generate
```

Expected: Prisma client generated successfully.

- [ ] **Step 3: Run prisma db push**

```bash
cd packages/db && pnpm db:push
```

Expected: Database synced with schema.

- [ ] **Step 4: Commit**

```bash
git add packages/db/
git commit -m "feat: add auth and organization models to prisma schema"
```

---

## Task 2: @repo/auth - Better Auth Config

**Files:**

- Modify: `packages/auth/package.json`
- Create: `packages/auth/src/index.ts`
- Create: `packages/auth/src/client.ts`
- Create: `packages/auth/src/roles.ts`
- Create: `packages/auth/src/types.ts`

- [ ] **Step 1: Update package.json with dependencies**

```json
{
  "name": "@repo/auth",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "exports": {
    ".": "./src/index.ts",
    "./client": "./src/client.ts",
    "./roles": "./src/roles.ts",
    "./abilities": "./src/abilities.ts",
    "./types": "./src/types.ts"
  },
  "dependencies": {
    "@repo/db": "workspace:*",
    "better-auth": "^1.0.0",
    "@casl/ability": "^6.7.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@config/typescript-config": "workspace:*",
    "typescript": "^5.9.0"
  }
}
```

- [ ] **Step 2: Create roles.ts**

```ts
export const ROLES = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  COMMERCIAL: 'COMMERCIAL',
  VIEWER: 'VIEWER',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 5,
  ADMIN: 4,
  MANAGER: 3,
  COMMERCIAL: 2,
  VIEWER: 1,
};

export function isRoleAtLeast(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
```

- [ ] **Step 3: Create types.ts**

```ts
import type { Role } from './roles.js';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  isSuperAdmin: boolean;
}

export interface AuthSession {
  id: string;
  token: string;
  userId: string;
  activeOrganizationId?: string | null;
  expiresAt: Date;
}

export interface AuthMember {
  id: string;
  organizationId: string;
  userId: string;
  role: Role;
  active: boolean;
}

export interface AuthContext {
  user: AuthUser;
  session: AuthSession;
  organizationId: string;
  role: Role;
}
```

- [ ] **Step 4: Create index.ts (Better Auth server)**

```ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import { prisma } from '@repo/db';

export function createAuth(secret: string, baseURL: string) {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret,
    baseURL,
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 min
      },
    },
    plugins: [organization()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
```

- [ ] **Step 5: Create client.ts (Better Auth client)**

```ts
import { createAuthClient } from 'better-auth/client';
import { organizationClient } from 'better-auth/client/plugins';

export function createBetterAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient()],
  });
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/auth/
git commit -m "feat: add better auth config with organization plugin and role system"
```

---

## Task 3: @repo/auth - CASL Abilities

**Files:**

- Create: `packages/auth/src/abilities.ts`

- [ ] **Step 1: Write failing test for abilities**

Create `packages/auth/src/abilities.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { defineAbilitiesFor } from './abilities.js';

describe('CASL Abilities', () => {
  it('OWNER can manage all', () => {
    const ability = defineAbilitiesFor('OWNER');
    expect(ability.can('manage', 'all')).toBe(true);
  });

  it('ADMIN can manage Client but not Organization', () => {
    const ability = defineAbilitiesFor('ADMIN');
    expect(ability.can('manage', 'Client')).toBe(true);
    expect(ability.can('manage', 'Organization')).toBe(false);
  });

  it('MANAGER can manage operations but not Users', () => {
    const ability = defineAbilitiesFor('MANAGER');
    expect(ability.can('manage', 'Client')).toBe(true);
    expect(ability.can('manage', 'Proposal')).toBe(true);
    expect(ability.can('manage', 'User')).toBe(false);
  });

  it('COMMERCIAL can create/read/update clients but not delete', () => {
    const ability = defineAbilitiesFor('COMMERCIAL');
    expect(ability.can('create', 'Client')).toBe(true);
    expect(ability.can('read', 'Client')).toBe(true);
    expect(ability.can('update', 'Client')).toBe(true);
    expect(ability.can('delete', 'Client')).toBe(false);
  });

  it('VIEWER can only read', () => {
    const ability = defineAbilitiesFor('VIEWER');
    expect(ability.can('read', 'Client')).toBe(true);
    expect(ability.can('read', 'Proposal')).toBe(true);
    expect(ability.can('create', 'Client')).toBe(false);
    expect(ability.can('update', 'Client')).toBe(false);
    expect(ability.can('delete', 'Client')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/auth && pnpm vitest run src/abilities.spec.ts
```

Expected: FAIL - module not found.

- [ ] **Step 3: Implement abilities.ts**

```ts
import { AbilityBuilder, createMongoAbility, type MongoAbility } from '@casl/ability';
import type { Role } from './roles.js';

type Action = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'approve';
type Subject =
  | 'all'
  | 'User'
  | 'Organization'
  | 'Client'
  | 'Proposal'
  | 'Policy'
  | 'Claim'
  | 'Commission'
  | 'Endorsement'
  | 'Assistance'
  | 'Document'
  | 'AuditLog'
  | 'Notification';

export type AppAbility = MongoAbility<[Action, Subject]>;

const operationalSubjects: Subject[] = [
  'Client',
  'Proposal',
  'Policy',
  'Claim',
  'Endorsement',
  'Assistance',
  'Document',
];

export function defineAbilitiesFor(role: Role): AppAbility {
  const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  switch (role) {
    case 'OWNER':
      can('manage', 'all');
      break;

    case 'ADMIN':
      can('manage', operationalSubjects);
      can('manage', 'Commission');
      can('approve', 'Commission');
      can('manage', 'User');
      can('manage', 'Notification');
      can('read', 'AuditLog');
      break;

    case 'MANAGER':
      can('manage', operationalSubjects);
      can('manage', 'Commission');
      can('approve', 'Commission');
      can('read', 'Notification');
      can('read', 'AuditLog');
      break;

    case 'COMMERCIAL':
      can(['create', 'read', 'update'], ['Client', 'Proposal']);
      can('read', ['Policy', 'Commission', 'Claim', 'Document']);
      can('read', 'Notification');
      break;

    case 'VIEWER':
      can('read', operationalSubjects);
      can('read', ['Commission', 'Notification']);
      break;
  }

  return build();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/auth && pnpm vitest run src/abilities.spec.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/auth/
git commit -m "feat: add CASL abilities with 5 roles (OWNER, ADMIN, MANAGER, COMMERCIAL, VIEWER)"
```

---

## Task 4: Server Middlewares (Auth, Tenant, Ability)

**Files:**

- Create: `apps/server/src/middlewares/auth-middleware.ts`
- Create: `apps/server/src/middlewares/tenant-middleware.ts`
- Create: `apps/server/src/middlewares/ability-middleware.ts`

- [ ] **Step 1: Create auth-middleware.ts**

```ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Auth } from '@repo/auth';

export function createAuthMiddleware(auth: Auth) {
  return async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
    const session = await auth.api.getSession({
      headers: request.headers as Record<string, string>,
    });

    if (!session) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
    }

    request.user = session.user;
    request.session = session.session;
  };
}

export function requireAuth(request: FastifyRequest, reply: FastifyReply, done: () => void) {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }
  done();
}
```

- [ ] **Step 2: Create tenant-middleware.ts**

```ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@repo/db';

export async function tenantMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const organizationId = request.session?.activeOrganizationId;

  if (!organizationId) {
    return reply.status(400).send({
      success: false,
      error: { code: 'NO_ORGANIZATION', message: 'No active organization selected' },
    });
  }

  const member = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: request.user.id,
      },
    },
  });

  if (!member || !member.active) {
    return reply.status(403).send({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Not a member of this organization' },
    });
  }

  request.organizationId = organizationId;
  request.role = member.role;
}
```

- [ ] **Step 3: Create ability-middleware.ts**

```ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import { defineAbilitiesFor, type AppAbility } from '@repo/auth/abilities';
import type { Role } from '@repo/auth/roles';

export function requireAbility(action: string, subject: string) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const role = request.role as Role;

    if (!role) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'No role assigned' },
      });
    }

    const ability: AppAbility = defineAbilitiesFor(role);

    if (!ability.can(action as never, subject as never)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Insufficient permissions: ${action} ${subject}`,
        },
      });
    }
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/middlewares/
git commit -m "feat: add auth, tenant, and ability middlewares for fastify"
```

---

## Task 5: Server Auth Routes

**Files:**

- Create: `apps/server/src/routes/auth-routes.ts`
- Create: `apps/server/src/routes/v1/tenant-routes.ts`
- Create: `apps/server/src/routes/v1/user-routes.ts`
- Modify: `apps/server/src/app.ts` (register routes)

- [ ] **Step 1: Create auth-routes.ts (Better Auth catch-all)**

```ts
import type { FastifyInstance } from 'fastify';
import type { Auth } from '@repo/auth';

export function registerAuthRoutes(app: FastifyInstance, auth: Auth) {
  app.all('/api/auth/*', async (request, reply) => {
    const response = await auth.handler(request.raw, reply.raw);
    return response;
  });
}
```

- [ ] **Step 2: Create tenant-routes.ts**

```ts
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@repo/db';

export async function tenantRoutes(app: FastifyInstance) {
  app.get(
    '/api/v1/tenants',
    {
      schema: {
        response: {
          200: z.object({
            success: z.literal(true),
            data: z.array(
              z.object({
                id: z.string(),
                name: z.string(),
                slug: z.string(),
                logo: z.string().nullable(),
                role: z.string(),
              }),
            ),
          }),
        },
      },
    },
    async (request) => {
      const members = await prisma.member.findMany({
        where: { userId: request.user.id, active: true },
        include: { organization: true },
      });

      return {
        success: true as const,
        data: members.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          logo: m.organization.logo,
          role: m.role,
        })),
      };
    },
  );
}
```

- [ ] **Step 3: Register routes in app.ts**

Add route registration to `apps/server/src/app.ts` after middleware setup:

```ts
// Add after existing setup:
import { registerAuthRoutes } from './routes/auth-routes.js';
import { tenantRoutes } from './routes/v1/tenant-routes.js';
import { createAuth } from '@repo/auth';

// Inside buildApp():
const auth = createAuth(
  process.env.AUTH_SECRET ?? 'dev-secret-at-least-32-characters-long!!',
  process.env.API_URL ?? 'http://localhost:3001',
);

registerAuthRoutes(app, auth);
await app.register(tenantRoutes);
```

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/
git commit -m "feat: add auth routes, tenant routes, and better auth integration"
```

---

## Task 6: Frontend - Auth Pages (Login, Register)

**Files:**

- Create: `apps/web/src/lib/auth.ts`
- Create: `apps/web/src/lib/auth-client.ts`
- Create: `apps/web/src/lib/permissions.ts`
- Create: `apps/web/src/features/auth/components/login-form.tsx`
- Create: `apps/web/src/features/auth/components/register-form.tsx`
- Create: `apps/web/src/features/auth/hooks/use-auth.ts`
- Create: `apps/web/src/app/(auth)/layout.tsx`
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Create auth-client.ts**

```ts
import { createBetterAuthClient } from '@repo/auth/client';

export const authClient = createBetterAuthClient(
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
);
```

- [ ] **Step 2: Create use-auth.ts hook**

```ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: () => authClient.getSession(),
    retry: false,
  });

  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authClient.signIn.email({ email, password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      router.push('/');
    },
  });

  const register = useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      authClient.signUp.email({ email, password, name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      router.push('/');
    },
  });

  const logout = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });

  return {
    user: session.data?.user ?? null,
    session: session.data?.session ?? null,
    isLoading: session.isLoading,
    isAuthenticated: !!session.data?.user,
    login,
    register,
    logout,
  };
}
```

- [ ] **Step 3: Create permissions.ts (frontend RBAC)**

```ts
import type { Role } from '@repo/auth/roles';

const PERMISSION_MATRIX: Record<string, Role[]> = {
  'clients:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
  'clients:create': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL'],
  'clients:update': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL'],
  'clients:delete': ['OWNER', 'ADMIN', 'MANAGER'],
  'proposals:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
  'proposals:create': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL'],
  'proposals:update': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL'],
  'proposals:delete': ['OWNER', 'ADMIN', 'MANAGER'],
  'policies:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
  'policies:create': ['OWNER', 'ADMIN', 'MANAGER'],
  'commissions:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
  'commissions:approve': ['OWNER', 'ADMIN', 'MANAGER'],
  'claims:read': ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
  'claims:create': ['OWNER', 'ADMIN', 'MANAGER'],
  'users:read': ['OWNER', 'ADMIN'],
  'users:manage': ['OWNER', 'ADMIN'],
  'settings:read': ['OWNER', 'ADMIN'],
  'settings:manage': ['OWNER'],
  'audit:read': ['OWNER', 'ADMIN', 'MANAGER'],
};

export function hasPermission(role: Role, permission: string): boolean {
  return PERMISSION_MATRIX[permission]?.includes(role) ?? false;
}

export function hasAnyPermission(role: Role, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: string[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}
```

- [ ] **Step 4: Create login-form.tsx**

```tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(8, 'Minimo 8 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { login } = useAuth();
  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginForm) => {
    login.mutate(data, {
      onError: () => toast.error('Email ou senha incorretos'),
    });
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          {...form.register('email')}
          type="email"
          id="email"
          className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
          placeholder="seu@email.com"
        />
        {form.formState.errors.email && (
          <p className="mt-1 text-sm text-[var(--destructive)]">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-medium">
          Senha
        </label>
        <input
          {...form.register('password')}
          type="password"
          id="password"
          className="mt-1 block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
        />
        {form.formState.errors.password && (
          <p className="mt-1 text-sm text-[var(--destructive)]">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Create auth layout and pages**

`apps/web/src/app/(auth)/layout.tsx`:

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--muted)]">
      <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <div className="mb-6 text-center">
          <h1 className="text-primary-600 text-2xl font-semibold">Bens Seguros</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
```

`apps/web/src/app/(auth)/login/page.tsx`:

```tsx
import { LoginForm } from '@/features/auth/components/login-form';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <>
      <LoginForm />
      <p className="mt-4 text-center text-sm text-[var(--muted-foreground)]">
        Nao tem conta?{' '}
        <Link href="/register" className="text-[var(--primary)] hover:underline">
          Cadastre-se
        </Link>
      </p>
    </>
  );
}
```

- [ ] **Step 6: Create Next.js middleware for route protection**

`apps/web/src/middleware.ts`:

```ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('better-auth.session_token')?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/
git commit -m "feat: add auth pages (login, register), permissions, route protection"
```

---

## Task 7: Frontend - App Shell (Sidebar, Header)

**Files:**

- Create: `apps/web/src/components/layout/app-shell.tsx`
- Create: `apps/web/src/components/layout/sidebar.tsx`
- Create: `apps/web/src/components/layout/header.tsx`
- Create: `apps/web/src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Create sidebar.tsx**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  FileText,
  Shield,
  AlertTriangle,
  DollarSign,
  MessageSquare,
  LayoutDashboard,
  Settings,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import type { Role } from '@repo/auth/roles';

interface SidebarProps {
  role: Role;
  collapsed: boolean;
}

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, permission: null },
  { href: '/clients', label: 'Clientes', icon: Users, permission: 'clients:read' },
  { href: '/proposals', label: 'Propostas', icon: FileText, permission: 'proposals:read' },
  { href: '/policies', label: 'Apolices', icon: Shield, permission: 'policies:read' },
  { href: '/claims', label: 'Sinistros', icon: AlertTriangle, permission: 'claims:read' },
  { href: '/commissions', label: 'Comissoes', icon: DollarSign, permission: 'commissions:read' },
  { href: '/chat', label: 'Chat', icon: MessageSquare, permission: null },
  { href: '/audit', label: 'Auditoria', icon: ClipboardList, permission: 'audit:read' },
  { href: '/settings', label: 'Configuracoes', icon: Settings, permission: 'settings:read' },
];

export function Sidebar({ role, collapsed }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.permission || hasPermission(role, item.permission),
  );

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-[var(--border)] bg-[var(--card)] transition-all',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      <div className="flex h-14 items-center border-b border-[var(--border)] px-4">
        {!collapsed && <span className="text-primary-600 text-lg font-semibold">Bens</span>}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]',
              )}
            >
              <item.icon className="size-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 2: Create header.tsx**

```tsx
'use client';

import { useAuth } from '@/features/auth/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { LogOut, PanelLeftClose, PanelLeft } from 'lucide-react';

interface HeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({ collapsed, onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-[var(--card)] px-4">
      <Button variant="ghost" size="icon" onClick={onToggleSidebar}>
        {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
      </Button>

      <div className="flex items-center gap-4">
        <span className="text-sm text-[var(--muted-foreground)]">{user?.name}</span>
        <Button variant="ghost" size="icon" onClick={() => logout.mutate()}>
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Create app-shell.tsx**

```tsx
'use client';

import { useState } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import type { Role } from '@repo/auth/roles';

interface AppShellProps {
  role: Role;
  children: React.ReactNode;
}

export function AppShell({ role, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} collapsed={collapsed} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header collapsed={collapsed} onToggleSidebar={() => setCollapsed((c) => !c)} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create dashboard layout**

`apps/web/src/app/(dashboard)/layout.tsx`:

```tsx
import { AppShell } from '@/components/layout/app-shell';
// Role will be fetched from session in a later task
// For now, default to VIEWER

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="MANAGER">{children}</AppShell>;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/
git commit -m "feat: add app shell with sidebar, header, and role-based navigation"
```

---

## Task 8: Validate Auth Flow End-to-End

- [ ] **Step 1: Start all services**

```bash
docker compose up -d
pnpm dev
```

- [ ] **Step 2: Run prisma db push to create tables**

```bash
cd packages/db && pnpm db:push
```

- [ ] **Step 3: Test register flow**

Open http://localhost:3000/register - create account.

- [ ] **Step 4: Test login flow**

Open http://localhost:3000/login - login with created account.

- [ ] **Step 5: Test route protection**

Visit http://localhost:3000/ without session - should redirect to /login.

- [ ] **Step 6: Run all quality gates**

```bash
pnpm lint && pnpm typecheck && pnpm build && pnpm test
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: validate auth flow end-to-end"
```
