'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TurnstileWidget } from '@/features/auth/components/turnstile-widget'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

const registerSchema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme sua senha'),
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

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterForm() {
  const { register: registerMutation } = useAuth()
  const searchParams = useSearchParams()
  const invitationId = searchParams.get('invitationId') ?? undefined
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })
  const acceptedTerms = form.watch('acceptedTerms')
  const handleVerify = useCallback((token: string) => {
    setTurnstileToken(token)
  }, [])
  const handleExpire = useCallback(() => {
    setTurnstileToken(null)
  }, [])
  const handleError = useCallback(() => {
    setTurnstileToken(null)
  }, [])
  const onSubmit = (data: RegisterFormData) => {
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      toast.error('Complete a verificação anti-bot antes de continuar')
      return
    }
    registerMutation.mutate(
      {
        name: data.name,
        email: data.email,
        password: data.password,
        invitationId,
        ...(turnstileToken ? { turnstileToken } : {}),
      },
      {
        onError: (error) => {
          toast.error(error.message || 'Erro ao criar conta')
          setTurnstileToken(null)
        },
      }
    )
  }
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-(--auth-foreground-muted)">
          Nome
        </Label>
        <Input
          {...form.register('name')}
          type="text"
          id="name"
          placeholder="Seu nome"
          autoComplete="name"
          className="border-(--auth-input-border) bg-(--auth-input-bg) text-(--auth-foreground) placeholder:text-(--auth-foreground-subtle)"
        />
        {form.formState.errors.name && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email" className="text-(--auth-foreground-muted)">
          Email
        </Label>
        <Input
          {...form.register('email')}
          type="email"
          id="email"
          placeholder="seu@email.com"
          autoComplete="email"
          className="border-(--auth-input-border) bg-(--auth-input-bg) text-(--auth-foreground) placeholder:text-(--auth-foreground-subtle)"
        />
        {form.formState.errors.email && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-(--auth-foreground-muted)">
          Senha
        </Label>
        <div className="relative">
          <Input
            {...form.register('password')}
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="new-password"
            className="border-(--auth-input-border) bg-(--auth-input-bg) text-(--auth-foreground) placeholder:text-(--auth-foreground-subtle)"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-(--auth-foreground-muted) absolute right-0 top-0 h-full px-3 hover:bg-transparent"
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
        {form.formState.errors.password ? (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.password.message}
          </p>
        ) : (
          <p className="text-(--auth-foreground-subtle) text-xs">
            Mínimo de 8 caracteres
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="confirmPassword"
          className="text-(--auth-foreground-muted)"
        >
          Confirmar Senha
        </Label>
        <div className="relative">
          <Input
            {...form.register('confirmPassword')}
            type={showConfirmPassword ? 'text' : 'password'}
            id="confirmPassword"
            autoComplete="new-password"
            className="border-(--auth-input-border) bg-(--auth-input-bg) text-(--auth-foreground) placeholder:text-(--auth-foreground-subtle)"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-(--auth-foreground-muted) absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
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
          <label
            htmlFor="acceptedTerms"
            className="text-(--auth-foreground-muted) text-sm"
          >
            Li e aceito os{' '}
            <Link
              href="/terms"
              target="_blank"
              className="text-accent-400 hover:text-accent-300 underline"
            >
              Termos de Uso
            </Link>{' '}
            e a{' '}
            <Link
              href="/privacy"
              target="_blank"
              className="text-accent-400 hover:text-accent-300 underline"
            >
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
      {TURNSTILE_SITE_KEY && (
        <TurnstileWidget
          siteKey={TURNSTILE_SITE_KEY}
          onVerify={handleVerify}
          onExpire={handleExpire}
          onError={handleError}
          theme="auto"
        />
      )}
      <Button
        type="submit"
        className="from-accent-500 to-accent-400 hover:from-accent-600 hover:to-accent-500 text-primary-foreground w-full bg-gradient-to-r font-bold"
        disabled={
          registerMutation.isPending ||
          (TURNSTILE_SITE_KEY !== undefined && turnstileToken === null)
        }
      >
        {registerMutation.isPending ? 'Criando conta...' : 'Criar Conta'}
      </Button>
    </form>
  )
}
