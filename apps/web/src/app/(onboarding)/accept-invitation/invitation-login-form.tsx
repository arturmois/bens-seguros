'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { acceptInvitation, resolveAcceptError } from './invitation-api'
import type { InvitationData } from './invitation-types'

const loginSchema = z.object({
  password: z.string().min(1, 'Senha é obrigatória'),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface InvitationLoginFormProps {
  readonly invitation: InvitationData
  readonly onSuccess: (orgId: string) => void
}

export function InvitationLoginForm({
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
      const info = resolveAcceptError(err)
      toast.error(info.title, { description: info.description })
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
          className="cursor-not-allowed bg-muted"
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
      <div className="pt-1 text-center text-muted-foreground text-xs">
        <a href="/reset-password" className="underline hover:text-foreground">
          Esqueci minha senha
        </a>
      </div>
    </form>
  )
}
