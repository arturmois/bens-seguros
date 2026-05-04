'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import {
  type FieldValues,
  FormProvider,
  useForm,
  useFormContext,
} from 'react-hook-form'

import { CreateClientBody as createClientBodySchema } from '@/api/endpoints/clients/clients.zod'
import { Button } from '@/components/ui/button'
import { AddressFieldsWithCep } from '@/features/address/components/address-fields-with-cep'

import { useCreateClient } from '../hooks/use-clients'
import type { ClientFormValues } from '../lib/types'
import { IdentificationFields } from './identification-fields'
import { PersonalInfoFields } from './personal-info-fields'

const DEFAULT_VALUES: ClientFormValues = {
  legalName: '',
  document: '',
  personType: 'INDIVIDUAL',
  profession: null,
  maritalStatus: null,
  address: null,
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

// Adapter: reads the FormProvider context as FieldValues (widening) so that
// AddressFieldsWithCep — which expects Control<FieldValues> — receives compatible helpers.
function AddressSection() {
  const { control, register, setValue } = useFormContext<FieldValues>()
  return (
    <AddressFieldsWithCep
      control={control}
      register={register}
      setValue={setValue}
      fieldNames={ADDRESS_FIELD_NAMES}
    />
  )
}

export function ClientForm() {
  const router = useRouter()
  const createMutation = useCreateClient()

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(createClientBodySchema),
    mode: 'onBlur',
    defaultValues: DEFAULT_VALUES,
  })

  function handleSubmit(values: ClientFormValues) {
    createMutation.mutate(values, {
      onSuccess: (response) => {
        const id = response?.data?.data?.id
        if (id) router.push(`/clients/${id}`)
      },
    })
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="max-w-2xl space-y-8"
        noValidate
      >
        <section>
          <h2 className="text-lg font-medium">Identificação</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Tipo de pessoa, documento fiscal e razão social.
          </p>
          <IdentificationFields />
        </section>

        <section>
          <h2 className="text-lg font-medium">Dados pessoais</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Aplica-se apenas a pessoa física.
          </p>
          <PersonalInfoFields />
        </section>

        <section>
          <h2 className="text-lg font-medium">Endereço</h2>
          <p className="text-muted-foreground mb-4 text-sm">
            Preencha o CEP para autocompletar bairro, cidade e UF.
          </p>
          <AddressSection />
        </section>

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/clients')}
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
      </form>
    </FormProvider>
  )
}
