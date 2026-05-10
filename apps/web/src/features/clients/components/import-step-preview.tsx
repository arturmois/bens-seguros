'use client'

import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import type { ImportPreviewResponse } from '../types/import-types'

interface ImportStepPreviewProps {
  readonly preview: ImportPreviewResponse
  readonly onConfirm: () => void
  readonly onCancel: () => void
  readonly isConfirming: boolean
}

export function ImportStepPreview({
  preview,
  onConfirm,
  onCancel,
  isConfirming,
}: ImportStepPreviewProps) {
  const { validationSummary } = preview
  const firstRow = preview.preview[0]
  const columns = firstRow ? Object.keys(firstRow) : []
  return (
    <div className="flex flex-col gap-4 overflow-hidden p-4">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          {validationSummary.valid} validos
        </span>
        <span className="flex items-center gap-1">
          <AlertCircle className="text-destructive h-4 w-4" />
          {validationSummary.invalid} com erros
        </span>
        <span className="text-muted-foreground">
          {validationSummary.total} total
        </span>
      </div>
      {validationSummary.errors.length > 0 && (
        <div className="bg-destructive/10 rounded-md p-3">
          <p className="text-destructive text-sm font-medium">
            Erros encontrados:
          </p>
          <ul className="mt-1 list-inside list-disc text-sm">
            {validationSummary.errors.slice(0, 5).map((err) => (
              <li
                key={`${err.row}-${err.field}-${err.message}`}
                className="text-destructive"
              >
                Linha {err.row} ({err.field}): {err.message}
              </li>
            ))}
            {validationSummary.errors.length > 5 && (
              <li className="text-muted-foreground">
                e mais {validationSummary.errors.length - 5} erros...
              </li>
            )}
          </ul>
        </div>
      )}
      <div className="overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              {columns.map((col) => (
                <TableHead key={col}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.preview.slice(0, 5).map((row, index) => (
              <TableRow key={index}>
                <TableCell className="text-muted-foreground">
                  {index + 1}
                </TableCell>
                {columns.map((col) => (
                  <TableCell
                    key={`${index}-${col}`}
                    className="max-w-[150px] truncate"
                  >
                    {row[col]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
          Cancelar
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isConfirming || validationSummary.valid === 0}
        >
          {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Importar {validationSummary.valid} clientes
        </Button>
      </div>
    </div>
  )
}
