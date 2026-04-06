# Invitation Acceptance Flow — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the invitation acceptance flow so clicking an invite link shows a self-contained page with org context, pre-filled email, and inline register/login — no redirects.

**Architecture:** Two new public (unauthenticated) backend endpoints handle invitation lookup and acceptance. The frontend `/accept-invitation` page is rewritten as a state machine that fetches invitation data and renders the appropriate form inline. The `auth` instance is passed to the new routes so they can call Better Auth's signup/signin APIs.

**Tech Stack:** Fastify 5, Better Auth 1.5, Prisma 7, Next.js 16, React 19, React Hook Form, Zod, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-05-invitation-acceptance-flow-design.md`

---

### Task 1: Add rate limit constant for public invitation endpoint

**Files:**

- Modify: `packages/shared/src/rate-limit-constants.ts`

- [ ] **Step 1: Add INVITATION_PUBLIC rate limit**

In `packages/shared/src/rate-limit-constants.ts`, add a new entry inside `RATE_LIMITS`:

```typescript
export const RATE_LIMITS = {
  AUTH: {
    LOGIN: { max: 10, windowSeconds: 900 },
    FORGOT_PASSWORD: { max: 3, windowSeconds: 3600 },
    REGISTRATION: { max: 5, windowSeconds: 3600 },
  },
  INVITATION: { max: 20, windowSeconds: 3600 },
  INVITATION_PUBLIC: { max: 30, windowSeconds: 900 },
  INVITATION_ACCEPT: { max: 10, windowSeconds: 900 },
  INTERNAL: { max: 20, windowSeconds: 60 },
  MESSAGE: { max: 10, windowMs: 1_000 },
  GLOBAL: { max: 100, windowSeconds: 60 },
} as const
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS (no errors)

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/rate-limit-constants.ts
git commit -m "feat: add rate limits for public invitation endpoints"
```

---

### Task 2: Add invitation error codes to handle-domain-error

**Files:**

- Modify: `apps/server/src/routes/v1/handle-domain-error.ts`

- [ ] **Step 1: Add new error codes**

Add these entries to the `CODE_TO_STATUS` map in `handle-domain-error.ts`:

```typescript
  // 400 Bad Request
  INVITATION_EXPIRED: 400,
  INVITATION_ALREADY_ACCEPTED: 400,
  // 401 Unauthorized
  INVALID_CREDENTIALS: 401,
  // 409 Conflict
  ALREADY_MEMBER: 409,
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/routes/v1/handle-domain-error.ts
git commit -m "feat: add invitation acceptance error codes to domain error handler"
```

---

### Task 3: Add Zod schemas for public invitation endpoints

**Files:**

- Modify: `apps/server/src/routes/v1/invitations/_schemas.ts`

- [ ] **Step 1: Add schemas for public GET and POST accept**

Add these schemas to `apps/server/src/routes/v1/invitations/_schemas.ts`:

```typescript
// --- Public invitation schemas ---

export const publicInvitationResponse = successResponse(
  z.object({
    id: z.string(),
    email: z.string(),
    role: z.string(),
    status: z.string(),
    expiresAt: z.coerce.date(),
    organizationName: z.string(),
    inviterName: z.string(),
    hasAccount: z.boolean(),
  })
)

export const acceptInvitationBodySchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('register'),
    name: z.string().min(2),
    password: z.string().min(8),
  }),
  z.object({
    mode: z.literal('login'),
    password: z.string().min(1),
  }),
])

export const acceptInvitationResponse = successResponse(
  z.object({
    organizationId: z.string(),
    role: z.string(),
  })
)
```

Also add the `errorResponse` import at the top:

```typescript
import {
  successResponse,
  paginatedResponse,
  errorResponse,
} from '../../_shared/response.schema.js'
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/routes/v1/invitations/_schemas.ts
git commit -m "feat: add Zod schemas for public invitation endpoints"
```

---

### Task 4: Create GET /api/v1/invitations/:id/public endpoint

**Files:**

- Create: `apps/server/src/routes/v1/invitations/get-public-invitation.ts`

- [ ] **Step 1: Create the public GET route**

Create `apps/server/src/routes/v1/invitations/get-public-invitation.ts`:

```typescript
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { RATE_LIMITS } from '@repo/shared'
import { prisma } from '@repo/db'
import { idParamSchema, publicInvitationResponse } from './_schemas.js'
import { errorResponse } from '../../_shared/response.schema.js'

