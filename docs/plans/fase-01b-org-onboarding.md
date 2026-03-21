# Organization Onboarding & Management - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar fluxo de criação/seleção de organização, org switcher no sidebar, e redirecionamentos condicionais pós-login/registro.

**Architecture:** Better Auth organization plugin gerencia CRUD de orgs. Cookie custom `bens-active-org` permite check otimista no proxy.ts. Hook `useOrgs` centraliza estado de orgs no frontend. Sidebar usa OrgSwitcher no topo.

**Tech Stack:** Better Auth organization plugin, React Query, shadcn/ui Popover, Next.js 16 proxy.ts

**Spec:** `docs/superpowers/specs/2026-03-21-org-onboarding-design.md`

**Depends on:** Fase 1 completa (auth, CASL, middlewares, auth pages, app shell)

---

## File Structure

```
packages/auth/src/
├── index.ts                            # Modify: add organization({ creatorRole, memberRoleValues })

apps/web/src/
├── proxy.ts                            # Modify: add org-active cookie check
├── lib/
│   ├── org-cookie.ts                   # Create: setActiveOrgCookie / clearActiveOrgCookie
│   └── org-avatar.ts                   # Create: getOrgInitials / getOrgColor
├── features/
│   └── org/
│       ├── hooks/
│       │   └── use-orgs.ts             # Create: useOrgs hook (list, activeOrg, switchOrg)
│       └── components/
│           ├── create-org-form.tsx      # Create: onboarding form (name + slug)
│           ├── org-card.tsx             # Create: reusable org card (select-org page)
│           └── org-switcher.tsx         # Create: sidebar dropdown
├── components/layout/
│   ├── sidebar.tsx                     # Modify: replace "Bens" header with OrgSwitcher
│   └── dashboard-shell.tsx             # Create: client wrapper resolving real role
├── app/
│   ├── (onboarding)/
│   │   ├── layout.tsx                  # Create: centered clean layout
│   │   ├── onboarding/
│   │   │   └── page.tsx                # Create: create org page
│   │   ├── select-org/
│   │   │   └── page.tsx                # Create: select org page
│   │   └── accept-invitation/
│   │       └── page.tsx                # Create: accept invitation page
│   └── (dashboard)/
│       └── layout.tsx                  # Modify: use DashboardShell
├── features/auth/hooks/
│   └── use-auth.ts                     # Modify: post-login/register redirect logic + cookie
```

---

## Task 1: Better Auth Organization Plugin Config

**Files:**

- Modify: `packages/auth/src/index.ts`

- [ ] **Step 1: Update organization plugin config**

```ts
// packages/auth/src/index.ts
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { organization } from 'better-auth/plugins';
import { prisma } from '@repo/db';

export function createAuth(secret: string, baseURL: string, trustedOrigins: string[]) {
  return betterAuth({
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    secret,
    baseURL,
    trustedOrigins,
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
    plugins: [
      organization({
        creatorRole: 'OWNER',
        memberRoleValues: ['OWNER', 'ADMIN', 'MANAGER', 'COMMERCIAL', 'VIEWER'],
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
```

- [ ] **Step 2: Verify typecheck passes**

```bash
pnpm --filter @repo/auth typecheck
```

If `creatorRole` or `memberRoleValues` are not accepted by the Better Auth types, use the fallback hook approach from the spec.

- [ ] **Step 3: Commit**

```bash
git add packages/auth/
git commit -m "feat: configure organization plugin with custom role values"
```

---

## Task 2: Org Cookie Helper + Org Avatar Utilities

**Files:**

- Create: `apps/web/src/lib/org-cookie.ts`
- Create: `apps/web/src/lib/org-avatar.ts`

- [ ] **Step 1: Create org-cookie.ts**

```ts
// apps/web/src/lib/org-cookie.ts

const COOKIE_NAME = 'bens-active-org';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function setActiveOrgCookie(organizationId: string) {
  document.cookie = `${COOKIE_NAME}=${organizationId};path=/;max-age=${MAX_AGE};samesite=lax`;
}

export function clearActiveOrgCookie() {
  document.cookie = `${COOKIE_NAME}=;path=/;max-age=0`;
}
```

