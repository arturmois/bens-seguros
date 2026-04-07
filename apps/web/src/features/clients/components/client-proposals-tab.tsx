'use client'

import { FileText } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
      <Button variant="link" asChild className="mt-2">
        <Link href={`/proposals?clientId=${clientId}`}>
          Ver todas as propostas
        </Link>
      </Button>
    </div>
  )
}
