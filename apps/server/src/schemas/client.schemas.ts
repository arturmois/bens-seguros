import { z } from 'zod';

export const createClientBodySchema = z.object({
  name: z.string().min(2),
  document: z.string().min(11).max(14),
  type: z.enum(['LEAD', 'CLIENT', 'FORMER_CLIENT']).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  birthDate: z.coerce.date().optional(),
  profession: z.string().optional(),
  maritalStatus: z.enum(['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED', 'OTHER']).optional(),
  address: z.record(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  consentLgpd: z.boolean().optional(),
});

export const updateClientBodySchema = createClientBodySchema.partial().omit({ document: true });

export const listClientsQuerySchema = z.object({
  type: z.enum(['LEAD', 'CLIENT', 'FORMER_CLIENT']).optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});