- [ ] **Step 2: Create org-avatar.ts**

```ts
// apps/web/src/lib/org-avatar.ts

const COLORS = [
  '#0d4f4f',
  '#6b5b95',
  '#d4a843',
  '#c0392b',
  '#2980b9',
  '#27ae60',
  '#8e44ad',
  '#e67e22',
  '#1abc9c',
  '#34495e',
];

export function getOrgInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

export function getOrgColor(id: string): string {
  let hash = 0;
  for (const char of id) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index] ?? COLORS[0];
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/org-cookie.ts apps/web/src/lib/org-avatar.ts
git commit -m "feat: add org cookie helper and avatar utilities"
```

---

## Task 3: useOrgs Hook

**Files:**

- Create: `apps/web/src/features/org/hooks/use-orgs.ts`

- [ ] **Step 1: Create use-orgs.ts**

```ts
// apps/web/src/features/org/hooks/use-orgs.ts
'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { setActiveOrgCookie } from '@/lib/org-cookie';
import type { Role } from '@repo/auth/roles';

export interface Org {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  role: Role;
}

export function useOrgs() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session, isAuthenticated } = useAuth();

  const orgsQuery = useQuery({
    queryKey: ['orgs'],
    queryFn: async (): Promise<Org[]> => {
      const response = await authClient.organization.list();
      if (response.error) {
        return [];
      }
      return (response.data ?? []).map((org) => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo ?? null,
        role: (org.members?.[0]?.role ?? 'VIEWER') as Role,
      }));
    },
    enabled: isAuthenticated,
  });

  const activeOrgId = session?.activeOrganizationId;
  const activeOrg = orgsQuery.data?.find((org) => org.id === activeOrgId) ?? null;

  async function switchOrg(organizationId: string) {
    await authClient.organization.setActive({ organizationId });
    setActiveOrgCookie(organizationId);
    queryClient.clear();
    router.push('/');
  }

  return {
    orgs: orgsQuery.data ?? [],
    activeOrg,
    isLoading: orgsQuery.isLoading,
    switchOrg,
  };
}
```

**Note:** The `organization.list()` response shape may vary. During implementation, inspect the actual response and adjust the mapping accordingly. The `role` field location depends on whether Better Auth returns it as `members[0].role` or as a top-level `role` field.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/features/org/
git commit -m "feat: add useOrgs hook for org listing and switching"
```

---

## Task 4: Proxy.ts — Add Org Active Check

**Files:**

- Modify: `apps/web/src/proxy.ts`

- [ ] **Step 1: Update proxy.ts**

```ts
// apps/web/src/proxy.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth'];
const AUTH_ONLY_PATHS = ['/onboarding', '/select-org', '/accept-invitation'];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Public routes — no check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 2. No session — redirect to login
  const sessionToken = request.cookies.get('better-auth.session_token')?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 3. Auth-only routes (need session, not org) — pass through
  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 4. No active org cookie — redirect to select-org
  const activeOrg = request.cookies.get('bens-active-org')?.value;
  if (!activeOrg) {
    return NextResponse.redirect(new URL('/select-org', request.url));
  }

  // 5. All checks passed
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/proxy.ts
git commit -m "feat: add org-active cookie check to proxy.ts"
```

---

## Task 5: Onboarding Layout + Create Org Page

**Files:**

- Create: `apps/web/src/app/(onboarding)/layout.tsx`
- Create: `apps/web/src/features/org/components/create-org-form.tsx`
- Create: `apps/web/src/app/(onboarding)/onboarding/page.tsx`

- [ ] **Step 1: Create onboarding layout**

```tsx
// apps/web/src/app/(onboarding)/layout.tsx
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted flex min-h-dvh items-center justify-center">
      <div className="w-full max-w-lg p-4">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create create-org-form.tsx**

