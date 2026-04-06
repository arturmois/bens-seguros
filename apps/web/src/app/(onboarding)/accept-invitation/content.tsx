'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { setActiveOrgCookie } from '@/lib/org-cookie'
import { useQueryClient } from '@tanstack/react-query'

// ─── Types ───────────────────────────────────────────────────────────────────

interface InvitationData {
  readonly id: string
  readonly email: string
  readonly role: string
  readonly organizationName: string
  readonly inviterName: string
  readonly hasAccount: boolean
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'register'; invitation: InvitationData }
  | { kind: 'login'; invitation: InvitationData }
  | { kind: 'error'; variant: 'expired' | 'already_accepted' | 'not_found' }

// ─── Constants ───────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Proprietário',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  COMMERCIAL: 'Comercial',
  VIEWER: 'Visualizador',
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    password: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
    confirmPassword: z.string(),
    terms: z.literal(true, {
      errorMap: () => ({ message: 'Você precisa aceitar os termos' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

const loginSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
})

type RegisterFormValues = z.infer<typeof registerSchema>
type LoginFormValues = z.infer<typeof loginSchema>

// ─── API Helpers ──────────────────────────────────────────────────────────────

async function fetchInvitation(id: string): Promise<InvitationData> {
  const res = await fetch(`${API_BASE}/api/v1/invitations/${id}/public`)
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { code?: string }
    }
    const code = body.error?.code ?? ''
    throw new InvitationFetchError(code, res.status)
  }
  const body = (await res.json()) as { data: InvitationData }
  return body.data
}

