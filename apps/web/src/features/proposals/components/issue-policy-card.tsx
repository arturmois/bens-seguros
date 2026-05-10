'use client'

import { ExternalLink, FileCheck } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { IssuePolicyDialog } from './issue-policy-dialog'

interface IssuePolicyCardProps {
  readonly proposalId: string
  readonly policyId?: string | null
}

export function IssuePolicyCard({
  proposalId,
  policyId,
}: IssuePolicyCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false)
  if (policyId) {
    return (
      <div className="bg-success/10 border-success/20 flex items-center gap-4 rounded-lg border p-4">
        <div className="bg-success/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <FileCheck className="text-success h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Apólice Emitida</p>
          <p className="text-muted-foreground text-sm">
            Esta proposta já possui uma apólice vinculada.
          </p>
        </div>
        <Button
          variant="outline"
          render={<Link href={`/policies/${policyId}`} />}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Ver Apólice
        </Button>
      </div>
    )
  }
  return (
    <>
      <div className="bg-primary/10 border-primary/20 flex items-center gap-4 rounded-lg border p-4">
        <div className="bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <FileCheck className="text-primary h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Pronta para Emissão</p>
          <p className="text-muted-foreground text-sm">
            Esta proposta atingiu o estágio final. Emita a apólice para ativar a
            cobertura do segurado.
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>Emitir Apólice</Button>
      </div>
      <IssuePolicyDialog
        proposalId={proposalId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  )
}
