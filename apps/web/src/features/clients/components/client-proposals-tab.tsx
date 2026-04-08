'use client'

import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import Link from 'next/link'

interface ClientProposalsTabProps {
  readonly clientId: string
}

export function ClientProposalsTab({ clientId }: ClientProposalsTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileText className="text-muted-foreground mb-3 h-10 w-10" />
      <p className="text-muted-foreground text-sm">
        As propostas deste cliente aparecerão aqui.
      </p>
      <Button
        variant="link"
        className="mt-2"
        render={<Link href={`/proposals?clientId=${clientId}`} />}
      >
        Ver todas as propostas
      </Button>
    </div>
  )
}
