'use client'

import { useCallback, useRef, useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

import { useUploadDocument } from '../hooks/use-documents'
import {
  getDocumentTypesForBranch,
  type InsuranceBranch,
} from '../lib/branch-document-types'
import type { DocumentEntityType, DocumentType } from '../types'

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`
  return `${String((bytes / (1024 * 1024)).toFixed(1))} MB`
}

function isAllowedMimeType(mimeType: string): boolean {
  if (mimeType.startsWith('image/')) return true
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType)
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

function PendingFileCard({
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

function UploadingIndicator() {
  return (
    <>
      <div className="size-8 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <p className="text-sm font-medium">Enviando documento...</p>
    </>
  )
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
  const branchHasSingleType = branch
    ? getDocumentTypesForBranch(branch).length === 1
    : false

  const clearPending = useCallback(() => {
    setPendingFile(null)
    setSelectedType('')
  }, [])

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
    [entityType, entityId, uploadDocument, clearPending, onUploadSuccess]
  )

  const validateAndStage = useCallback(
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

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (!hasPendingFile) setIsDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
  }

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

  function handleClick() {
    if (hasPendingFile) return
    fileInputRef.current?.click()
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

        {isUploadingWithoutPending ? (
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
