'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import type { z } from 'zod'

import { Button } from '@/components/ui/button'

import { CreateClientBody } from '@/api/endpoints/clients/clients.zod'
import { useCreateClient, useUpdateClient } from '../hooks/use-clients'
import { EMPTY_FORM_VALUES } from '../lib/constants'
import { ClientFormFields } from './client-form-fields'

const ClientFormSchema = CreateClientBody

type ClientFormValues = z.infer<typeof ClientFormSchema>

interface ClientFormProps {
  readonly defaultValues?: ClientFormValues
  readonly clientId?: string
  readonly onSuccess?: () => void
  readonly onCancel?: () => void
}

export function ClientForm({
  defaultValues,
  clientId,
  onSuccess,
  onCancel,
}: ClientFormProps) {
  const isEditing = Boolean(clientId)
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const isPending = createClient.isPending || updateClient.isPending

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(ClientFormSchema),
    defaultValues: defaultValues ?? EMPTY_FORM_VALUES,
  })

  useEffect(() => {
    if (defaultValues) {
      form.reset(defaultValues)
    }
  }, [defaultValues, form])

  function cleanSocialMedia(
    social: ClientFormValues['socialMedia']
  ): ClientFormValues['socialMedia'] {
    if (!social) return undefined
    const result: ClientFormValues['socialMedia'] = {}
    if (social.instagram?.trim()) result.instagram = social.instagram.trim()
    if (social.facebook?.trim()) result.facebook = social.facebook.trim()
    if (social.linkedin?.trim()) result.linkedin = social.linkedin.trim()
    if (social.tiktok?.trim()) result.tiktok = social.tiktok.trim()
    return Object.keys(result).length > 0 ? result : undefined
  }

  function onSubmit(values: ClientFormValues) {
    const payload = {
      ...values,
      socialMedia: cleanSocialMedia(values.socialMedia),
    }

    if (isEditing && clientId) {
      updateClient.mutate({ id: clientId, values: payload }, { onSuccess })
    } else {
      createClient.mutate(payload, { onSuccess })
    }
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ClientFormFields isReadOnly={isEditing} />

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEditing ? 'Salvar Alterações' : 'Cadastrar Cliente'}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
        </div>
      </form>
    </FormProvider>
  )
}

export type { ClientFormValues }
