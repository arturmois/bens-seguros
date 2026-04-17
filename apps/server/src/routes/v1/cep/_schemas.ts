import { z } from 'zod'
import { errorResponse, successResponse } from '../../shared/response.schema.js'

export const cepParamSchema = z.object({
  cep: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((digits) => digits.length === 8, {
      message: 'CEP inválido. Use 8 dígitos.',
    }),
})

const addressDataSchema = z.object({
  zipCode: z.string().length(8),
  street: z.string(),
  neighborhood: z.string(),
  city: z.string(),
  state: z.string().length(2),
  complement: z.string().nullable(),
})

export const cepLookupResponse = successResponse(addressDataSchema)

export { errorResponse }
