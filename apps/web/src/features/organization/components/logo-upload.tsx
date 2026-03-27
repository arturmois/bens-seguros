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
      <p className="text-sm font-medium">Logo</p>
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
            ? 'border-muted cursor-not-allowed'
            : 'border-border hover:border-primary/50 cursor-pointer'
        )}
      >
        {uploadLogo.isPending ? (
          <Loader2 className="text-muted-foreground size-8 animate-spin" />
        ) : organization.logo ? (
          <img
            src={organization.logo}
            alt={`Logo de ${organization.name}`}
            className="max-h-36 max-w-full rounded object-contain"
          />
        ) : (
          <>
            <Building2 className="text-muted-foreground mb-2 size-10" />
            {!isReadOnly && (
              <div className="text-center">
                <Upload className="text-muted-foreground mx-auto mb-1 size-4" />
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
