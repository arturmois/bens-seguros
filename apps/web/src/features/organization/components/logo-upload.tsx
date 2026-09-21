'use client'

import { useCallback, useRef } from 'react'
import { Building2, Loader2, Upload } from 'lucide-react'

import { cn } from '@/lib/utils'

import type { OrganizationData } from '../types'
import { useUploadLogo } from '../hooks/use-upload-logo'

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif'

interface LogoUploadProps {
  readonly organization: OrganizationData
  readonly isReadOnly: boolean
}

export function LogoUpload({ organization, isReadOnly }: LogoUploadProps) {
  const uploadLogo = useUploadLogo()
  const inputRef = useRef<HTMLInputElement>(null)
  const handleFile = useCallback(
    (file: File) => {
      uploadLogo.mutate(file)
    },
    [uploadLogo]
  )
  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (isReadOnly) return
    const file = event.dataTransfer.files[0]
    if (file) handleFile(file)
  }
  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
  }
  function handleClick() {
    if (isReadOnly) return
    inputRef.current?.click()
  }
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }
  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) handleFile(file)
    event.target.value = ''
  }
  return (
    <div className="space-y-2">
      <p className="font-medium text-sm">Logo</p>
      <div
        role="button"
        tabIndex={isReadOnly ? -1 : 0}
        aria-label="Enviar logo da organização"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          isReadOnly
            ? 'cursor-not-allowed border-muted'
            : 'cursor-pointer border-border hover:border-primary/50'
        )}
      >
        {uploadLogo.isPending ? (
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        ) : organization.logo ? (
          <img
            src={organization.logo}
            alt={`Logo de ${organization.name}`}
            className="max-h-36 max-w-full rounded object-contain"
          />
        ) : (
          <>
            <Building2 className="mb-2 size-10 text-muted-foreground" />
            {!isReadOnly && (
              <div className="text-center">
                <Upload className="mx-auto mb-1 size-4 text-muted-foreground" />
                <p className="text-muted-foreground text-xs">
                  Clique ou arraste uma imagem
                </p>
                <p className="text-muted-foreground/70 text-xs">
                  JPEG, PNG, WebP ou GIF. Max 2MB.
                </p>
              </div>
            )}
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={handleInputChange}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  )
}