export function getPublicInvitationRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/invitations/:id/public',
    schema: {
      operationId: 'getPublicInvitation',
      tags: ['Invitations'],
      summary: 'Get public invitation details (unauthenticated)',
      params: idParamSchema,
      response: {
        200: publicInvitationResponse,
        404: errorResponse,
      },
    },
    config: {
      rateLimit: {
        max: RATE_LIMITS.INVITATION_PUBLIC.max,
        timeWindow: `${String(RATE_LIMITS.INVITATION_PUBLIC.windowSeconds)} seconds`,
        keyGenerator: (request: FastifyRequest) => `invite-pub:${request.ip}`,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params

      const invitation = await prisma.invitation.findUnique({
        where: { id },
        include: {
          organization: { select: { name: true } },
        },
      })

      if (!invitation) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'INVITATION_NOT_FOUND',
            message: 'Convite não encontrado',
          },
        })
      }

      const inviter = await prisma.user.findUnique({
        where: { id: invitation.inviterId },
        select: { name: true },
      })

      const existingUser = await prisma.user.findUnique({
        where: { email: invitation.email },
        select: { id: true },
      })

      return reply.send({
        success: true,
        data: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt,
          organizationName: invitation.organization.name,
          inviterName: inviter?.name ?? 'Um membro',
          hasAccount: !!existingUser,
        },
      })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/routes/v1/invitations/get-public-invitation.ts
git commit -m "feat: add GET /api/v1/invitations/:id/public endpoint"
```

---

### Task 5: Create POST /api/v1/invitations/:id/accept endpoint

**Files:**

- Create: `apps/server/src/routes/v1/invitations/accept-invitation.ts`

This is the most complex route. It handles both register and login modes, creates the member, and sets up the session.

- [ ] **Step 1: Create the accept route**

Create `apps/server/src/routes/v1/invitations/accept-invitation.ts`:

```typescript
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import type { Auth } from '@repo/auth'
import { RATE_LIMITS } from '@repo/shared'
import { prisma } from '@repo/db'
import {
  idParamSchema,
  acceptInvitationBodySchema,
  acceptInvitationResponse,
} from './_schemas.js'
import { errorResponse } from '../../_shared/response.schema.js'

function errorReply(
  reply: import('fastify').FastifyReply,
  status: number,
  code: string,
  message: string
) {
  return reply.status(status).send({
    success: false,
    error: { code, message },
  })
}

