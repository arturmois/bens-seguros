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
        <Label htmlFor="email" className="text-slate-400">
          Email
        </Label>
        <Input
          {...form.register('email')}
          type="email"
          id="email"
          placeholder="seu@email.com"
          autoComplete="email"
          className="bg-white/4 border-white/10 text-slate-100 placeholder:text-slate-500"
        />
        {form.formState.errors.email && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-slate-400">
            Senha
          </Label>
          <Link
            href="/forgot-password"
            className="text-accent-500 hover:text-accent-400 text-sm"
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
            className="bg-white/4 border-white/10 text-slate-100 placeholder:text-slate-500"
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
        {form.formState.errors.password && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        className="from-accent-500 to-accent-400 hover:from-accent-600 hover:to-accent-500 bg-linear-to-r w-full font-bold text-slate-900"
        disabled={login.isPending}
      >
        {login.isPending ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
