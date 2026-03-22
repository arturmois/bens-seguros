import { z } from 'zod'

export const clientFormSchema = z.object({
  name: z
    .string({ required_error: 'Nome e obrigatorio' })
    .min(1, 'Nome e obrigatorio')
    .max(200, 'Nome deve ter no maximo 200 caracteres'),
  document: z
    .string({ required_error: 'Documento e obrigatorio' })
    .min(11, 'Documento deve ter no minimo 11 caracteres')
    .max(14, 'Documento deve ter no maximo 14 caracteres'),
  type: z.enum(['LEAD', 'CLIENT', 'FORMER_CLIENT']).optional(),
  email: z.string().email('E-mail invalido').optional().or(z.literal('')),
  phone: z
    .string()
    .max(20, 'Telefone deve ter no maximo 20 caracteres')
    .optional()
    .or(z.literal('')),
  birthDate: z.string().optional().or(z.literal('')),
  profession: z
    .string()
    .max(100, 'Profissao deve ter no maximo 100 caracteres')
    .optional()
    .or(z.literal('')),
  maritalStatus: z
    .enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER'])
    .optional(),
})

export type ClientFormValues = z.infer<typeof clientFormSchema>