```tsx
// apps/web/src/features/org/components/create-org-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { authClient } from '@/lib/auth-client';
import { setActiveOrgCookie } from '@/lib/org-cookie';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, X, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

const createOrgSchema = z.object({
  name: z.string().min(2, 'Mínimo 2 caracteres'),
  slug: z
    .string()
    .min(3, 'Mínimo 3 caracteres')
    .regex(/^[a-z0-9-]+$/, 'Apenas letras minúsculas, números e hífens'),
});

type CreateOrgFormData = z.infer<typeof createOrgSchema>;

function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function CreateOrgForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const form = useForm<CreateOrgFormData>({
    resolver: zodResolver(createOrgSchema),
    defaultValues: { name: '', slug: '' },
  });

  const nameValue = form.watch('name');
  const slugValue = form.watch('slug');
  const debouncedSlug = useDebounce(slugValue, 500);

  // Auto-generate slug from name
  useEffect(() => {
    if (nameValue) {
      form.setValue('slug', slugify(nameValue), { shouldValidate: true });
    }
  }, [nameValue, form]);

  // Check slug uniqueness
  useEffect(() => {
    if (!debouncedSlug || debouncedSlug.length < 3) {
      setSlugStatus('idle');
      return;
    }
    setSlugStatus('checking');
    authClient.organization
      .checkSlug({ slug: debouncedSlug })
      .then((res) => {
        setSlugStatus(res.data?.available ? 'available' : 'taken');
      })
      .catch(() => setSlugStatus('idle'));
  }, [debouncedSlug]);

  const onSubmit = async (data: CreateOrgFormData) => {
    if (slugStatus === 'taken') {
      toast.error('Este identificador já está em uso');
      return;
    }
    setIsSubmitting(true);
    try {
      const createRes = await authClient.organization.create({
        name: data.name,
        slug: data.slug,
      });
      if (createRes.error) {
        toast.error('Erro ao criar organização');
        return;
      }
      const orgId = createRes.data?.id;
      if (orgId) {
        await authClient.organization.setActive({ organizationId: orgId });
        setActiveOrgCookie(orgId);
      }
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      router.push('/');
    } catch {
      toast.error('Erro ao criar organização');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border p-8 shadow-sm">
      <div className="mb-6 text-center">
        <p className="text-primary text-sm font-semibold uppercase tracking-wide">Passo 2 de 2</p>
        <h2 className="mt-1 text-xl font-semibold">Configure sua corretora</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Estas informações podem ser alteradas depois
        </p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da corretora *</Label>
          <Input {...form.register('name')} id="name" placeholder="Ex: Corretora ABC Seguros" />
          {form.formState.errors.name && (
            <p className="text-destructive text-sm">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Identificador (slug)</Label>
          <div className="flex items-center overflow-hidden rounded-md border">
            <span className="bg-muted text-muted-foreground border-r px-3 py-2 text-sm">
              bens.app/
            </span>
            <Input {...form.register('slug')} id="slug" className="rounded-none border-0" />
            <span className="px-3">
              {slugStatus === 'checking' && (
                <Loader2 className="text-muted-foreground size-4 animate-spin" />
              )}
              {slugStatus === 'available' && <Check className="size-4 text-green-600" />}
              {slugStatus === 'taken' && <X className="size-4 text-red-600" />}
            </span>
          </div>
          {form.formState.errors.slug && (
            <p className="text-destructive text-sm">{form.formState.errors.slug.message}</p>
          )}
          {slugStatus === 'taken' && (
            <p className="text-destructive text-sm">Este identificador já está em uso</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || slugStatus === 'taken'}>
          {isSubmitting ? 'Criando...' : 'Criar corretora'}
        </Button>

        <p className="text-muted-foreground text-center text-xs">
          Você será o administrador (Owner) desta organização
        </p>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Create useDebounce hook** (if not already existing)

```ts
// apps/web/src/hooks/use-debounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

- [ ] **Step 4: Create onboarding page**

