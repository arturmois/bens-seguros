'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { acceptInvitation, resolveAcceptError } from './invitation-api'
import type { InvitationData } from './invitation-types'

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

type RegisterFormValues = z.infer<typeof registerSchema>

interface InvitationRegisterFormProps {
  readonly invitation: InvitationData
  readonly onSuccess: (orgId: string) => void
}

export function InvitationRegisterForm({
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
