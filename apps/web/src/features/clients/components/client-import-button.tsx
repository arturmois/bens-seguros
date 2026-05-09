'use client'

import { Upload } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { ImportDialog } from './import-dialog'

export function ClientImportButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        aria-label="Importar clientes via CSV"
      >
        <Upload className="h-4 w-4 sm:mr-2" />
        <span className="hidden sm:inline">Importar</span>
      </Button>
      <ImportDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
