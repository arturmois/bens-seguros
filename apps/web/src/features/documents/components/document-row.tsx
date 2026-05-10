'use client'

import { Download, Eye, File, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'

import type { DocumentData } from '../lib/constants'
import { formatFileSize } from '../lib/format-file-size'
import { DocumentTypeBadge } from './document-type-badge'

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(dateStr))
}

interface DocumentRowProps {
  readonly document: DocumentData
  readonly onDelete: () => void
}

export function DocumentRow({ document, onDelete }: DocumentRowProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <File className="text-muted-foreground size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{document.fileName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <DocumentTypeBadge type={document.type} />
          <span className="text-muted-foreground text-xs">
            {formatFileSize(document.sizeBytes)}
          </span>
          <span className="text-muted-foreground text-xs">
            {formatDate(document.createdAt)}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <ViewDocumentButton
          documentId={document.id}
          fileName={document.fileName}
        />
        <DownloadDocumentButton
          documentId={document.id}
          fileName={document.fileName}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label={`Excluir ${document.fileName}`}
        >
          <Trash2 className="text-destructive size-4" />
        </Button>
      </div>
    </div>
  )
}

interface DocumentActionButtonProps {
  readonly documentId: string
  readonly fileName: string
}

function ViewDocumentButton({
  documentId,
  fileName,
}: DocumentActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  async function handleView() {
    setIsLoading(true)
    try {
      const response = await api.get<{ url: string }>(
        `/api/v1/documents/${documentId}/url`
      )
      window.open(response.data.url, '_blank', 'noopener')
    } catch {
      toast.error('Erro ao abrir documento')
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleView}
      disabled={isLoading}
      aria-label={`Visualizar ${fileName}`}
    >
      <Eye className="size-4" />
    </Button>
  )
}

function DownloadDocumentButton({
  documentId,
  fileName,
}: DocumentActionButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  async function handleDownload() {
    setIsLoading(true)
    try {
      const response = await api.get<{ url: string }>(
        `/api/v1/documents/${documentId}/url`
      )
      const fileResponse = await fetch(response.data.url)
      const blob = await fileResponse.blob()
      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileName
      link.click()
      URL.revokeObjectURL(objectUrl)
    } catch {
      toast.error('Erro ao baixar documento')
    } finally {
      setIsLoading(false)
    }
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDownload}
      disabled={isLoading}
      aria-label={`Baixar ${fileName}`}
    >
      <Download className="size-4" />
    </Button>
  )
}
