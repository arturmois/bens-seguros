# Email Verification & Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add blocking email verification on signup and password reset via email link, using Better Auth's native capabilities and existing Resend infrastructure.

**Architecture:** Better Auth's `emailVerification` config and `sendResetPassword` callback handle token generation, storage (Verification table), and validation. Email templates live in `@repo/core` alongside existing ones. `createAuth` accepts email sender callbacks (DI), wired by the server. Next.js middleware uses `getCookieCache` from `better-auth/cookies` to block unverified users without API calls.

**Tech Stack:** Better Auth 1.5.5, Resend, Next.js 16 middleware, React 19, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-04-05-email-verification-password-reset-design.md`

---

### Task 1: Email Templates

**Files:**

- Create: `packages/core/src/modules/notification/infrastructure/email-templates/email-verification.ts`
- Create: `packages/core/src/modules/notification/infrastructure/email-templates/password-reset.ts`
- Modify: `packages/core/src/modules/notification/index.ts`

- [ ] **Step 1: Create email verification template**

Create `packages/core/src/modules/notification/infrastructure/email-templates/email-verification.ts`:

```typescript
import { baseLayout, button } from './base-layout.js'

interface EmailVerificationParams {
  readonly name: string
  readonly url: string
}

export function emailVerificationEmail(
  params: EmailVerificationParams
): string {
  return baseLayout(`
    <h2 style="font-size:20px;font-weight:600;color:#0d4f4f;margin:0 0 16px;">Verifique seu Email</h2>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 8px;">
      Olá, <strong>${params.name}</strong>!
    </p>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 24px;">
      Para acessar o Bens Seguros, confirme seu endereço de email clicando no botão abaixo.
    </p>
    ${button('Verificar Email', params.url)}
    <p style="font-size:12px;color:#71717a;margin:24px 0 0;">
      Este link expira em 24 horas. Se você não criou esta conta, ignore este email.
    </p>
  `)
}
```

- [ ] **Step 2: Create password reset template**

Create `packages/core/src/modules/notification/infrastructure/email-templates/password-reset.ts`:

```typescript
import { baseLayout, button } from './base-layout.js'

interface PasswordResetParams {
  readonly name: string
  readonly url: string
}

export function passwordResetEmail(params: PasswordResetParams): string {
  return baseLayout(`
    <h2 style="font-size:20px;font-weight:600;color:#0d4f4f;margin:0 0 16px;">Redefinir Senha</h2>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 8px;">
      Olá, <strong>${params.name}</strong>!
    </p>
    <p style="font-size:14px;color:#3f3f46;line-height:1.6;margin:0 0 24px;">
      Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.
    </p>
    ${button('Redefinir Senha', params.url)}
    <p style="font-size:12px;color:#71717a;margin:24px 0 0;">
      Este link expira em 1 hora. Se você não solicitou a redefinição, ignore este email — sua senha permanecerá inalterada.
    </p>
  `)
}
```

- [ ] **Step 3: Export templates from notification barrel**

Add to `packages/core/src/modules/notification/index.ts`, after the existing template exports:

```typescript
export { emailVerificationEmail } from './infrastructure/email-templates/email-verification.js'
export { passwordResetEmail } from './infrastructure/email-templates/password-reset.js'
```

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/modules/notification/infrastructure/email-templates/email-verification.ts \
  packages/core/src/modules/notification/infrastructure/email-templates/password-reset.ts \
  packages/core/src/modules/notification/index.ts
git commit -m "feat: add email verification and password reset email templates"
```

---

### Task 2: Better Auth Server Config

**Files:**

- Modify: `packages/auth/src/index.ts`

- [ ] **Step 1: Add email sender callback types and use them in config**

Modify `packages/auth/src/index.ts`. Add the callback interface and update `createAuth` signature:

```typescript
// Add after the VIEWER_ROLE definition (line 37), before createAuth:

interface AuthEmailSenders {
  readonly sendVerificationEmail: (
    email: string,
    name: string,
    url: string
  ) => void
  readonly sendResetPasswordEmail: (
    email: string,
    name: string,
    url: string
  ) => void
}
```

Update the `createAuth` function signature to accept email senders:

```typescript
export function createAuth(
  secret: string,
  baseURL: string,
  trustedOrigins: string[],
  cookieDomain?: string,
  emailSenders?: AuthEmailSenders
) {
```

