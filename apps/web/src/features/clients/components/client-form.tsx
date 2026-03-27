'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

import { EMPTY_FORM_VALUES } from '../lib/constants'
import { clientFormSchema } from '../lib/schemas'
import type { ClientFormValues } from '../lib/schemas'
import { useCreateClient, useUpdateClient } from '../hooks/use-clients'
import { ClientFormFields } from './client-form-fields'

interface ClientFormProps {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly defaultValues?: ClientFormValues
  readonly clientId?: string
}

export function ClientForm({
  open,
  onOpenChange,
  defaultValues,
  clientId,
}: ClientFormProps) {
  const isEditMode = Boolean(clientId)
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const isPending = createClient.isPending || updateClient.isPending

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: defaultValues ?? EMPTY_FORM_VALUES,
  })

  useEffect(() => {
    if (!open) return
    form.reset(defaultValues ?? EMPTY_FORM_VALUES)
  }, [open, defaultValues, form])

  function handleSubmit(values: ClientFormValues) {
    if (isEditMode && clientId) {
      updateClient.mutate(
        { id: clientId, values },
        { onSuccess: () => onOpenChange(false) }
      )
      return
    }
    createClient.mutate(values, {
      onSuccess: () => onOpenChange(false),
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {isEditMode ? 'Editar Cliente' : 'Novo Cliente'}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Atualize as informações do cliente.'
              : 'Preencha os dados para cadastrar um novo cliente.'}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="mt-6 space-y-4 px-6"
        >
          <ClientFormFields form={form} isReadOnly={isEditMode} />

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? 'Salvar' : 'Criar Cliente'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
