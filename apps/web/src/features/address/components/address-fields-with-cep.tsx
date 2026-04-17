'use client'

import { InputMask } from '@react-input/mask'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef } from 'react'
import {
  Controller,
  type Control,
  type FieldValues,
  type UseFormRegister,
  type UseFormSetValue,
} from 'react-hook-form'
import { toast } from 'sonner'

import { Input } from '@/components/ui/input'
import { FieldWrapper } from '@/features/proposals/components/branch-field-sets'
import { CEP_MASK } from '@/lib/masks'

import type { CepLookupErrorType } from '../hooks/use-cep-lookup'
import { useCepLookup } from '../hooks/use-cep-lookup'

type AddressFieldKey =
  | 'cep'
  | 'street'
  | 'number'
  | 'complement'
  | 'neighborhood'
  | 'city'
  | 'state'

const DEFAULT_FIELD_NAMES: Record<AddressFieldKey, string> = {
  cep: 'cep',
  street: 'street',
  number: 'number',
  complement: 'complement',
  neighborhood: 'neighborhood',
  city: 'city',
  state: 'state',
}

const ERROR_MESSAGES: Record<CepLookupErrorType, string> = {
  'not-found': 'CEP não encontrado. Verifique os dígitos e tente novamente.',
  'provider-unavailable':
    'Serviço de consulta de CEP indisponível no momento. Preencha o endereço manualmente.',
  network: 'Falha ao consultar o CEP. Verifique sua conexão e tente novamente.',
}

interface AddressFieldsWithCepProps {
  readonly control: Control<FieldValues>
  readonly register: UseFormRegister<FieldValues>
  readonly setValue: UseFormSetValue<FieldValues>
  readonly fieldNames?: Partial<Record<AddressFieldKey, string>>
  readonly required?: { readonly cep?: boolean }
}

export function AddressFieldsWithCep({
  control,
  register,
  setValue,
  fieldNames,
  required,
}: AddressFieldsWithCepProps) {
  const names = { ...DEFAULT_FIELD_NAMES, ...fieldNames }
  const { lookup, isLoading, error } = useCepLookup()
  const lastLookedUpRef = useRef<string | null>(null)
  const reportedErrorRef = useRef<CepLookupErrorType | null>(null)

  useEffect(() => {
    if (!error) {
      reportedErrorRef.current = null
      return
    }
    if (reportedErrorRef.current === error.type) return
    reportedErrorRef.current = error.type
    toast.error(ERROR_MESSAGES[error.type])
  }, [error])

  const runLookup = async (raw: string): Promise<void> => {
    const digits = raw.replace(/\D/g, '')
    if (digits.length !== 8) return
    if (lastLookedUpRef.current === digits) return
    lastLookedUpRef.current = digits

    const data = await lookup(digits)
    if (!data) return

    setValue(names.street, data.street, { shouldDirty: true })
    setValue(names.neighborhood, data.neighborhood, { shouldDirty: true })
    setValue(names.city, data.city, { shouldDirty: true })
    setValue(names.state, data.state, { shouldDirty: true })
  }

  return (
    <>
      <FieldWrapper label="CEP" required={required?.cep}>
        <Controller
          name={names.cep}
          control={control}
          render={({ field }) => (
            <div className="relative">
              <InputMask
                component={Input}
                mask={CEP_MASK.mask}
                replacement={CEP_MASK.replacement}
                placeholder="00000-000"
                {...field}
                value={typeof field.value === 'string' ? field.value : ''}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  field.onChange(event)
                  void runLookup(event.target.value)
                }}
                onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
                  field.onBlur()
                  void runLookup(event.target.value)
                }}
              />
              {isLoading && (
                <span className="pointer-events-none absolute inset-y-0 right-3 z-10 flex items-center">
                  <Loader2
                    aria-label="Consultando CEP"
                    className="text-muted-foreground size-4 animate-spin"
                  />
                </span>
              )}
            </div>
          )}
        />
      </FieldWrapper>

      <FieldWrapper label="Logradouro">
        <Input
          placeholder="Rua, avenida, etc."
          disabled={isLoading}
          {...register(names.street)}
        />
      </FieldWrapper>

      <FieldWrapper label="Número">
        <Input
          placeholder="123"
          disabled={isLoading}
          {...register(names.number)}
        />
      </FieldWrapper>

      <FieldWrapper label="Complemento">
        <Input
          placeholder="Apto, bloco, etc."
          disabled={isLoading}
          {...register(names.complement)}
        />
      </FieldWrapper>

      <FieldWrapper label="Bairro">
        <Input
          placeholder="Bairro"
          disabled={isLoading}
          {...register(names.neighborhood)}
        />
      </FieldWrapper>

      <FieldWrapper label="Cidade">
        <Input
          placeholder="Cidade"
          disabled={isLoading}
          {...register(names.city)}
        />
      </FieldWrapper>

      <FieldWrapper label="Estado">
        <Input
          placeholder="UF"
          maxLength={2}
          disabled={isLoading}
          {...register(names.state)}
        />
      </FieldWrapper>
    </>
  )
}
