'use client'

import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogTitle,
} from '@/components/ui/dialog'

import { ContactForm } from './contact-form'

interface CreateContactDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onCreated: (contactId: string) => void
}

const FORM_ID = 'create-contact-form'

export function CreateContactDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateContactDialogProps) {
  const [isPending, setIsPending] = useState(false)
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending && !next) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo contato</DialogTitle>
          <DialogDescription>
            CPF/CNPJ é opcional — você pode promover a cliente depois.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <ContactForm
            mode="create"
            hideFooter
            formId={FORM_ID}
            onSuccess={onCreated}
            onPendingChange={setIsPending}
          />
        </DialogPanel>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" form={FORM_ID} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Criar contato
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
