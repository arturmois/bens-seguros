'use client'

import { useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
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

import { type z } from 'zod'

import { CreateClientBody } from '@/api/endpoints/clients/clients.zod'

import { EMPTY_FORM_VALUES } from '../lib/constants'
import { useCreateClient, useUpdateClient } from '../hooks/use-clients'

type ClientFormValues = z.infer<typeof CreateClientBody>
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
    resolver: zodResolver(CreateClientBody),
    defaultValues: defaultValues ?? EMPTY_FORM_VALUES,
  })

  useEffect(() => {
    if (!open) return
    form.reset(defaultValues ?? EMPTY_FORM_VALUES)
  }, [open, defaultValues, form])

  function handleSubmit(values: ClientFormValues) {
    const sm = values.socialMedia
    const cleanedSocialMedia = sm
      ? {
          ...(sm.instagram ? { instagram: sm.instagram } : {}),
          ...(sm.facebook ? { facebook: sm.facebook } : {}),
          ...(sm.linkedin ? { linkedin: sm.linkedin } : {}),
          ...(sm.tiktok ? { tiktok: sm.tiktok } : {}),
        }
      : undefined

    const hasSocialMedia =
      cleanedSocialMedia && Object.keys(cleanedSocialMedia).length > 0
    const payload: ClientFormValues = {
      ...values,
      socialMedia: hasSocialMedia ? cleanedSocialMedia : undefined,
    }

    if (isEditMode && clientId) {
      updateClient.mutate(
        { id: clientId, values: payload },
        { onSuccess: () => onOpenChange(false) }
      )
      return
    }
    createClient.mutate(payload, {
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

        <FormProvider {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="mt-6 space-y-4 px-6"
          >
            <ClientFormFields isReadOnly={isEditMode} />

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
        </FormProvider>
      </SheetContent>
    </Sheet>
  )
}
