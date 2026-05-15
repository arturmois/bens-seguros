'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { CreateClientBody as createClientBodySchema } from '@/api/endpoints/clients/clients.zod'
import { Button } from '@/components/ui/button'
import { AddressFieldsWithCep } from '@/features/address/components/address-fields-with-cep'

import { useCreateClient } from '../hooks/use-clients'
import type { ClientFormValues } from '../lib/types'
import {
  extractExistingClientId,
  isValidCnpj,
  isValidCpf,
} from '../lib/validation'
import { IdentificationFields } from './identification-fields'

const EMPTY_ADDRESS = {
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
} as const

const DEFAULT_VALUES: ClientFormValues = {
  legalName: '',
  document: '',
  personType: 'INDIVIDUAL',
  profession: null,
  maritalStatus: null,
  address: { ...EMPTY_ADDRESS },
  fiscalBirthDate: null,
}

const ADDRESS_FIELD_NAMES = {
  cep: 'address.cep',
  street: 'address.street',
  number: 'address.number',
  complement: 'address.complement',
  neighborhood: 'address.neighborhood',
  city: 'address.city',
  state: 'address.state',
} as const

function normalizeAddress(
  raw: ClientFormValues['address']
): ClientFormValues['address'] {
  if (!raw) return null
  const cepDigits = (raw.cep ?? '').replace(/\D/g, '')
  if (cepDigits.length === 0) return null
  return raw
}

const addressOrNull = z.preprocess((value) => {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object') return null
  const v = value as { cep?: unknown }
  const cep = typeof v.cep === 'string' ? v.cep.replace(/\D/g, '') : ''
  return cep.length === 0 ? null : value
}, createClientBodySchema.shape.address)

const clientFormSchema = createClientBodySchema
  .extend({ address: addressOrNull })
  .superRefine((data, ctx) => {
    const digits = (data.document ?? '').replace(/\D/g, '')
    if (data.personType === 'INDIVIDUAL' && !isValidCpf(digits)) {
      ctx.addIssue({
        path: ['document'],
        code: z.ZodIssueCode.custom,
        message: 'CPF inválido',
      })
    }
    if (data.personType === 'COMPANY' && !isValidCnpj(digits)) {
      ctx.addIssue({
        path: ['document'],
        code: z.ZodIssueCode.custom,
        message: 'CNPJ inválido',
      })
    }
  })

interface ClientFormProps {
  readonly onSuccess?: (clientId: string) => void
  readonly onCancel?: () => void
  readonly onPendingChange?: (pending: boolean) => void
  readonly hideFooter?: boolean
  readonly formId?: string
}

export function ClientForm({
  onSuccess,
  onCancel,
  onPendingChange,
  hideFooter,
  formId,
}: ClientFormProps) {
  const router = useRouter()
  const createMutation = useCreateClient()
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    mode: 'onBlur',
    defaultValues: DEFAULT_VALUES,
  })
  useEffect(() => {
    onPendingChange?.(createMutation.isPending)
  }, [createMutation.isPending, onPendingChange])
  function handleSubmit(values: ClientFormValues) {
    const digits = values.document.replace(/\D/g, '')
    const address = normalizeAddress(values.address)
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
        className="space-y-6"
        noValidate
      >
        <IdentificationFields />
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Endereço</h3>
          <div className="space-y-4">
            <AddressFieldsWithCep
              control={form.control}
              register={form.register}
              setValue={form.setValue}
              fieldNames={ADDRESS_FIELD_NAMES}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            Informe ao menos o CEP. Os demais campos são preenchidos
            automaticamente. Necessário para emissão da apólice.
          </p>
        </div>
        {!hideFooter && (
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelClick}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Criar cliente
            </Button>
          </div>
        )}
      </form>
    </FormProvider>
  )
}
