'use client'

import { Loader2 } from 'lucide-react'

import { Progress } from '@/components/ui/progress'

import type { ImportStatusResponse } from '../types/import-types'

interface ImportStepProcessingProps {
  readonly status: ImportStatusResponse | undefined
}

export function ImportStepProcessing({ status }: ImportStepProcessingProps) {
  const processed = status?.progress.processed ?? 0
  const total = status?.progress.total ?? 1
  const percentage = total > 0 ? Math.round((processed / total) * 100) : 0
  return (
    <div className="flex flex-col items-center gap-6 p-8">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="w-full space-y-2">
        <div className="flex justify-between text-sm">
          <span>Processando...</span>
          <span className="text-muted-foreground tabular-nums">
            {processed}/{total}
          </span>
        </div>
        <Progress value={percentage} />
      </div>
      <p className="text-muted-foreground text-sm">
        Não feche esta janela enquanto a importação está em andamento.
      </p>
    </div>
  )
}
