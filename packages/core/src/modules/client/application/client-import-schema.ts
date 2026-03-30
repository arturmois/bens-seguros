import { z } from 'zod'

export const clientImportRowSchema = z.object({
  Nome: z.string().min(2).max(200),
  'CPF/CNPJ': z.string().min(11).max(18),
  Tipo: z.enum(['LEAD', 'CLIENT', 'FORMER_CLIENT']).default('CLIENT'),
  Email: z.string().email().optional().or(z.literal('')),
  Telefone: z.string().optional().or(z.literal('')),
  'Data Nascimento': z
    .string()
    .pipe(z.coerce.date())
    .optional()
    .or(z.literal('')),
  Profissão: z.string().max(100).optional().or(z.literal('')),
  'Estado Civil': z
    .enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER'])
    .optional()
    .or(z.literal('')),
  Tags: z.string().optional().or(z.literal('')),
})

export type ClientImportRow = z.infer<typeof clientImportRowSchema>
