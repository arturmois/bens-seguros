'use client'

import { Clock, Loader2, Mail, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'

import { useInvitations, useRevokeInvitation } from '../hooks/use-members'
import { ROLE_LABELS } from '../lib/member-schemas'
import type { InvitationData } from '../types'

interface PendingInvitationsProps {
  readonly canManage: boolean
}

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24

function getDaysUntilExpiry(expiresAt: string): number {
  return Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / MILLISECONDS_PER_DAY
  )
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() < Date.now()
}

export function PendingInvitations({ canManage }: PendingInvitationsProps) {
  const { data: invitations, isLoading } = useInvitations()
  const revokeInvitation = useRevokeInvitation()
  if (isLoading) {
    return <InvitationsSkeleton />
  }
  if (!invitations || invitations.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Mail />
          </EmptyMedia>
          <EmptyTitle>Nenhum convite pendente</EmptyTitle>
          <EmptyDescription>
            Convites enviados aparecerão aqui até serem aceitos ou expirarem.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  function handleRevoke(invitation: InvitationData) {
    const confirmed = window.confirm(
      `Revogar o convite enviado para ${invitation.email}?`
    )
    if (!confirmed) return
    revokeInvitation.mutate(invitation.id)
  }
  return (
    <div className="divide-y divide-border rounded-lg border">
      {invitations.map((invitation) => (
        <InvitationRow
          key={invitation.id}
          invitation={invitation}
          canManage={canManage}
          revokePending={revokeInvitation.isPending}
          onRevoke={handleRevoke}
        />
      ))}
    </div>
  )
}

interface InvitationRowProps {
  readonly invitation: InvitationData
  readonly canManage: boolean
  readonly revokePending: boolean
  readonly onRevoke: (invitation: InvitationData) => void
}

function InvitationRow({
  invitation,
  canManage,
  revokePending,
  onRevoke,
}: InvitationRowProps) {
  const expired = isExpired(invitation.expiresAt)
  const daysLeft = getDaysUntilExpiry(invitation.expiresAt)
  const sentAgo = formatDistanceToNow(new Date(invitation.createdAt), {
    addSuffix: true,
    locale: ptBR,
  })
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-sm">
            {invitation.email}
          </span>
          <Badge variant="outline" size="sm">
            {ROLE_LABELS[invitation.role] ?? invitation.role}
          </Badge>
          {expired && (
            <Badge variant="error" size="sm">
              Expirado
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-muted-foreground text-xs">
          <span>Enviado {sentAgo}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            {expired ? 'Expirado' : `${daysLeft}d restantes`}
          </span>
        </div>
      </div>
      {canManage && (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRevoke(invitation)}
          disabled={revokePending}
          aria-label={`Revogar convite para ${invitation.email}`}
        >
          {revokePending ? (
            <Loader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <Trash2 className="mr-1 size-4" />
          )}
          Revogar
        </Button>
      )}
    </div>
  )
}

function InvitationsSkeleton() {
  return (
    <div className="divide-y divide-border rounded-lg border">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="flex items-center justify-between px-4 py-3"
        >
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  )
}
