'use client'

import { Button } from '@/components/ui/button'

import { signOutAndReload } from './invitation-api'
import type { InvitationData } from './invitation-types'

interface InvitationWrongAccountProps {
  readonly invitation: InvitationData
}

export function InvitationWrongAccount({
  invitation,
}: InvitationWrongAccountProps) {
  const sessionEmail = invitation.currentSession?.email ?? ''
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
        Você está logado como <strong>{sessionEmail}</strong>, mas este convite
        é pra <strong>{invitation.email}</strong>. Saia da sessão atual pra
        continuar.
      </div>
      <Button
        type="button"
        variant="destructive"
        className="w-full"
        onClick={() => void signOutAndReload()}
      >
        Sair e abrir o convite novamente
      </Button>
    </div>
  )
}
