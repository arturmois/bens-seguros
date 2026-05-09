'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { useLgpdDeleteClient } from '../hooks/use-lgpd-delete-client'

interface LgpdDeleteDialogProps {
  readonly clientId: string
  readonly clientName: string
}

interface LgpdDeleteDialogTriggerProps {
  readonly clientId: string
  readonly clientName: string
}

export function LgpdDeleteDialogTrigger({
  clientId,
  clientName,
}: LgpdDeleteDialogTriggerProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Exclusão LGPD
      </Button>
      <LgpdDeleteDialog
        clientId={clientId}
        clientName={clientName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

interface LgpdDeleteDialogControlledProps extends LgpdDeleteDialogProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}

export function LgpdDeleteDialog({
  clientId,
  clientName,
  open,
  onOpenChange,
}: LgpdDeleteDialogControlledProps) {
  const [confirmation, setConfirmation] = useState('')
  const { mutate, isPending } = useLgpdDeleteClient()

  const isConfirmed = confirmation === clientName

  function handleConfirm() {
    mutate(clientId, {
      onSuccess: () => {
        onOpenChange(false)
        setConfirmation('')
      },
    })
  }

  function handleOpenChange(next: boolean) {
    if (!next) setConfirmation('')
    onOpenChange(next)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exclusão LGPD — Ação Irreversível</AlertDialogTitle>
          <AlertDialogDescription>
            Todos os dados pessoais deste cliente serão anonimizados
            permanentemente. Registros fiscais (propostas, apólices, comissões)
            serão mantidos por 5 anos conforme legislação. Para confirmar,
            digite o nome do cliente abaixo:
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 px-6 pb-4">
          <Label htmlFor="lgpd-confirm">
            Digite <span className="font-semibold">{clientName}</span> para
            confirmar
          </Label>
          <Input
            id="lgpd-confirm"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={clientName}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogClose
            render={
              <Button variant="outline" disabled={isPending}>
                Cancelar
              </Button>
            }
          />
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmed || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isPending ? 'Excluindo...' : 'Excluir dados'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
