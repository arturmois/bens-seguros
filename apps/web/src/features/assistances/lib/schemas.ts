import { z } from 'zod';

export const assistanceFormSchema = z.object({
  policyId: z.string({ required_error: 'Apolice e obrigatoria' }).min(1, 'Apolice e obrigatoria'),
  clientId: z.string({ required_error: 'Cliente e obrigatorio' }).min(1, 'Cliente e obrigatorio'),
  claimId: z.string().optional().or(z.literal('')),
  type: z.string({ required_error: 'Tipo e obrigatorio' }).min(1, 'Tipo e obrigatorio'),
  description: z
    .string()
    .max(2000, 'Descricao deve ter no maximo 2000 caracteres')
    .optional()
    .or(z.literal('')),
  address: z
    .string()
    .max(500, 'Endereco deve ter no maximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  providerName: z
    .string()
    .max(200, 'Nome do prestador deve ter no maximo 200 caracteres')
    .optional()
    .or(z.literal('')),
  providerPhone: z
    .string()
    .max(20, 'Telefone deve ter no maximo 20 caracteres')
    .optional()
    .or(z.literal('')),
  scheduledAt: z.string().optional().or(z.literal('')),
});

export type AssistanceFormValues = z.infer<typeof assistanceFormSchema>;

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
};
