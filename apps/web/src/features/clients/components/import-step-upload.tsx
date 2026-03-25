'use client'

import { Upload, FileText, Download } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface ImportStepUploadProps {
  readonly onFileSelect: (file: File) => void
  readonly isUploading: boolean
}

export function ImportStepUpload({
  onFileSelect,
  isUploading,
}: ImportStepUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        onFileSelect(file)
      }
    },
    [onFileSelect]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setIsDragging(false)
      const file = event.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      inputRef.current?.click()
    }
  }, [])

  return (
    <div className="flex flex-col gap-4 p-4">
      <div
        role="button"
        tabIndex={0}
        aria-label="Arraste um arquivo CSV ou clique para selecionar"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <Upload className="text-muted-foreground h-10 w-10" />
        <div className="text-center">
          <p className="text-sm font-medium">Arraste um arquivo CSV aqui</p>
          <p className="text-muted-foreground text-xs">
            ou clique para selecionar
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      <div className="flex items-center gap-2">
        <FileText className="text-muted-foreground h-4 w-4" />
        <a
          href={`${API_URL}/api/v1/clients/import/template`}
          download
          className="text-primary text-sm underline underline-offset-4 hover:no-underline"
        >
          <Download className="mr-1 inline h-3 w-3" />
          Baixar template CSV
        </a>
      </div>
    </div>
  )
}