async function acceptInvitation(
  id: string,
  payload:
    | { mode: 'register'; name: string; password: string }
    | { mode: 'login'; password: string }
): Promise<{ organizationId: string }> {
  const res = await fetch(`${API_BASE}/api/v1/invitations/${id}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { code?: string }
    }
    const code = body.error?.code ?? ''
    throw new InvitationFetchError(code, res.status)
  }
  const body = (await res.json()) as { data: { organizationId: string } }
  return body.data
}

class InvitationFetchError extends Error {
  constructor(
    readonly code: string,
    readonly status: number
  ) {
    super(`Invitation error: ${code} (${status})`)
  }
}

function resolveErrorVariant(
  err: unknown
): 'expired' | 'already_accepted' | 'not_found' {
  if (!(err instanceof InvitationFetchError)) return 'not_found'
  if (err.code === 'INVITATION_ALREADY_ACCEPTED') return 'already_accepted'
  if (err.code === 'INVITATION_EXPIRED') return 'expired'
  return 'not_found'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InvitationHeaderProps {
  readonly invitation: InvitationData
}

function InvitationHeader({ invitation }: InvitationHeaderProps) {
  const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role

  return (
    <div className="mb-6 flex flex-col items-center gap-3 text-center">
      <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
        <Building2 className="text-primary size-6" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">
          Você foi convidado para{' '}
          <span className="text-primary">{invitation.organizationName}</span>
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {invitation.inviterName} te convidou como
        </p>
      </div>
      <Badge variant="secondary">{roleLabel}</Badge>
    </div>
  )
}

interface InvitationRegisterFormProps {
  readonly invitation: InvitationData
  readonly onSuccess: (orgId: string) => void
}

function InvitationRegisterForm({
  invitation,
  onSuccess,
}: InvitationRegisterFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { terms: undefined },
  })

  const termsChecked = watch('terms')

  async function onSubmit(values: RegisterFormValues) {
    try {
      const result = await acceptInvitation(invitation.id, {
        mode: 'register',
        name: values.name,
        password: values.password,
      })
      onSuccess(result.organizationId)
    } catch (err) {
      const variant = resolveErrorVariant(err)
      if (variant === 'already_accepted') {
        toast.error('Convite já aceito', {
          description: 'Você já faz parte desta organização.',
        })
      } else {
        toast.error('Erro ao criar conta', {
          description: 'Tente novamente ou contate o suporte.',
        })
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={invitation.email}
          readOnly
          className="bg-muted cursor-not-allowed"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="name">Nome completo</Label>
        <Input
          id="name"
          type="text"
          placeholder="Seu nome"
          autoComplete="name"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-destructive text-xs">{errors.name.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="Mínimo 8 caracteres"
          autoComplete="new-password"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-destructive text-xs">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="confirmPassword">Confirmar senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Repita a senha"
          autoComplete="new-password"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="text-destructive text-xs">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <div className="flex items-start gap-2 pt-1">
        <Checkbox
          id="terms"
          checked={termsChecked === true}
          onCheckedChange={(checked) => {
            setValue('terms', checked === true ? true : (undefined as never), {
              shouldValidate: true,
            })
          }}
        />
        <Label htmlFor="terms" className="cursor-pointer text-sm font-normal">
          Eu aceito os{' '}
          <a href="/terms" className="text-primary underline">
            termos de uso
          </a>{' '}
          e a{' '}
          <a href="/privacy" className="text-primary underline">
            política de privacidade
          </a>
        </Label>
      </div>
      {errors.terms && (
        <p className="text-destructive text-xs">{errors.terms.message}</p>
      )}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        Criar conta e entrar
      </Button>
    </form>
  )
}

interface InvitationLoginFormProps {
  readonly invitation: InvitationData
  readonly onSuccess: (orgId: string) => void
}

function InvitationLoginForm({
  invitation,
  onSuccess,
}: InvitationLoginFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(values: LoginFormValues) {
    try {
      const result = await acceptInvitation(invitation.id, {
        mode: 'login',
        password: values.password,
      })
      onSuccess(result.organizationId)
    } catch (err) {
      const variant = resolveErrorVariant(err)
      if (variant === 'already_accepted') {
        toast.error('Convite já aceito', {
          description: 'Você já faz parte desta organização.',
        })
      } else {
        toast.error('Senha incorreta', {
          description: 'Verifique sua senha e tente novamente.',
        })
      }
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={invitation.email}
          readOnly
          className="bg-muted cursor-not-allowed"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="Sua senha"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && (
          <p className="text-destructive text-xs">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        Entrar e aceitar convite
      </Button>
    </form>
  )
}

interface InvitationErrorProps {
  readonly variant: 'expired' | 'already_accepted' | 'not_found'
}

function InvitationError({ variant }: InvitationErrorProps) {
  const router = useRouter()

  const config = {
    expired: {
      title: 'Convite expirado',
      message:
        'Este convite expirou. Entre em contato com quem te convidou para solicitar um novo.',
      action: null,
    },
    already_accepted: {
      title: 'Convite já aceito',
      message: 'Você já faz parte desta organização.',
      action: { label: 'Ir para o dashboard', href: '/dashboard' },
    },
    not_found: {
      title: 'Convite inválido',
      message: 'Este link pode estar incorreto ou o convite foi cancelado.',
      action: { label: 'Ir para login', href: '/login' },
    },
  } as const

  const { title, message, action } = config[variant]

  return (
    <div className="bg-card rounded-lg border p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 text-sm">{message}</p>
      {action && (
        <Button className="mt-6" onClick={() => router.push(action.href)}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const invitationId = searchParams.get('id')
  const [state, setState] = useState<PageState>({ kind: 'loading' })

  useEffect(() => {
    if (!invitationId) {
      setState({ kind: 'error', variant: 'not_found' })
      return
    }

    fetchInvitation(invitationId)
      .then((invitation) => {
        setState({
          kind: invitation.hasAccount ? 'login' : 'register',
          invitation,
        })
      })
      .catch((err: unknown) => {
        setState({ kind: 'error', variant: resolveErrorVariant(err) })
      })
  }, [invitationId])

  function handleSuccess(orgId: string) {
    setActiveOrgCookie(orgId)
    queryClient.clear()
    toast.success('Bem-vindo!', {
      description: 'Você entrou na organização com sucesso.',
    })
    router.push('/dashboard')
  }

  if (state.kind === 'loading') {
    return (
      <div className="bg-card flex flex-col items-center rounded-lg border p-8 shadow-sm">
        <Loader2 className="text-primary size-8 animate-spin" />
        <p className="text-muted-foreground mt-4 text-sm">
          Carregando convite...
        </p>
      </div>
    )
  }

  if (state.kind === 'error') {
    return <InvitationError variant={state.variant} />
  }

  return (
    <div className="bg-card rounded-lg border p-8 shadow-sm">
      <InvitationHeader invitation={state.invitation} />
      {state.kind === 'register' && (
        <InvitationRegisterForm
          invitation={state.invitation}
          onSuccess={handleSuccess}
        />
      )}
      {state.kind === 'login' && (
        <InvitationLoginForm
          invitation={state.invitation}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