```tsx
// apps/web/src/app/(onboarding)/onboarding/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CreateOrgForm } from '@/features/org/components/create-org-form';
import { useOrgs } from '@/features/org/hooks/use-orgs';

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { orgs, isLoading } = useOrgs();
  const isNewOrg = searchParams.get('new') === 'true';

  // Guard: if already has org and not creating new, redirect to dashboard
  useEffect(() => {
    if (!isLoading && orgs.length > 0 && !isNewOrg) {
      router.replace('/');
    }
  }, [isLoading, orgs.length, isNewOrg, router]);

  if (isLoading) {
    return null;
  }

  return <CreateOrgForm />;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(onboarding\)/ apps/web/src/features/org/components/create-org-form.tsx apps/web/src/hooks/use-debounce.ts
git commit -m "feat: add onboarding layout and create org page"
```

---

## Task 6: Select Org Page

**Files:**

- Create: `apps/web/src/features/org/components/org-card.tsx`
- Create: `apps/web/src/app/(onboarding)/select-org/page.tsx`

- [ ] **Step 1: Create org-card.tsx**

```tsx
// apps/web/src/features/org/components/org-card.tsx
'use client';

import { getOrgInitials, getOrgColor } from '@/lib/org-avatar';
import { ChevronRight } from 'lucide-react';
import type { Org } from '@/features/org/hooks/use-orgs';

interface OrgCardProps {
  org: Org;
  onClick: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-primary/10 text-primary',
  ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  COMMERCIAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  VIEWER: 'bg-muted text-muted-foreground',
};

export function OrgCard({ org, onClick }: OrgCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border hover:border-primary focus-visible:ring-ring flex w-full items-center gap-4 rounded-lg border bg-white p-4 text-left transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 dark:bg-transparent"
    >
      <div
        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
        style={{ backgroundColor: getOrgColor(org.id) }}
      >
        {getOrgInitials(org.name)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{org.name}</div>
        <div className="text-muted-foreground text-xs">{org.slug}</div>
      </div>
      <span
        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[org.role] ?? ROLE_COLORS.VIEWER}`}
      >
        {org.role}
      </span>
      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
    </button>
  );
}
```

- [ ] **Step 2: Create select-org page**

```tsx
// apps/web/src/app/(onboarding)/select-org/page.tsx
'use client';

import { useEffect } from 'react';
import { useOrgs } from '@/features/org/hooks/use-orgs';
import { OrgCard } from '@/features/org/components/org-card';
import { useRouter } from 'next/navigation';

