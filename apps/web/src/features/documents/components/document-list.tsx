'use client'

import { useState } from 'react'
import { Download, Eye, File, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'

import { api } from '@/lib/api-client'

import type { DocumentData, DocumentEntityType } from '../types'
import { useDeleteDocument, useDocuments } from '../hooks/use-documents'
import { formatFileSize } from '../lib/format-file-size'
import { DocumentTypeBadge } from './document-type-badge'

interface DocumentListProps {
  readonly entityType: DocumentEntityType
  readonly entityId: string
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(dateStr))
}

export function DocumentList({ entityType, entityId }: DocumentListProps) {
  const { data, isLoading, isError, refetch } = useDocuments(
    entityType,
    entityId
  )
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null)

  if (isLoading) return <DocumentListSkeleton />

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <p className="text-destructive text-sm">Erro ao carregar documentos.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <File className="text-muted-foreground size-10" />
        <p className="text-muted-foreground text-sm">
          Nenhum documento anexado
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="divide-y rounded-md border">
        {data.map((doc) => (
          <DocumentRow
            key={doc.id}
            document={doc}
            onDelete={() => setDeletingDocId(doc.id)}
          />
        ))}
      </div>

      <DeleteDocumentDialog
        open={deletingDocId !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingDocId(null)
        }}
        documentId={deletingDocId}
        onDeleted={() => setDeletingDocId(null)}
      />
    </>
  )
}

function DocumentRow({
  document,
  onDelete,
}: {
  readonly document: DocumentData
  readonly onDelete: () => void
}) {
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

function ViewDocumentButton({
  documentId,
  fileName,
}: {
  readonly documentId: string
  readonly fileName: string
}) {
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
}: {
  readonly documentId: string
  readonly fileName: string
}) {
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

function DeleteDocumentDialog({
  open,
  onOpenChange,
  documentId,
  onDeleted,
}: {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly documentId: string | null
  readonly onDeleted: () => void
}) {
  const deleteDocument = useDeleteDocument()

  function handleConfirm() {
    if (!documentId) return
    deleteDocument.mutate(documentId, { onSuccess: onDeleted })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir documento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este documento? Esta acao nao pode
            ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            render={
              <Button variant="outline" disabled={deleteDocument.isPending}>
                Cancelar
              </Button>
            }
          />
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteDocument.isPending}
          >
            {deleteDocument.isPending ? 'Excluindo...' : 'Excluir'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DocumentListSkeleton() {
  return (
    <div className="divide-y rounded-md border">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={`doc-skel-${String(i)}`}
          className="flex items-center gap-3 px-4 py-3"
        >
          <Skeleton className="size-5 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}
