'use client'

import { File } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { useDocuments } from '../hooks/use-documents'
import type { DocumentEntityType } from '../lib/constants'
import { DeleteDocumentDialog } from './delete-document-dialog'
import { DocumentListSkeleton } from './document-list-skeleton'
import { DocumentRow } from './document-row'

interface DocumentListProps {
  readonly entityType: DocumentEntityType
  readonly entityId: string
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
