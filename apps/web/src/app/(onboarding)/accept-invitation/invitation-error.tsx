'use client'

import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'

import type { InvitationErrorVariant } from './invitation-types'

interface InvitationErrorProps {
  readonly variant: InvitationErrorVariant
}

const ERROR_CONFIG: Record<
  InvitationErrorVariant,
  {
    title: string
    message: string
    action: { label: string; href: string } | null
  }
> = {
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
}

export function InvitationError({ variant }: InvitationErrorProps) {
  const router = useRouter()
  const { title, message, action } = ERROR_CONFIG[variant]
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
