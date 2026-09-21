'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
        <h2 className="mb-2 font-bold text-(--auth-foreground) text-xl">
          Verifique seu email
        </h2>
        <p className="mb-6 text-(--auth-foreground-muted) text-sm">
          Se o email informado estiver cadastrado, enviaremos um link para
          redefinir sua senha. O link expira em 1 hora.
        </p>
        <p className="text-(--auth-foreground-subtle) text-xs">
          Não recebeu? Verifique sua pasta de spam.
        </p>
      </div>
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
      <Button
        type="submit"
        className="w-full bg-gradient-to-r from-accent-500 to-accent-400 font-bold text-primary-foreground hover:from-accent-600 hover:to-accent-500"
        disabled={isPending}
      >
        {isPending ? 'Enviando...' : 'Enviar link de redefinição'}
      </Button>
    </form>
  )
}
