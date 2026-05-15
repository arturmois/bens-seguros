import { z } from 'zod'

export const clientAddressDataSchema = z.object({
  cep: z.string().regex(/^\d{8}$/, 'CEP inválido'),
  street: z.string().min(1).max(200),
  number: z.string().max(20).nullable(),
  complement: z.string().max(200).nullable(),
  neighborhood: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  state: z.string().length(2),
})

export type ClientAddress = z.infer<typeof clientAddressDataSchema>

const normalizeOptionalString = (
  value: string | null | undefined
): string | null => {
  if (value === undefined || value === null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export const clientAddressInputSchema = z.object({
  cep: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP inválido')
    .transform((v) => v.replace(/\D/g, '')),
  street: z.string().trim().min(1).max(200),
  number: z
    .string()
    .max(20)
    .nullable()
    .optional()
    .transform(normalizeOptionalString),
  complement: z
    .string()
    .max(200)
    .nullable()
    .optional()
    .transform(normalizeOptionalString),
  neighborhood: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  state: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase()),
})

export function parseClientAddress(value: unknown): ClientAddress | null {
  const result = clientAddressDataSchema.safeParse(value)
  return result.success ? result.data : null
}
