'use client';

import { useState } from 'react';
import { FileCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { IssuePolicySheet } from './issue-policy-sheet';

interface IssuePolicyCardProps {
  readonly proposalId: string;
}

export function IssuePolicyCard({ proposalId }: IssuePolicyCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div className="bg-primary/10 border-primary/20 flex items-center gap-4 rounded-lg border p-4">
        <div className="bg-primary/20 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <FileCheck className="text-primary h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Pronta para Emissao</p>
          <p className="text-muted-foreground text-sm">
            Esta proposta atingiu o estagio final. Emita a apolice para ativar a cobertura do
            segurado.
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>Emitir Apolice</Button>
      </div>

      <IssuePolicySheet proposalId={proposalId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
