'use client'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

import { useDeleteDocument } from '../hooks/use-documents'

interface DeleteDocumentDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly documentId: string | null
  readonly onDeleted: () => void
}

export function DeleteDocumentDialog({
  open,
  onOpenChange,
  documentId,
  onDeleted,
}: DeleteDocumentDialogProps) {
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
            Tem certeza que deseja excluir este documento? Esta ação não pode
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
