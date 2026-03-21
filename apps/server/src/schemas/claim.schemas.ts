import { z } from 'zod';

const CLAIM_STATUS_VALUES = [
  'REGISTERED',
  'IN_ANALYSIS',
  'AWAITING_DOCUMENT',
  'PENDING_INSPECTION',
  'APPROVED',
  'REJECTED',
  'PAID',
  'COMPLETED',
] as const;

const CLAIM_PRIORITY_VALUES = ['NORMAL', 'HIGH', 'URGENT'] as const;

const emptyToUndefined = z.literal('').transform(() => undefined);

const optionalDate = z.union([emptyToUndefined, z.coerce.date()]).optional();

const optionalString = z.union([emptyToUndefined, z.string()]).optional();

export const createClaimBodySchema = z.object({
  policyId: z.string().min(1),
  clientId: z.string().min(1),
  insurerId: optionalString,
  assignedToId: optionalString,
  priority: z.enum(CLAIM_PRIORITY_VALUES).optional(),
  description: z.string().min(1),
  incidentDate: optionalDate,
  incidentLocation: optionalString,
});

export const updateClaimStatusBodySchema = z.object({
  status: z.enum(CLAIM_STATUS_VALUES),
});

export const listClaimsQuerySchema = z.object({
  status: z.enum(CLAIM_STATUS_VALUES).optional(),
  priority: z.enum(CLAIM_PRIORITY_VALUES).optional(),
  policyId: z.string().optional(),
  clientId: z.string().optional(),
  search: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});
