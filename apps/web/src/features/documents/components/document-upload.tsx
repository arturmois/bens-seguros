'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import type { InsuranceBranch } from '@/features/proposals/types'

import { useUploadDocument } from '../hooks/use-documents'
import { getDocumentTypesForBranch } from '../lib/branch-document-types'
import { formatFileSize } from '../lib/format-file-size'
import type { DocumentEntityType, DocumentType } from '../types'
import { PendingFileCard } from './pending-file-card'

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
  readonly branch?: InsuranceBranch
  readonly onUploadSuccess?: () => void
}

function isAllowedMimeType(mimeType: string): boolean {
  if (mimeType.startsWith('image/')) return true
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
}

export function DocumentUpload({
  entityType,
  entityId,
  branch,
  onUploadSuccess,
}: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [selectedType, setSelectedType] = useState<DocumentType | ''>('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadDocument = useUploadDocument()

  const hasPendingFile = pendingFile !== null
  const branchHasSingleType =
    branch !== undefined && getDocumentTypesForBranch(branch).length === 1

  function clearPending() {
    setPendingFile(null)
    setSelectedType('')
  }

  const uploadFile = useCallback(
    (file: File, type: DocumentType) => {
      uploadDocument.mutate(
        { entityType, entityId, file, type },
        {
          onSuccess: () => {
            clearPending()
            onUploadSuccess?.()
          },
        }
      )
    },
    [entityType, entityId, uploadDocument, onUploadSuccess]
  )

  const validateAndStage = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error(
          `Arquivo muito grande: ${formatFileSize(file.size)}. Máximo: 10 MB.`
        )
        return
      }

      if (!isAllowedMimeType(file.type)) {
        toast.error(
          'Tipo de arquivo não permitido. Use imagens, PDF ou documentos Office.'
        )
        return
      }

      if (!branch || branchHasSingleType) {
        const types = branch ? getDocumentTypesForBranch(branch) : []
        const defaultType = types[0]?.value ?? 'OTHER'
        uploadFile(file, defaultType)
        return
      }

      setPendingFile(file)
      setSelectedType('')
    },
    [branch, branchHasSingleType, uploadFile]
  )

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    if (hasPendingFile) return
    const file = e.dataTransfer.files[0]
    if (file) validateAndStage(file)
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) validateAndStage(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleConfirm() {
    if (!pendingFile || selectedType === '') return
    uploadFile(pendingFile, selectedType)
  }

  const isUploadingWithoutPending = uploadDocument.isPending && !hasPendingFile

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Arraste arquivos ou clique para enviar"
        aria-disabled={hasPendingFile || undefined}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          (hasPendingFile || isUploadingWithoutPending) &&
            'pointer-events-none opacity-60'
        )}
        onDragOver={(e) => {
          e.preventDefault()
          if (!hasPendingFile) setIsDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setIsDragOver(false)
        }}
        onDrop={handleDrop}
        onClick={() => {
          if (!hasPendingFile) fileInputRef.current?.click()
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!hasPendingFile) fileInputRef.current?.click()
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

        {isUploadingWithoutPending ? (
          <>
            <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
            <p className="text-sm font-medium">Enviando documento...</p>
          </>
        ) : (
          <>
            <Upload className="text-muted-foreground size-8" />
            <div className="text-center">
              <p className="text-sm font-medium">
                Arraste arquivos ou clique para enviar
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                Imagens, PDF ou documentos Office. Máximo 10 MB.
              </p>
            </div>
          </>
        )}
      </div>

      {hasPendingFile && branch && (
        <PendingFileCard
          file={pendingFile}
          branch={branch}
          selectedType={selectedType}
          isUploading={uploadDocument.isPending}
          onTypeChange={setSelectedType}
          onConfirm={handleConfirm}
          onCancel={clearPending}
        />
      )}
    </div>
  )
}
