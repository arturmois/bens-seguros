export interface PolicyData {
  id: string;
  organizationId: string;
  proposalId: string;
  clientId: string;
  salespersonId: string;
  policyNumber: string;
  status: PolicyStatus;
  branch: PolicyBranch;
  premiumValueInCents: number;
  coverageDetails: Record<string, unknown> | null;
  startDate: string;
  endDate: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PolicyStatus = 'ACTIVE' | 'CANCELLED' | 'EXPIRED';

export const POLICY_STATUSES: readonly PolicyStatus[] = ['ACTIVE', 'CANCELLED', 'EXPIRED'] as const;

export type PolicyBranch = 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER';

export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  ACTIVE: 'Ativa',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
} as const;

export const POLICY_STATUS_BADGE_VARIANT: Record<
  PolicyStatus,
  'success' | 'destructive' | 'warning'
> = {
  ACTIVE: 'success',
  CANCELLED: 'destructive',
  EXPIRED: 'warning',
} as const;

export const POLICY_BRANCH_LABELS: Record<PolicyBranch, string> = {
  AUTO: 'Automóvel',
  RESIDENTIAL: 'Residencial',
  CONDOMINIUM: 'Condomínio',
  BUSINESS: 'Empresarial',
  LIFE: 'Vida',
  OTHER: 'Outros',
} as const;
