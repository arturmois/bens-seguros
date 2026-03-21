import { z } from 'zod';

export const listCommissionsQuerySchema = z.object({
  status: z
    .enum(['PENDING_COMMERCIAL', 'PENDING_ADMIN', 'APPROVED', 'PAID', 'REJECTED', 'REVERSED'])
    .optional(),
  salespersonId: z.string().optional(),
  policyId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const rejectCommissionBodySchema = z.object({
  reason: z.string().min(1),
});
