import { z } from 'zod'

export const assistanceFormSchema = z.object({
  policyId: z
    .string({ required_error: 'Apólice é obrigatória' })
    .min(1, 'Apólice é obrigatória'),
  clientId: z
    .string({ required_error: 'Cliente é obrigatório' })
    .min(1, 'Cliente é obrigatório'),
  claimId: z.string().optional().or(z.literal('')),
  type: z
    .string({ required_error: 'Tipo é obrigatório' })
    .min(1, 'Tipo é obrigatório'),
  description: z
    .string()
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(500, 'Endereço deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  providerName: z
    .string()
    .max(200, 'Nome do prestador deve ter no máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
  providerPhone: z
    .string()
    .max(20, 'Telefone deve ter no máximo 20 caracteres')
    .optional()
    .or(z.literal('')),
  scheduledAt: z.string().optional().or(z.literal('')),
})

export type AssistanceFormValues = z.infer<typeof assistanceFormSchema>

export const EMPTY_ASSISTANCE_FORM_VALUES: AssistanceFormValues = {
  policyId: '',
  clientId: '',
  claimId: '',
  type: '',
  description: '',
  address: '',
  providerName: '',
  providerPhone: '',
  scheduledAt: '',
}