export default function SelectOrgPage() {
  const { orgs, isLoading, switchOrg } = useOrgs();
  const router = useRouter();

  // Auto-select if user has exactly 1 org
  useEffect(() => {
    if (!isLoading && orgs.length === 1 && orgs[0]) {
      switchOrg(orgs[0].id);
    }
  }, [isLoading, orgs, switchOrg]);

  // No orgs — redirect to onboarding
  useEffect(() => {
    if (!isLoading && orgs.length === 0) {
      router.replace('/onboarding');
    }
  }, [isLoading, orgs.length, router]);

  if (isLoading || orgs.length <= 1) {
    return null;
  }

  return (
    <div className="bg-card rounded-lg border p-8 shadow-sm">
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold">Selecione uma organização</h2>
        <p className="text-muted-foreground mt-1 text-sm">Escolha a corretora que deseja acessar</p>
      </div>

      <div className="space-y-3">
        {orgs.map((org) => (
          <OrgCard key={org.id} org={org} onClick={() => switchOrg(org.id)} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/org/components/org-card.tsx apps/web/src/app/\(onboarding\)/select-org/
git commit -m "feat: add select-org page with auto-selection for single org"
```

---

## Task 7: Accept Invitation Page

**Files:**

- Create: `apps/web/src/app/(onboarding)/accept-invitation/page.tsx`

- [ ] **Step 1: Create accept-invitation page**

```tsx
// apps/web/src/app/(onboarding)/accept-invitation/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { setActiveOrgCookie } from '@/lib/org-cookie';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const invitationId = searchParams.get('id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.replace(`/login?invitationId=${invitationId}`);
      return;
    }

    if (!invitationId) {
      setStatus('error');
      setErrorMessage('Link de convite inválido');
      return;
    }

    authClient.organization
      .acceptInvitation({ invitationId })
      .then(async (res) => {
        if (res.error) {
          setStatus('error');
          setErrorMessage('Convite expirado ou já aceito');
          return;
        }
        // Set active org to the invitation's org
        const member = res.data;
        if (member?.organizationId) {
          await authClient.organization.setActive({ organizationId: member.organizationId });
          setActiveOrgCookie(member.organizationId);
        }
        queryClient.clear();
        setStatus('success');
        router.push('/');
      })
      .catch(() => {
        setStatus('error');
        setErrorMessage('Erro ao aceitar convite');
      });
  }, [authLoading, isAuthenticated, invitationId, router, queryClient]);

  if (status === 'loading' || authLoading) {
    return (
      <div className="bg-card flex flex-col items-center rounded-lg border p-8 shadow-sm">
        <Loader2 className="text-primary size-8 animate-spin" />
        <p className="text-muted-foreground mt-4 text-sm">Aceitando convite...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="bg-card rounded-lg border p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold">Convite inválido</h2>
        <p className="text-muted-foreground mt-2 text-sm">{errorMessage}</p>
        <Button className="mt-4" onClick={() => router.push('/login')}>
          Ir para login
        </Button>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/\(onboarding\)/accept-invitation/
git commit -m "feat: add accept-invitation page"
```

---

## Task 8: Org Switcher Component

**Files:**

- Create: `apps/web/src/features/org/components/org-switcher.tsx`
- Modify: `apps/web/src/components/layout/sidebar.tsx`

- [ ] **Step 1: Create org-switcher.tsx**

```tsx
// apps/web/src/features/org/components/org-switcher.tsx
'use client';

import { useState } from 'react';
import { useOrgs, type Org } from '@/features/org/hooks/use-orgs';
import { getOrgInitials, getOrgColor } from '@/lib/org-avatar';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRouter } from 'next/navigation';

interface OrgSwitcherProps {
  collapsed: boolean;
}

export function OrgSwitcher({ collapsed }: OrgSwitcherProps) {
  const { orgs, activeOrg, switchOrg } = useOrgs();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  function handleSwitch(org: Org) {
    setOpen(false);
    if (org.id !== activeOrg?.id) {
      switchOrg(org.id);
    }
  }

  function handleCreateNew() {
    setOpen(false);
    router.push('/onboarding?new=true');
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'hover:bg-muted flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors',
            collapsed && 'justify-center px-0',
          )}
        >
          {activeOrg && (
            <>
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ backgroundColor: getOrgColor(activeOrg.id) }}
              >
                {getOrgInitials(activeOrg.name)}
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{activeOrg.name}</div>
                    <div className="text-muted-foreground text-xs">{activeOrg.role}</div>
                  </div>
                  <ChevronsUpDown className="text-muted-foreground size-4 shrink-0" />
                </>
              )}
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-2"
        align={collapsed ? 'start' : 'center'}
        side={collapsed ? 'right' : 'bottom'}
      >
        <div className="space-y-1">
          {orgs.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => handleSwitch(org)}
              className={cn(
                'hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                org.id === activeOrg?.id && 'bg-muted',
              )}
            >
              <div
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                style={{ backgroundColor: getOrgColor(org.id) }}
              >
                {getOrgInitials(org.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{org.name}</div>
                <div className="text-muted-foreground text-xs">{org.role}</div>
              </div>
              {org.id === activeOrg?.id && <Check className="text-primary size-4 shrink-0" />}
            </button>
          ))}
        </div>

        <div className="border-border mt-1 border-t pt-1">
          <button
            type="button"
            onClick={handleCreateNew}
            className="text-primary hover:bg-muted flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors"
          >
            <div className="border-primary flex size-7 shrink-0 items-center justify-center rounded-md border-2 border-dashed">
              <Plus className="size-3.5" />
            </div>
            <span className="font-medium">Criar nova organização</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 2: Update sidebar.tsx — replace "Bens" header with OrgSwitcher**

Replace the header section in `apps/web/src/components/layout/sidebar.tsx`:

```tsx
// Change the header div (lines 56-58) from:
<div className="flex h-14 items-center border-b px-4">
  {!collapsed && <span className="text-primary text-lg font-semibold">Bens</span>}
</div>

// To:
<OrgSwitcher collapsed={collapsed} />
```

