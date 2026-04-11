'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

import { InsurerFormDialog } from './insurer-form-dialog'

export function InsurerCreateButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nova Seguradora
      </Button>
      <InsurerFormDialog open={open} onOpenChange={setOpen} />
    </>
  )
}
