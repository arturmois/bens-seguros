import { z } from 'zod'

export const policyImportRowSchema = z.object({
  'Numero Apolice': z.string().min(1),
  'CPF/CNPJ Cliente': z.string().min(11),
  Ramo: z.enum([
    'AUTO',
    'RESIDENTIAL',
    'CONDOMINIUM',
    'BUSINESS',
    'LIFE',
    'OTHER',
  ]),
  'Premio (R$)': z.string().pipe(z.coerce.number().positive()),
  'Inicio Vigencia': z.string().pipe(z.coerce.date()),
  'Fim Vigencia': z.string().pipe(z.coerce.date()),
  Seguradora: z.string().optional().or(z.literal('')),
  Status: z.enum(['ACTIVE', 'CANCELLED', 'EXPIRED']).default('ACTIVE'),
})

export type PolicyImportRow = z.infer<typeof policyImportRowSchema>
