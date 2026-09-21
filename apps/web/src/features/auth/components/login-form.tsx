'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
})

type LoginFormData = z.infer<typeof loginSchema>

export function LoginForm() {
  const { login } = useAuth()
  const searchParams = useSearchParams()
  const invitationId = searchParams.get('invitationId') ?? undefined
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })
  const onSubmit = (data: LoginFormData) => {
    login.mutate(
      { ...data, invitationId },
      {
        onError: () => toast.error('Email ou senha incorretos'),
      }
    )
  }
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-(--auth-foreground-muted)">
            Senha
          </Label>
          <Link
            href="/forgot-password"
            className="text-accent-500 text-sm hover:text-accent-400"
          >
            Esqueceu?
          </Link>
        </div>
        <div className="relative">
          <Input
            {...form.register('password')}
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            className="border-(--auth-input-border) bg-(--auth-input-bg) text-(--auth-foreground) placeholder:text-(--auth-foreground-subtle)"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 h-full px-3 text-(--auth-foreground-muted) hover:bg-transparent"
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
        {form.formState.errors.password && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full bg-linear-to-r from-accent-500 to-accent-400 font-bold text-primary-foreground hover:from-accent-600 hover:to-accent-500"
        disabled={login.isPending}
      >
        {login.isPending ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
