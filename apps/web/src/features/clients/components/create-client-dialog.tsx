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
import { Kbd } from '@/components/ui/kbd'

import { ClientForm } from './client-form'

interface CreateClientDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onCreated: (clientId: string) => void
}

const FORM_ID = 'create-client-form'

export function CreateClientDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateClientDialogProps) {
  const [isPending, setIsPending] = useState(false)
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isPending && !next) return
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
          <DialogDescription>
            Cadastre o essencial — você pode completar depois.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <ClientForm
            hideFooter
            formId={FORM_ID}
            onSuccess={onCreated}
            onPendingChange={setIsPending}
          />
        </DialogPanel>
        <DialogFooter className="flex items-center">
          <div className="text-muted-foreground mr-auto flex items-center gap-1 text-xs">
            <Kbd>↵</Kbd>
            <span>criar</span>
            <span className="opacity-50">·</span>
            <Kbd>Esc</Kbd>
            <span>fechar</span>
          </div>
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
            Criar cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