export function acceptInvitationRoute(app: FastifyInstance, auth: Auth) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/invitations/:id/accept',
    schema: {
      operationId: 'acceptInvitation',
      tags: ['Invitations'],
      summary: 'Accept invitation (register or login)',
      params: idParamSchema,
      body: acceptInvitationBodySchema,
      response: {
        200: acceptInvitationResponse,
        400: errorResponse,
        401: errorResponse,
        404: errorResponse,
        409: errorResponse,
      },
    },
    config: {
      rateLimit: {
        max: RATE_LIMITS.INVITATION_ACCEPT.max,
        timeWindow: `${String(RATE_LIMITS.INVITATION_ACCEPT.windowSeconds)} seconds`,
        keyGenerator: (request: FastifyRequest) =>
          `invite-accept:${request.ip}`,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params
      const body = request.body

      // 1. Validate invitation
      const invitation = await prisma.invitation.findUnique({
        where: { id },
      })

      if (!invitation) {
        return errorReply(
          reply,
          404,
          'INVITATION_NOT_FOUND',
          'Convite não encontrado'
        )
      }

      if (invitation.status === 'accepted') {
        return errorReply(
          reply,
          400,
          'INVITATION_ALREADY_ACCEPTED',
          'Este convite já foi aceito'
        )
      }

      if (invitation.status === 'canceled') {
        return errorReply(
          reply,
          404,
          'INVITATION_NOT_FOUND',
          'Convite não encontrado'
        )
      }

      if (invitation.expiresAt < new Date()) {
        return errorReply(
          reply,
          400,
          'INVITATION_EXPIRED',
          'Este convite expirou'
        )
      }

      // 2. Build request headers for Better Auth API calls
      const headers = new Headers()
      headers.set(
        'origin',
        request.headers.origin ??
          request.headers.referer ??
          'http://localhost:3000'
      )
      // Forward cookies so Better Auth can set session
      const cookieHeader = request.headers.cookie
      if (cookieHeader) {
        headers.set('cookie', cookieHeader)
      }

      // 3. Register or Login
      let userId: string

      if (body.mode === 'register') {
        const signUpRes = await auth.api.signUpEmail({
          body: {
            email: invitation.email,
            password: body.password,
            name: body.name,
          },
          headers,
        })

        if (!signUpRes?.user?.id) {
          return errorReply(
            reply,
            422,
            'REGISTRATION_FAILED',
            'Falha ao criar conta'
          )
        }

        userId = signUpRes.user.id

        // Mark email as verified (invitation = implicit verification)
        await prisma.user.update({
          where: { id: userId },
          data: { emailVerified: true },
        })
      } else {
        const signInRes = await auth.api.signInEmail({
          body: {
            email: invitation.email,
            password: body.password,
          },
          headers,
        })

        if (!signInRes?.user?.id) {
          return errorReply(
            reply,
            401,
            'INVALID_CREDENTIALS',
            'Senha incorreta'
          )
        }

        userId = signInRes.user.id

        // Forward session cookies from Better Auth response
        const setCookieHeader = signInRes.headers?.get('set-cookie')
        if (setCookieHeader) {
          reply.header('set-cookie', setCookieHeader)
        }
      }

      // 4. Check if already a member
      const existingMember = await prisma.member.findUnique({
        where: {
          organizationId_userId: {
            organizationId: invitation.organizationId,
            userId,
          },
        },
      })

      if (existingMember) {
        // Still mark invitation as accepted
        await prisma.invitation.update({
          where: { id },
          data: { status: 'accepted' },
        })
        return errorReply(
          reply,
          409,
          'ALREADY_MEMBER',
          'Você já faz parte desta organização'
        )
      }

      // 5. Create member + mark invitation accepted in a transaction
      await prisma.$transaction([
        prisma.member.create({
          data: {
            organizationId: invitation.organizationId,
            userId,
            role: invitation.role,
          },
        }),
        prisma.invitation.update({
          where: { id },
          data: { status: 'accepted' },
        }),
      ])

      // 6. Set active organization in Better Auth session
      await auth.api.setActiveOrganization({
        body: { organizationId: invitation.organizationId },
        headers,
      })

      return reply.send({
        success: true,
        data: {
          organizationId: invitation.organizationId,
          role: invitation.role,
        },
      })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/server/src/routes/v1/invitations/accept-invitation.ts
git commit -m "feat: add POST /api/v1/invitations/:id/accept endpoint"
```

---

### Task 6: Register public invitation routes in app.ts

**Files:**

- Create: `apps/server/src/routes/v1/invitations/public.ts`
- Modify: `apps/server/src/app.ts`

The public routes must be registered OUTSIDE the authenticated block since they don't require a session.

- [ ] **Step 1: Create the public routes plugin**

Create `apps/server/src/routes/v1/invitations/public.ts`:

```typescript
import type { FastifyInstance } from 'fastify'
import type { Auth } from '@repo/auth'
import { getPublicInvitationRoute } from './get-public-invitation.js'
import { acceptInvitationRoute } from './accept-invitation.js'

export function publicInvitationRoutes(app: FastifyInstance, auth: Auth) {
  getPublicInvitationRoute(app)
  acceptInvitationRoute(app, auth)
}
```

- [ ] **Step 2: Register in app.ts**

In `apps/server/src/app.ts`, add the import at the top with the other route imports:

```typescript
import { publicInvitationRoutes } from './routes/v1/invitations/public.js'
```

Then register the public routes AFTER `registerAuthRoutes(app, auth, redis)` and BEFORE the authenticated block. Find the line `registerAuthRoutes(app, auth, redis)` (around line 243) and add after it:

```typescript
registerAuthRoutes(app, auth, redis)

// Public invitation routes (unauthenticated — accept/view invitations)
await app.register(async (publicApp) => {
  publicInvitationRoutes(publicApp, auth)
})

// API v1 routes (authenticated)
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/server/src/routes/v1/invitations/public.ts apps/server/src/app.ts
git commit -m "feat: register public invitation routes outside auth middleware"
```

---

### Task 7: Rewrite frontend accept-invitation page

**Files:**

- Rewrite: `apps/web/src/app/(onboarding)/accept-invitation/content.tsx`

This replaces the current content with the full self-contained flow.

- [ ] **Step 1: Rewrite content.tsx**

Rewrite `apps/web/src/app/(onboarding)/accept-invitation/content.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Mail, Building2, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { authClient } from '@/lib/auth-client'
import { setActiveOrgCookie } from '@/lib/org-cookie'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  COMMERCIAL: 'Comercial',
  VIEWER: 'Visualizador',
}

// --- Types ---

interface InvitationPublicData {
  readonly id: string
  readonly email: string
  readonly role: string
  readonly status: string
  readonly expiresAt: string
  readonly organizationName: string
  readonly inviterName: string
  readonly hasAccount: boolean
}

type PageState =
  | { status: 'loading' }
  | { status: 'register'; invitation: InvitationPublicData }
  | { status: 'login'; invitation: InvitationPublicData }
  | { status: 'error'; code: string; message: string }

// --- Schemas ---

const registerSchema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    acceptedTerms: z.literal(true, {
      errorMap: () => ({
        message: 'Você deve aceitar os termos para continuar',
      }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })

const loginSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
})

