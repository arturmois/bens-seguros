'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { ClaimFormDialog } from './claim-form-dialog'

export function ClaimCreateButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Novo Sinistro
      </Button>
      <ClaimFormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