Add the import at the top:

```ts
import { OrgSwitcher } from '@/features/org/components/org-switcher';
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/org/components/org-switcher.tsx apps/web/src/components/layout/sidebar.tsx
git commit -m "feat: add org switcher component and integrate into sidebar"
```

---

## Task 9: Dashboard Shell + Updated Auth Hook

**Files:**

- Create: `apps/web/src/components/layout/dashboard-shell.tsx`
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`
- Modify: `apps/web/src/features/auth/hooks/use-auth.ts`

- [ ] **Step 1: Create dashboard-shell.tsx**

```tsx
// apps/web/src/components/layout/dashboard-shell.tsx
'use client';

import { AppShell } from '@/components/layout/app-shell';
import { useOrgs } from '@/features/org/hooks/use-orgs';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { activeOrg, isLoading } = useOrgs();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  return <AppShell role={activeOrg?.role ?? 'VIEWER'}>{children}</AppShell>;
}
```

- [ ] **Step 2: Update dashboard layout**

```tsx
// apps/web/src/app/(dashboard)/layout.tsx
import { DashboardShell } from '@/components/layout/dashboard-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
```

- [ ] **Step 3: Update use-auth.ts — add post-login/register redirect logic**

```ts
// apps/web/src/features/auth/hooks/use-auth.ts
'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { setActiveOrgCookie, clearActiveOrgCookie } from '@/lib/org-cookie';

async function fetchSession() {
  const response = await authClient.getSession();
  if (response.error) {
    return null;
  }
  return response.data;
}

export function useAuth() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: fetchSession,
    retry: false,
  });

  const login = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authClient.signIn.email({ email, password }),
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });

      // Handle pending invitation from URL
      const invitationId = searchParams.get('invitationId');
      if (invitationId) {
        router.push(`/accept-invitation?id=${invitationId}`);
        return;
      }

      // Check if session has active org
      const activeOrgId = response.data?.session?.activeOrganizationId;
      if (activeOrgId) {
        setActiveOrgCookie(activeOrgId);
        router.push('/');
      } else {
        router.push('/select-org');
      }
    },
  });

  const register = useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      authClient.signUp.email({ email, password, name }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });

      // Handle pending invitation from URL
      const invitationId = searchParams.get('invitationId');
      if (invitationId) {
        router.push(`/accept-invitation?id=${invitationId}`);
        return;
      }

      // Check for pending invitations
      const invites = await authClient.organization.listUserInvitations();
      if (invites.data && invites.data.length > 0) {
        const firstInvite = invites.data[0];
        if (firstInvite) {
          await authClient.organization.acceptInvitation({ invitationId: firstInvite.id });
          const orgId = firstInvite.organizationId;
          await authClient.organization.setActive({ organizationId: orgId });
          setActiveOrgCookie(orgId);
          router.push('/');
          return;
        }
      }

      // No invitations — go to onboarding
      router.push('/onboarding');
    },
  });

  const logout = useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      clearActiveOrgCookie();
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

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/dashboard-shell.tsx apps/web/src/app/\(dashboard\)/layout.tsx apps/web/src/features/auth/hooks/use-auth.ts
git commit -m "feat: add dashboard shell with real role and update auth flow with org redirects"
```

---

## Task 10: Quality Gates + Validation

- [ ] **Step 1: Run lint**

```bash
pnpm lint
```

Expected: zero errors.

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: zero errors. Fix any type issues from Better Auth organization plugin API.

- [ ] **Step 3: Run build**

```bash
pnpm build
```

Expected: all apps build successfully.

- [ ] **Step 4: Run tests**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 5: Manual verification via Playwright**

1. Start services: `docker compose up -d && pnpm dev`
2. Navigate to `http://localhost:3000/register`
3. Register new user → should redirect to `/onboarding`
4. Create org (name + slug) → should redirect to dashboard
5. Verify org name appears in sidebar org switcher
6. Logout → should redirect to `/login`
7. Login → should go to dashboard directly (remembers last org)
8. Verify sidebar org switcher opens with dropdown

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix issues found during validation"
```
