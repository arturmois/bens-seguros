'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import { acceptInvitation, resolveAcceptError } from './invitation-api'
import type { InvitationData } from './invitation-types'

interface InvitationAcceptAsCurrentProps {
  readonly invitation: InvitationData
  readonly onSuccess: (orgId: string) => void
}

export function InvitationAcceptAsCurrent({
  invitation,
  onSuccess,
}: InvitationAcceptAsCurrentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  async function handleAccept() {
    setIsSubmitting(true)
    try {
      const result = await acceptInvitation(invitation.id, {
        mode: 'current-session',
      })
      onSuccess(result.organizationId)
    } catch (err) {
      const info = resolveAcceptError(err)
      toast.error(info.title, { description: info.description })
    } finally {
      setIsSubmitting(false)
    }
  }
  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-md border p-3 text-sm">
        Você está logado como <strong>{invitation.email}</strong> — basta um
        clique pra aceitar este convite.
      </div>
      <Button
        type="button"
        className="w-full"
        disabled={isSubmitting}
        onClick={handleAccept}
      >
        {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
        Aceitar convite
      </Button>
    </div>
  )
}
