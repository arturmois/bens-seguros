'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import type { DocumentEntityType } from '../types'
import { useUploadDocument } from '../hooks/use-documents'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

interface DocumentUploadProps {
  readonly entityType: DocumentEntityType
  readonly entityId: string
  readonly onUploadSuccess?: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`
  return `${String((bytes / (1024 * 1024)).toFixed(1))} MB`
}

function isAllowedMimeType(mimeType: string): boolean {
  if (mimeType.startsWith('image/')) return true
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
}

export function DocumentUpload({
  entityType,
  entityId,
  onUploadSuccess,
}: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadDocument = useUploadDocument()

  const validateAndUpload = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(
          `Arquivo muito grande: ${formatFileSize(file.size)}. Maximo: 10 MB.`
        )
        return
      }

      if (!isAllowedMimeType(file.type)) {
        toast.error(
          'Tipo de arquivo nao permitido. Use imagens, PDF ou documentos Office.'
        )
        return
      }

      uploadDocument.mutate(
        { entityType, entityId, file },
        { onSuccess: () => onUploadSuccess?.() }
      )
    },
    [entityType, entityId, uploadDocument, onUploadSuccess]
  )

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)

    const file = e.dataTransfer.files[0]
    if (file) validateAndUpload(file)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) validateAndUpload(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClick() {
    fileInputRef.current?.click()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Arraste arquivos ou clique para enviar"
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors',
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/50',
        uploadDocument.isPending && 'pointer-events-none opacity-60'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={ALLOWED_MIME_TYPES.join(',')}
        onChange={handleFileInputChange}
      />

      {uploadDocument.isPending ? (
        <UploadingIndicator />
      ) : (
        <>
          <Upload className="text-muted-foreground size-8" />
          <div className="text-center">
            <p className="text-sm font-medium">
              Arraste arquivos ou clique para enviar
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Imagens, PDF ou documentos Office. Maximo 10 MB.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function UploadingIndicator() {
  return (
    <>
      <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <p className="text-sm font-medium">Enviando documento...</p>
    </>
  )
}
