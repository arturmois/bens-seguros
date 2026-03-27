import { z } from 'zod'

export const clientFormSchema = z.object({
  name: z
    .string({ required_error: 'Nome é obrigatório' })
    .min(1, 'Nome é obrigatório')
    .max(200, 'Nome deve ter no máximo 200 caracteres'),
  document: z
    .string({ required_error: 'Documento é obrigatório' })
    .min(11, 'Documento deve ter no mínimo 11 caracteres')
    .max(14, 'Documento deve ter no máximo 14 caracteres'),
  type: z.enum(['LEAD', 'CLIENT', 'FORMER_CLIENT']).optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z
    .string()
    .max(20, 'Telefone deve ter no máximo 20 caracteres')
    .optional()
    .or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  profession: z
    .string()
    .max(100, 'Profissão deve ter no máximo 100 caracteres')
    .optional()
    .or(z.literal('')),
  maritalStatus: z
    .enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER'])
    .optional(),
})

export type ClientFormValues = z.infer<typeof clientFormSchema>