Update the `emailAndPassword` block to add `sendResetPassword`:

```typescript
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      sendResetPassword: emailSenders
        ? async ({ user, url }) => {
            emailSenders.sendResetPasswordEmail(user.email, user.name, url)
          }
        : undefined,
    },
```

Add `emailVerification` config after `emailAndPassword` and before `advanced`:

```typescript
    emailVerification: emailSenders
      ? {
          sendOnSignUp: true,
          autoSignInAfterVerification: true,
          expiresIn: 86400, // 24h
          sendVerificationEmail: async ({ user, url }) => {
            emailSenders.sendVerificationEmail(user.email, user.name, url)
          },
        }
      : undefined,
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @repo/auth exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add packages/auth/src/index.ts
git commit -m "feat: add email verification and password reset to Better Auth config"
```

---

### Task 3: Wire Email Senders in Server

**Files:**

- Modify: `apps/server/src/app.ts:192-197`

- [ ] **Step 1: Add imports and wire email senders**

At the top of `apps/server/src/app.ts`, add these imports (alongside existing ones):

```typescript
import {
  ResendEmailProvider,
  emailVerificationEmail,
  passwordResetEmail,
} from '@repo/core/notification'
```

Replace the `createAuth` call (lines 192-197):

```typescript
const auth = createAuth(
  env.AUTH_SECRET,
  env.API_URL,
  [frontendUrl],
  cookieDomain,
  env.RESEND_API_KEY
    ? {
        sendVerificationEmail: (email, name, url) => {
          const provider = new ResendEmailProvider({
            apiKey: env.RESEND_API_KEY!,
            fromAddress: env.RESEND_FROM_ADDRESS,
          })
          void provider.send({
            to: email,
            subject: 'Verifique seu email — Bens Seguros',
            html: emailVerificationEmail({ name, url }),
          })
        },
        sendResetPasswordEmail: (email, name, url) => {
          const provider = new ResendEmailProvider({
            apiKey: env.RESEND_API_KEY!,
            fromAddress: env.RESEND_FROM_ADDRESS,
          })
          void provider.send({
            to: email,
            subject: 'Redefinir senha — Bens Seguros',
            html: passwordResetEmail({ name, url }),
          })
        },
      }
    : undefined
)
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @app/server exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/server/src/app.ts
git commit -m "feat: wire email verification and password reset senders in server"
```

---

### Task 4: Update Next.js Middleware

**Files:**

- Modify: `apps/web/src/proxy.ts`

- [ ] **Step 1: Add email verification blocking to middleware**

Replace the entire `apps/web/src/proxy.ts` with:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCookieCache } from 'better-auth/cookies'

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/terms',
  '/privacy',
]
const AUTH_PAGES = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
]
const AUTH_ONLY_PATHS = [
  '/onboarding',
  '/select-org',
  '/accept-invitation',
  '/verify-email',
]

