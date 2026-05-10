import { Building2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'

import { ROLE_LABELS, type InvitationData } from './invitation-types'

interface InvitationHeaderProps {
  readonly invitation: InvitationData
}

export function InvitationHeader({ invitation }: InvitationHeaderProps) {
  const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role
  return (
    <div className="mb-6 flex flex-col items-center gap-3 text-center">
      <div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
        <Building2 className="text-primary size-6" />
      </div>
      <div>
        <h2 className="text-xl font-semibold">
          Você foi convidado para{' '}
          <span className="text-primary">{invitation.organizationName}</span>
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {invitation.inviterName} te convidou como
        </p>
      </div>
      <Badge variant="secondary">{roleLabel}</Badge>
    </div>
  )
}
