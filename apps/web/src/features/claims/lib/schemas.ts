import { z } from 'zod';

export const claimFormSchema = z.object({
  policyId: z.string({ required_error: 'Apolice e obrigatoria' }).min(1, 'Apolice e obrigatoria'),
  clientId: z.string({ required_error: 'Cliente e obrigatorio' }).min(1, 'Cliente e obrigatorio'),
  insurerId: z.string().optional().or(z.literal('')),
  assignedToId: z.string().optional().or(z.literal('')),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional(),
  description: z
    .string({ required_error: 'Descricao e obrigatoria' })
    .min(1, 'Descricao e obrigatoria'),
  incidentDate: z.string().optional().or(z.literal('')),
  incidentLocation: z
    .string()
    .max(500, 'Local deve ter no maximo 500 caracteres')
    .optional()
    .or(z.literal('')),
});

export type ClaimFormValues = z.infer<typeof claimFormSchema>;

export const EMPTY_CLAIM_FORM_VALUES: ClaimFormValues = {
  policyId: '',
  clientId: '',
  insurerId: '',
  assignedToId: '',
  priority: 'NORMAL',
  description: '',
  incidentDate: '',
  incidentLocation: '',
};
