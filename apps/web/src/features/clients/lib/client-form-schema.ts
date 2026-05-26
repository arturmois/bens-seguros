import { z } from 'zod'

import { CreateClientBody as createClientBodySchema } from '@/api/endpoints/clients/clients.zod'
import { formatCep, formatDocument } from '@/lib/masks'

import type { ClientDetail, ClientFormValues } from './types'
import { isValidCnpj, isValidCpf } from './validation'

export const EMPTY_ADDRESS = {
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
} as const

export const DEFAULT_VALUES: ClientFormValues = {
  legalName: '',
  document: '',
  personType: 'INDIVIDUAL',
  profession: null,
  maritalStatus: null,
  address: { ...EMPTY_ADDRESS },
  fiscalBirthDate: null,
}

export const ADDRESS_FIELD_NAMES = {
  cep: 'address.cep',
  street: 'address.street',
  number: 'address.number',
  complement: 'address.complement',
  neighborhood: 'address.neighborhood',
  city: 'address.city',
  state: 'address.state',
} as const

export function normalizeAddress(
  raw: ClientFormValues['address']
): ClientFormValues['address'] {
  if (!raw) return null
  const cepDigits = (raw.cep ?? '').replace(/\D/g, '')
  if (cepDigits.length === 0) return null
  return raw
}

export function buildInitialValues(initial?: ClientDetail): ClientFormValues {
  if (!initial) return DEFAULT_VALUES
  return {
    legalName: initial.legalName,
    document: formatDocument(initial.document),
    personType: initial.personType,
    profession: initial.profession ?? null,
    maritalStatus: initial.maritalStatus ?? null,
    address: initial.address
      ? { ...initial.address, cep: formatCep(initial.address.cep) }
      : { ...EMPTY_ADDRESS },
    fiscalBirthDate: initial.fiscalBirthDate ?? null,
  }
}

const addressOrNull = z.preprocess((value) => {
  if (value === null || value === undefined) return null
  if (typeof value !== 'object') return null
  const v = value as { cep?: unknown }
  const cep = typeof v.cep === 'string' ? v.cep.replace(/\D/g, '') : ''
  return cep.length === 0 ? null : value
}, createClientBodySchema.shape.address)

const documentField = z
  .string()
  .transform((value) => value.replace(/\D/g, ''))
  .pipe(
    z
      .string()
      .refine((digits) => digits.length === 11 || digits.length === 14, {
        message: 'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos',
      })
  )

export const clientFormSchema = createClientBodySchema
  .extend({ address: addressOrNull, document: documentField })
  .superRefine((data, ctx) => {
    if (data.personType === 'INDIVIDUAL' && !isValidCpf(data.document)) {
      ctx.addIssue({
        path: ['document'],
        code: z.ZodIssueCode.custom,
        message: 'CPF inválido',
      })
    }
    if (data.personType === 'COMPANY' && !isValidCnpj(data.document)) {
      ctx.addIssue({
        path: ['document'],
        code: z.ZodIssueCode.custom,
        message: 'CNPJ inválido',
      })
    }
  })
