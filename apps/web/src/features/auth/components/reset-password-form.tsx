'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

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
  if (!token || error) {
    return (
      <div className="flex flex-col items-center text-center">
        <h2 className="mb-2 font-bold text-(--auth-foreground) text-xl">
          Link inválido ou expirado
        </h2>
        <p className="mb-6 text-(--auth-foreground-muted) text-sm">
          O link de redefinição de senha expirou ou é inválido. Solicite um novo
          link.
        </p>
        <Link
          href="/forgot-password"
          className="text-accent-500 text-sm hover:text-accent-400"
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
        <Label htmlFor="password" className="text-(--auth-foreground-muted)">
          Nova Senha
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
        <p className="text-(--auth-foreground-subtle) text-xs">
          Mínimo de 8 caracteres
        </p>
        {form.formState.errors.password && (
          <p role="alert" className="text-destructive text-sm">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label
          htmlFor="confirmPassword"
          className="text-(--auth-foreground-muted)"
        >
          Confirmar Nova Senha
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
            className="absolute top-0 right-0 h-full px-3 text-(--auth-foreground-muted) hover:bg-transparent"
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
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-accent-500 to-accent-400 font-bold text-primary-foreground hover:from-accent-600 hover:to-accent-500"
        disabled={isPending}
      >
        {isPending ? 'Redefinindo...' : 'Redefinir Senha'}
      </Button>
    </form>
  )
}
