'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const registerSchema = z
  .object({
    name: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
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

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterForm() {
  const { register: registerMutation } = useAuth()
  const searchParams = useSearchParams()
  const invitationId = searchParams.get('invitationId') ?? undefined
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const acceptedTerms = form.watch('acceptedTerms')

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(
      {
        name: data.name,
        email: data.email,
        password: data.password,
        invitationId,
      },
      {
        onError: (error) => toast.error(error.message || 'Erro ao criar conta'),
      }
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-slate-400">
          Nome
        </Label>
        <Input
          {...form.register('name')}
          type="text"
          id="name"
          placeholder="Seu nome"
          autoComplete="name"
          className="border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
        />
        {form.formState.errors.name && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-400">
          Senha
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
          Confirmar Senha
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
          <label htmlFor="acceptedTerms" className="text-sm text-slate-400">
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

      <Button
        type="submit"
        className="from-accent-500 to-accent-400 hover:from-accent-600 hover:to-accent-500 w-full bg-gradient-to-r font-bold text-slate-900"
        disabled={registerMutation.isPending}
      >
        {registerMutation.isPending ? 'Criando conta...' : 'Criar Conta'}
      </Button>
    </form>
  )
}
