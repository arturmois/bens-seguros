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
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Importar clientes via CSV"
      >
        <Upload className="mr-2 h-4 w-4" />
        Importar
      </Button>
      <ImportDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
