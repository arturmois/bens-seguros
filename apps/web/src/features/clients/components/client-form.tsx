'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'

import { FormGrid } from '@/components/shared/form-grid'
import { FormSection } from '@/components/shared/form-section'
import { Button } from '@/components/ui/button'
import { AddressFieldsWithCep } from '@/features/address/components/address-fields-with-cep'

import { useCreateClient, useUpdateClient } from '../hooks/use-clients'
import {
  ADDRESS_FIELD_NAMES,
  buildInitialValues,
  clientFormSchema,
  normalizeAddress,
} from '../lib/client-form-schema'
import type { ClientDetail, ClientFormValues } from '../lib/types'
import { extractExistingClientId } from '../lib/validation'
import { IdentificationFields } from './identification-fields'
import { ProfileFields } from './profile-fields'

interface ClientFormProps {
  readonly mode?: 'create' | 'edit'
  readonly initial?: ClientDetail
  readonly onSuccess?: (clientId: string) => void
  readonly onCancel?: () => void
  readonly onPendingChange?: (pending: boolean) => void
  readonly hideFooter?: boolean
  readonly formId?: string
}

export function ClientForm({
  mode = 'create',
  initial,
  onSuccess,
  onCancel,
  onPendingChange,
  hideFooter,
  formId,
}: ClientFormProps) {
  const router = useRouter()
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const isPending = createMutation.isPending || updateMutation.isPending
  const isEdit = mode === 'edit'
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    mode: 'onBlur',
    defaultValues: buildInitialValues(initial),
  })
  useEffect(() => {
    onPendingChange?.(isPending)
  }, [isPending, onPendingChange])
  function handleSubmit(values: ClientFormValues) {
    const address = normalizeAddress(values.address)
    if (isEdit && initial) {
      const editable = {
        legalName: values.legalName,
        profession: values.profession,
        maritalStatus: values.maritalStatus,
        fiscalBirthDate: values.fiscalBirthDate,
        address,
      }
      updateMutation.mutate(
        { id: initial.id, data: editable },
        {
          onSuccess: () => {
            if (onSuccess) {
              onSuccess(initial.id)
              return
            }
            router.push(`/clients/${initial.id}`)
          },
        }
      )
      return
    }
    const digits = values.document.replace(/\D/g, '')
    createMutation.mutate(
      { ...values, document: digits, address },
      {
        onSuccess: (response) => {
          const id = response?.data?.data?.id
          if (!id) {
            toast.error('Resposta inesperada do servidor ao criar cliente')
            return
          }
          if (onSuccess) {
            onSuccess(id)
            return
          }
          router.push(`/clients/${id}`)
        },
        onError: (error: unknown) => {
          if (extractExistingClientId(error)) {
            form.setFocus('document')
          }
        },
      }
    )
  }
  function handleCancelClick() {
    if (onCancel) {
      onCancel()
      return
    }
    router.push('/clients')
  }
  return (
    <FormProvider {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-8"
        noValidate
      >
        <FormSection title="Identificação">
          <FormGrid columns={3}>
            <IdentificationFields disabled={isEdit} />
          </FormGrid>
        </FormSection>

        <FormSection title="Perfil">
          <FormGrid columns={3}>
            <ProfileFields />
          </FormGrid>
        </FormSection>

        <FormSection
          title="Endereço"
          description="Necessário para emissão da apólice."
        >
          <div className="space-y-4">
            <FormGrid columns={3}>
              <AddressFieldsWithCep
                control={form.control}
                register={form.register}
                setValue={form.setValue}
                fieldNames={ADDRESS_FIELD_NAMES}
              />
            </FormGrid>
            <p className="text-muted-foreground text-xs">
              Informe ao menos o CEP. Os demais campos são preenchidos
              automaticamente.
            </p>
          </div>
        </FormSection>

        {!hideFooter && (
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClick}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? 'Salvar alterações' : 'Criar cliente'}
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}
