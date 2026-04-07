'use client'

import { Shield } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface ClientPoliciesTabProps {
  readonly clientId: string
}

export function ClientPoliciesTab({ clientId }: ClientPoliciesTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Shield className="text-muted-foreground mb-3 h-10 w-10" />
      <p className="text-muted-foreground text-sm">
        As apólices deste cliente aparecerão aqui.
      </p>
      <Button variant="link" asChild className="mt-2">
        <Link href={`/policies?clientId=${clientId}`}>
          Ver todas as apólices
        </Link>
      </Button>
    </div>
  )
}