function getSessionToken(request: NextRequest): string | undefined {
  return (
    request.cookies.get('__Secure-better-auth.session_token')?.value ??
    request.cookies.get('better-auth.session_token')?.value
  )
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionToken = getSessionToken(request)

  // 1. Landing page — public for unauthenticated, redirect for authenticated
  if (pathname === '/') {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 2. Auth pages — redirect to dashboard if already logged in
  if (AUTH_PAGES.some((p) => pathname.startsWith(p))) {
    if (sessionToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // 3. Other public routes — no check
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 4. No session — redirect to login
  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. Email verification check — block unverified users
  //    Uses Better Auth cookie cache (no API call). Falls back to allowing
  //    through if cache is unavailable — client-side enforces as backup.
  if (!pathname.startsWith('/verify-email')) {
    const cachedSession = await getCookieCache(request)
    if (cachedSession && !cachedSession.user.emailVerified) {
      return NextResponse.redirect(new URL('/verify-email', request.url))
    }
  }

  // 6. Auth-only routes (need session, not org) — pass through
  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 7. No active org cookie — redirect to select-org
  const activeOrg = request.cookies.get('bens-active-org')?.value
  if (!activeOrg) {
    return NextResponse.redirect(new URL('/select-org', request.url))
  }

  // 8. All checks passed
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

Key changes:

- Import `getCookieCache` from `better-auth/cookies`
- Function is now `async` (needed for `getCookieCache`)
- Added `/forgot-password` and `/reset-password` to `PUBLIC_PATHS` and `AUTH_PAGES`
- Added `/verify-email` to `AUTH_ONLY_PATHS`
- New step 5: checks cookie cache for `emailVerified`, redirects to `/verify-email` if false
- Skip the check if already on `/verify-email` (avoid redirect loop)

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/proxy.ts
git commit -m "feat: block unverified users in middleware, add password reset public routes"
```

---

### Task 5: Verify Email Page

**Files:**

- Create: `apps/web/src/app/(auth)/verify-email/page.tsx`
- Create: `apps/web/src/features/auth/components/verify-email-card.tsx`

- [ ] **Step 1: Create the verify-email component**

Create `apps/web/src/features/auth/components/verify-email-card.tsx`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { useRouter } from 'next/navigation'

const RESEND_COOLDOWN_SECONDS = 60

export function VerifyEmailCard() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [cooldown, setCooldown] = useState(0)
  const [isSending, setIsSending] = useState(false)

  // If user is already verified, redirect away
  useEffect(() => {
    if (!isLoading && user?.emailVerified) {
      router.replace('/onboarding')
    }
  }, [isLoading, user?.emailVerified, router])

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleResend = useCallback(async () => {
    if (!user?.email || cooldown > 0) return
    setIsSending(true)
    try {
      await authClient.sendVerificationEmail({
        email: user.email,
        callbackURL: '/onboarding',
      })
      setCooldown(RESEND_COOLDOWN_SECONDS)
      toast.success('Email de verificação reenviado')
    } catch {
      toast.error('Erro ao reenviar email. Tente novamente.')
    } finally {
      setIsSending(false)
    }
  }, [user?.email, cooldown])

  if (isLoading) return null

  return (
    <div className="flex flex-col items-center text-center">
      <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-white/[0.06]">
        <Mail className="size-8 text-accent-400" />
      </div>
      <h1 className="mb-2 text-xl font-bold text-slate-100">
        Verifique seu email
      </h1>
      <p className="mb-2 text-sm text-slate-400">
        Enviamos um link de verificação para
      </p>
      <p className="mb-6 text-sm font-medium text-slate-200">
        {user?.email}
      </p>
      <p className="mb-6 text-sm text-slate-400">
        Clique no link do email para ativar sua conta. O link expira em 24
        horas.
      </p>
      <Button
        variant="outline"
        className="w-full border-white/10 text-slate-300 hover:bg-white/[0.06]"
        onClick={handleResend}
        disabled={cooldown > 0 || isSending}
      >
        {isSending
          ? 'Enviando...'
          : cooldown > 0
            ? `Reenviar em ${String(cooldown)}s`
            : 'Reenviar email'}
      </Button>
      <p className="mt-4 text-xs text-slate-500">
        Não recebeu? Verifique sua pasta de spam.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Create the verify-email page**

Create `apps/web/src/app/(auth)/verify-email/page.tsx`:

```typescript
import { VerifyEmailCard } from '@/features/auth/components/verify-email-card'

export default function VerifyEmailPage() {
  return <VerifyEmailCard />
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(auth\)/verify-email/page.tsx \
  apps/web/src/features/auth/components/verify-email-card.tsx
git commit -m "feat: add verify-email page with resend cooldown"
```

---

### Task 6: Forgot Password Page

**Files:**

- Create: `apps/web/src/app/(auth)/forgot-password/page.tsx`
- Create: `apps/web/src/features/auth/components/forgot-password-form.tsx`

- [ ] **Step 1: Create the forgot-password form component**

Create `apps/web/src/features/auth/components/forgot-password-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail } from 'lucide-react'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsPending(true)
    try {
      await authClient.requestPasswordReset({
        email: data.email,
        redirectTo: '/reset-password',
      })
    } catch {
      // Silently succeed — do not reveal if email exists
    } finally {
      setIsPending(false)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-white/[0.06]">
          <Mail className="size-8 text-accent-400" />
        </div>
        <h2 className="mb-2 text-xl font-bold text-slate-100">
          Verifique seu email
        </h2>
        <p className="mb-6 text-sm text-slate-400">
          Se o email informado estiver cadastrado, enviaremos um link para
          redefinir sua senha. O link expira em 1 hora.
        </p>
        <p className="text-xs text-slate-500">
          Não recebeu? Verifique sua pasta de spam.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-400">
          Email
        </Label>
        <Input
          {...form.register('email')}
          type="email"
          id="email"
          placeholder="seu@email.com"
          autoComplete="email"
          className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
        />
        {form.formState.errors.email && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="from-accent-500 to-accent-400 hover:from-accent-600 hover:to-accent-500 w-full bg-gradient-to-r font-bold text-slate-900"
        disabled={isPending}
      >
        {isPending ? 'Enviando...' : 'Enviar link de redefinição'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Create the forgot-password page**

Create `apps/web/src/app/(auth)/forgot-password/page.tsx`:

```typescript
import Link from 'next/link'
import { Suspense } from 'react'
import { ForgotPasswordForm } from '@/features/auth/components/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-slate-100">Esqueceu sua senha?</h1>
      <p className="mb-6 text-sm text-slate-400">
        Informe seu email para receber o link de redefinição
      </p>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-slate-400">
        Lembrou?{' '}
        <Link href="/login" className="text-accent-500 hover:text-accent-400">
          Voltar ao login
        </Link>
      </p>
    </>
  )
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(auth\)/forgot-password/page.tsx \
  apps/web/src/features/auth/components/forgot-password-form.tsx
git commit -m "feat: add forgot-password page with email form"
```

---

### Task 7: Reset Password Page

**Files:**

- Create: `apps/web/src/app/(auth)/reset-password/page.tsx`
- Create: `apps/web/src/features/auth/components/reset-password-form.tsx`

- [ ] **Step 1: Create the reset-password form component**

Create `apps/web/src/features/auth/components/reset-password-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(8, 'Mínimo 8 caracteres'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Senhas não conferem',
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const error = searchParams.get('error')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  // Invalid or expired token
  if (!token || error === 'INVALID_TOKEN') {
    return (
      <div className="flex flex-col items-center text-center">
        <h2 className="mb-2 text-xl font-bold text-slate-100">
          Link inválido ou expirado
        </h2>
        <p className="mb-6 text-sm text-slate-400">
          O link de redefinição de senha expirou ou é inválido. Solicite um novo
          link.
        </p>
        <Link
          href="/forgot-password"
          className="text-accent-500 hover:text-accent-400 text-sm"
        >
          Solicitar novo link
        </Link>
      </div>
    )
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsPending(true)
    try {
      const response = await authClient.resetPassword({
        newPassword: data.password,
        token,
      })
      if (response.error) {
        toast.error('Erro ao redefinir senha. O link pode ter expirado.')
        return
      }
      toast.success('Senha redefinida com sucesso!')
      router.push('/login')
    } catch {
      toast.error('Erro ao redefinir senha. Tente novamente.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-400">
          Nova Senha
        </Label>
        <div className="relative">
          <Input
            {...form.register('password')}
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="new-password"
            className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:bg-transparent"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-slate-500">Mínimo de 8 caracteres</p>
        {form.formState.errors.password && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-slate-400">
          Confirmar Nova Senha
        </Label>
        <div className="relative">
          <Input
            {...form.register('confirmPassword')}
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            autoComplete="new-password"
            className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:bg-transparent"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={
              showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'
            }
          >
            {showConfirmPassword ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </div>
        {form.formState.errors.confirmPassword && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>

      <Button
        type="submit"
        className="from-accent-500 to-accent-400 hover:from-accent-600 hover:to-accent-500 w-full bg-gradient-to-r font-bold text-slate-900"
        disabled={isPending}
      >
        {isPending ? 'Redefinindo...' : 'Redefinir Senha'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Create the reset-password page**

Create `apps/web/src/app/(auth)/reset-password/page.tsx`:

```typescript
import Link from 'next/link'
import { Suspense } from 'react'
import { ResetPasswordForm } from '@/features/auth/components/reset-password-form'

export default function ResetPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-bold text-slate-100">Redefinir senha</h1>
      <p className="mb-6 text-sm text-slate-400">
        Escolha uma nova senha para sua conta
      </p>
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
      <p className="mt-4 text-center text-sm text-slate-400">
        <Link href="/login" className="text-accent-500 hover:text-accent-400">
          Voltar ao login
        </Link>
      </p>
    </>
  )
}
```

- [ ] **Step 3: Verify typecheck passes**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/\(auth\)/reset-password/page.tsx \
  apps/web/src/features/auth/components/reset-password-form.tsx
git commit -m "feat: add reset-password page with token validation"
```

---

### Task 8: Update Register Flow and Login Form

**Files:**

- Modify: `apps/web/src/features/auth/hooks/use-auth.ts:119`
- Modify: `apps/web/src/features/auth/components/login-form.tsx:64-69`

- [ ] **Step 1: Redirect register to verify-email**

In `apps/web/src/features/auth/hooks/use-auth.ts`, change the register `onSuccess` redirect (line 119):

Replace:

```typescript
router.push('/onboarding')
```

With:

```typescript
router.push('/verify-email')
```

- [ ] **Step 2: Handle unverified users on login**

In `apps/web/src/features/auth/hooks/use-auth.ts`, update the login `onSuccess` handler. After the existing `onSuccess` function body (line 51), add an email verification check as the first thing in the handler, before the invitation check:

Replace the login `onSuccess` (lines 51-75):

```typescript
    onSuccess: async (response) => {
      const invitationId = response.invitationId

      if (invitationId) {
        await handleInvitationAfterLogin(invitationId)
        return
      }

      // Try to restore last active org from cookie (survives logout)
      const lastOrgId = getActiveOrgCookie()
      if (lastOrgId) {
        const res = await authClient.organization.setActive({
          organizationId: lastOrgId,
        })
        if (!res.error) {
          setActiveOrgCookie(lastOrgId)
          await queryClient.invalidateQueries({ queryKey: ['auth'] })
          router.push('/dashboard')
          return
        }
        // Org no longer valid for this user — clear stale cookie
        clearActiveOrgCookie()
      }

      await queryClient.invalidateQueries({ queryKey: ['auth'] })
      router.push('/select-org')
    },
```

With:

```typescript
    onSuccess: async (response) => {
      // Check if email is verified — redirect to verification if not
      const session = await authClient.getSession()
      if (session.data?.user && !session.data.user.emailVerified) {
        queryClient.invalidateQueries({ queryKey: ['auth'] })
        router.push('/verify-email')
        return
      }

      const invitationId = response.invitationId

      if (invitationId) {
        await handleInvitationAfterLogin(invitationId)
        return
      }

      // Try to restore last active org from cookie (survives logout)
      const lastOrgId = getActiveOrgCookie()
      if (lastOrgId) {
        const res = await authClient.organization.setActive({
          organizationId: lastOrgId,
        })
        if (!res.error) {
          setActiveOrgCookie(lastOrgId)
          await queryClient.invalidateQueries({ queryKey: ['auth'] })
          router.push('/dashboard')
          return
        }
        // Org no longer valid for this user — clear stale cookie
        clearActiveOrgCookie()
      }

      await queryClient.invalidateQueries({ queryKey: ['auth'] })
      router.push('/select-org')
    },
```

- [ ] **Step 3: Activate forgot password link in login form**

In `apps/web/src/features/auth/components/login-form.tsx`, replace the disabled "Esqueceu?" span (lines 64-69):

Replace:

```typescript
          <span
            className="text-accent-500/50 cursor-default text-sm"
            title="Em breve"
          >
            Esqueceu?
          </span>
```

With:

```typescript
          <Link
            href="/forgot-password"
            className="text-accent-500 hover:text-accent-400 text-sm"
          >
            Esqueceu?
          </Link>
```

Also add the `Link` import at the top of the file. Add after the existing imports (line 8):

```typescript
import Link from 'next/link'
```

- [ ] **Step 4: Verify typecheck passes**

Run: `pnpm --filter @app/web exec tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Run lint**

Run: `pnpm lint`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/auth/hooks/use-auth.ts \
  apps/web/src/features/auth/components/login-form.tsx
git commit -m "feat: redirect register to verify-email, activate forgot password link"
```

---

### Task 9: Final Quality Gates

- [ ] **Step 1: Run full typecheck**

Run: `pnpm typecheck`
Expected: No errors

- [ ] **Step 2: Run full lint**

Run: `pnpm lint`
Expected: No errors

- [ ] **Step 3: Run full build**

Run: `pnpm build`
Expected: Successful build

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: All tests pass (no new test failures)
