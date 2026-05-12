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

import { useCreateClient } from '../hooks/use-clients'
import type { ClientFormValues } from '../lib/types'
import {
  extractExistingClientId,
  isValidCnpj,
  isValidCpf,
} from '../lib/validation'
import { IdentificationFields } from './identification-fields'

const DEFAULT_VALUES: ClientFormValues = {
  legalName: '',
  document: '',
  personType: 'INDIVIDUAL',
  profession: null,
  maritalStatus: null,
  address: null,
  fiscalBirthDate: null,
}

const clientFormSchema = createClientBodySchema.superRefine((data, ctx) => {
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
    createMutation.mutate(
      { ...values, document: digits },
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
        className="space-y-4"
        noValidate
      >
        <IdentificationFields />
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
