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
      <div className="flex items-center gap-4 rounded-lg border border-success/20 bg-success/10 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/20">
          <FileCheck className="h-5 w-5 text-success" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Apólice Emitida</p>
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
      <div className="flex items-center gap-4 rounded-lg border border-primary/20 bg-primary/10 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20">
          <FileCheck className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Pronta para Emissão</p>
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
