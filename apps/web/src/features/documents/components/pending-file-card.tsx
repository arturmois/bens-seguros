'use client'

import { X } from 'lucide-react'
import { FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import type { DocumentType } from '../types'
import {
  getDocumentTypesForBranch,
  type InsuranceBranch,
} from '../lib/branch-document-types'

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`
  return `${String((bytes / (1024 * 1024)).toFixed(1))} MB`
}

interface PendingFileCardProps {
  readonly file: File
  readonly branch: InsuranceBranch
  readonly selectedType: DocumentType | ''
  readonly isUploading: boolean
  readonly onTypeChange: (value: DocumentType) => void
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function PendingFileCard({
  file,
  branch,
  selectedType,
  isUploading,
  onTypeChange,
  onConfirm,
  onCancel,
}: PendingFileCardProps) {
  const typeOptions = getDocumentTypesForBranch(branch)

  return (
    <div className="bg-muted/30 mt-3 flex items-start gap-3 rounded-lg border p-3">
      <FileText className="text-muted-foreground mt-0.5 size-5 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-muted-foreground text-xs">
            {formatFileSize(file.size)}
          </p>
        </div>
        <Select
          value={selectedType}
          onValueChange={(val) => {
            if (val) onTypeChange(val)
          }}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder="Tipo do documento" />
          </SelectTrigger>
          <SelectContent>
            {typeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={selectedType === '' || isUploading}
            onClick={onConfirm}
          >
            {isUploading ? 'Enviando...' : 'Enviar documento'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isUploading}
            onClick={onCancel}
          >
            <X className="mr-1 size-3.5" />
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  )
}