type RegisterFormData = z.infer<typeof registerSchema>
type LoginFormData = z.infer<typeof loginSchema>

// --- API helpers ---

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

async function fetchInvitation(id: string): Promise<InvitationPublicData> {
  const res = await fetch(`${API_URL}/api/v1/invitations/${id}/public`)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error?.code ?? 'UNKNOWN')
  return json.data
}

async function submitAccept(
  id: string,
  body: { mode: 'register'; name: string; password: string } | { mode: 'login'; password: string }
): Promise<{ organizationId: string; role: string }> {
  const res = await fetch(`${API_URL}/api/v1/invitations/${id}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  const json = await res.json()
  if (!res.ok) {
    const message =
      json.error?.code === 'INVALID_CREDENTIALS'
        ? 'Senha incorreta'
        : json.error?.code === 'ALREADY_MEMBER'
          ? 'Você já faz parte desta organização'
          : json.error?.message ?? 'Erro ao aceitar convite'
    throw new Error(message)
  }
  return json.data
}

// --- Main Component ---

export function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const invitationId = searchParams.get('id')
  const [state, setState] = useState<PageState>({ status: 'loading' })

  useEffect(() => {
    if (!invitationId) {
      setState({
        status: 'error',
        code: 'MISSING_ID',
        message: 'Link de convite inválido',
      })
      return
    }

    fetchInvitation(invitationId)
      .then((invitation) => {
        if (invitation.status !== 'pending') {
          setState({
            status: 'error',
            code: invitation.status === 'accepted'
              ? 'INVITATION_ALREADY_ACCEPTED'
              : 'INVITATION_NOT_FOUND',
            message: invitation.status === 'accepted'
              ? 'Você já faz parte desta organização.'
              : 'Este convite foi cancelado.',
          })
          return
        }

        if (new Date(invitation.expiresAt) < new Date()) {
          setState({
            status: 'error',
            code: 'INVITATION_EXPIRED',
            message: 'Este convite expirou. Entre em contato com quem te convidou para solicitar um novo.',
          })
          return
        }

        setState({
          status: invitation.hasAccount ? 'login' : 'register',
          invitation,
        })
      })
      .catch(() => {
        setState({
          status: 'error',
          code: 'INVITATION_NOT_FOUND',
          message: 'Este link pode estar incorreto ou o convite foi cancelado.',
        })
      })
  }, [invitationId])

  if (state.status === 'loading') {
    return (
      <div className="bg-card flex flex-col items-center rounded-lg border p-8 shadow-sm">
        <Loader2 className="text-primary size-8 animate-spin" />
        <p className="text-muted-foreground mt-4 text-sm">Carregando convite...</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return <InvitationError code={state.code} message={state.message} />
  }

  return (
    <div className="bg-card rounded-lg border p-8 shadow-sm">
      <InvitationHeader invitation={state.invitation} />
      {state.status === 'register' ? (
        <InvitationRegisterForm invitation={state.invitation} />
      ) : (
        <InvitationLoginForm invitation={state.invitation} />
      )}
    </div>
  )
}

// --- Sub-components ---

function InvitationHeader({ invitation }: { readonly invitation: InvitationPublicData }) {
  return (
    <div className="mb-6 space-y-3 text-center">
      <div className="bg-primary/10 mx-auto flex size-12 items-center justify-center rounded-full">
        <Building2 className="text-primary size-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold">Convite para {invitation.organizationName}</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          <strong>{invitation.inviterName}</strong> convidou você como{' '}
          <Badge variant="outline" size="sm">
            {ROLE_LABELS[invitation.role] ?? invitation.role}
          </Badge>
        </p>
      </div>
      <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
        <Mail className="size-4" />
        <span>{invitation.email}</span>
      </div>
    </div>
  )
}

function InvitationRegisterForm({ invitation }: { readonly invitation: InvitationPublicData }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const acceptedTerms = form.watch('acceptedTerms')

  async function onSubmit(data: RegisterFormData) {
    setSubmitting(true)
    try {
      const result = await submitAccept(invitation.id, {
        mode: 'register',
        name: data.name,
        password: data.password,
      })
      setActiveOrgCookie(result.organizationId)
      queryClient.clear()
      toast.success('Conta criada! Bem-vindo à organização.')
      router.push('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar conta')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-muted-foreground mb-4 text-center text-sm">
        Crie sua conta para entrar na organização
      </p>

      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          {...form.register('name')}
          id="name"
          placeholder="Seu nome"
          autoComplete="name"
        />
        {form.formState.errors.name && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={invitation.email}
          readOnly
          className="bg-muted cursor-not-allowed"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            {...form.register('password')}
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="new-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowPassword((p) => !p)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">Mínimo de 8 caracteres</p>
        {form.formState.errors.password && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
        <div className="relative">
          <Input
            {...form.register('confirmPassword')}
            type={showConfirm ? 'text' : 'password'}
            id="confirmPassword"
            autoComplete="new-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowConfirm((p) => !p)}
            aria-label={showConfirm ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
        {form.formState.errors.confirmPassword && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <Checkbox
            id="acceptedTerms"
            checked={acceptedTerms === true}
            onCheckedChange={(checked) => {
              if (checked === true) {
                form.setValue('acceptedTerms', true, { shouldValidate: true })
              } else {
                form.resetField('acceptedTerms')
              }
            }}
            className="mt-0.5"
          />
          <label htmlFor="acceptedTerms" className="text-muted-foreground text-sm">
            Li e aceito os{' '}
            <Link href="/terms" target="_blank" className="text-primary underline">
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link href="/privacy" target="_blank" className="text-primary underline">
              Política de Privacidade
            </Link>
          </label>
        </div>
        {form.formState.errors.acceptedTerms && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.acceptedTerms.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Criando conta...
          </>
        ) : (
          <>
            <UserPlus className="mr-2 size-4" />
            Criar conta e entrar
          </>
        )}
      </Button>
    </form>
  )
}

function InvitationLoginForm({ invitation }: { readonly invitation: InvitationPublicData }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    setSubmitting(true)
    try {
      const result = await submitAccept(invitation.id, {
        mode: 'login',
        password: data.password,
      })
      setActiveOrgCookie(result.organizationId)
      queryClient.clear()
      toast.success('Convite aceito! Bem-vindo à organização.')
      router.push('/dashboard')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao entrar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <p className="text-muted-foreground mb-4 text-center text-sm">
        Entre com sua senha para aceitar o convite
      </p>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={invitation.email}
          readOnly
          className="bg-muted cursor-not-allowed"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            {...form.register('password')}
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => setShowPassword((p) => !p)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        </div>
        {form.formState.errors.password && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Entrando...
          </>
        ) : (
          'Entrar e aceitar convite'
        )}
      </Button>
    </form>
  )
}

function InvitationError({
  code,
  message,
}: {
  readonly code: string
  readonly message: string
}) {
  const router = useRouter()

  return (
    <div className="bg-card rounded-lg border p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold">
        {code === 'INVITATION_EXPIRED'
          ? 'Convite expirado'
          : code === 'INVITATION_ALREADY_ACCEPTED'
            ? 'Convite já aceito'
            : 'Convite inválido'}
      </h2>
      <p className="text-muted-foreground mt-2 text-sm">{message}</p>
      {code === 'INVITATION_ALREADY_ACCEPTED' ? (
        <Button className="mt-4" onClick={() => router.push('/dashboard')}>
          Ir para o dashboard
        </Button>
      ) : (
        <Button className="mt-4" variant="outline" onClick={() => router.push('/login')}>
          Ir para login
        </Button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/(onboarding)/accept-invitation/content.tsx
git commit -m "feat: rewrite accept-invitation page with inline register/login forms"
```

---

### Task 8: Manual QA — Test the full flow

No code changes. This is end-to-end validation.

- [ ] **Step 1: Restart the server**

Kill existing processes and restart:

```bash
# Kill and restart
pnpm dev
```

Wait for all services to be up (web :3000, server :3001).

- [ ] **Step 2: Create test account and org**

1. Open `http://localhost:3000/register`
2. Register as `arturmoiscontato@gmail.com` (the org owner)
3. Verify email if prompted
4. Create an organization named "artur"

- [ ] **Step 3: Send invitation**

1. Go to members page
2. Invite `artur.claude99@gmail.com` as COMMERCIAL

- [ ] **Step 4: Test register flow (new user)**

1. Open the invitation link in an **incognito window**: `http://localhost:3000/accept-invitation?id=<invitation_id>`
2. Verify: page shows org name, inviter name, role badge, email readonly
3. Verify: registration form is shown (name, password, confirm, terms)
4. Fill in and submit
5. Verify: redirects to `/dashboard` with the correct organization active

- [ ] **Step 5: Test login flow (existing user)**

1. Delete the member from the org (via DB or UI)
2. Create a new invitation for the same email
3. Open the invitation link in incognito
4. Verify: login form is shown (email readonly, password only)
5. Enter password and submit
6. Verify: redirects to `/dashboard`

- [ ] **Step 6: Test error states**

1. Open `http://localhost:3000/accept-invitation?id=nonexistent` — should show "Convite inválido"
2. Open an already-accepted invitation — should show "Convite já aceito" with dashboard button
3. Manually expire an invitation in DB, then open it — should show "Convite expirado"

- [ ] **Step 7: Run quality gates**

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test
```

All must pass.

- [ ] **Step 8: Commit any fixes**

If any fixes were needed during QA, commit them.
