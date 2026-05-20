'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { AssistanceFormDialog } from './assistance-form-dialog'

export function AssistanceCreateButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nova Assistência
      </Button>
      <AssistanceFormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
