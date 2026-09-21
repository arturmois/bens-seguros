'use client'

import { CheckCircle2, SkipForward, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'

import type { ImportStatusResponse } from '../types/import-types'

interface ImportStepResultsProps {
  readonly status: ImportStatusResponse
  readonly onClose: () => void
}

export function ImportStepResults({ status, onClose }: ImportStepResultsProps) {
  const { progress } = status
  const hasErrors = progress.errors.length > 0
  const isFailed = status.status === 'failed'
  return (
    <div className="flex flex-col gap-4 p-4">
      <div
        className={`flex items-center gap-2 rounded-md p-3 ${
          isFailed ? 'bg-destructive/10' : 'bg-success/10'
        }`}
      >
        {isFailed ? (
          <XCircle className="h-5 w-5 text-destructive" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-success" />
        )}
        <span className="font-medium text-sm">
          {isFailed ? 'Importação falhou' : 'Importação concluída'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 rounded-md border p-3">
          <CheckCircle2 className="h-4 w-4 text-success" />
          <div>
            <p className="font-semibold text-lg tabular-nums">
              {progress.created}
            </p>
            <p className="text-muted-foreground text-xs">Criados</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md border p-3">
          <SkipForward className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="font-semibold text-lg tabular-nums">
              {progress.skipped}
            </p>
            <p className="text-muted-foreground text-xs">Ignorados</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-md border p-3">
          <XCircle className="h-4 w-4 text-destructive" />
          <div>
            <p className="font-semibold text-lg tabular-nums">
              {progress.failed}
            </p>
            <p className="text-muted-foreground text-xs">Falharam</p>
          </div>
        </div>
      </div>
      {hasErrors && (
        <div className="max-h-40 overflow-auto rounded-md bg-destructive/10 p-3">
          <p className="mb-1 font-medium text-destructive text-sm">Erros:</p>
          <ul className="list-inside list-disc text-sm">
            {progress.errors.slice(0, 20).map((err) => (
              <li
                key={`${err.row}-${err.message}`}
                className="text-destructive"
              >
                Linha {err.row}: {err.message}
              </li>
            ))}
            {progress.errors.length > 20 && (
              <li className="text-muted-foreground">
                e mais {progress.errors.length - 20} erros...
              </li>
            )}
          </ul>
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={onClose}>Fechar</Button>
      </div>
    </div>
  )
}
