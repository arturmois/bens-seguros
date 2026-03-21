import { z } from 'zod';

export const claimFormSchema = z.object({
  policyId: z.string({ required_error: 'Apólice é obrigatória' }).min(1, 'Apólice é obrigatória'),
  clientId: z.string({ required_error: 'Cliente é obrigatório' }).min(1, 'Cliente é obrigatório'),
  insurerId: z.string().optional().or(z.literal('')),
  assignedToId: z.string().optional().or(z.literal('')),
  priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional(),
  description: z
    .string({ required_error: 'Descrição é obrigatória' })
    .min(1, 'Descrição é obrigatória'),
  incidentDate: z.string().optional().or(z.literal('')),
  incidentLocation: z
    .string()
    .max(500, 'Local deve ter no máximo 500 caracteres')
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
