export type ProposalStage =
  | 'CAPTURE'
  | 'QUOTE'
  | 'PROTOCOL'
  | 'INSPECTION'
  | 'PAYMENT'
  | 'POLICY_ISSUED'
  | 'LOST';

export type InsuranceBranch =
  | 'AUTO'
  | 'RESIDENTIAL'
  | 'CONDOMINIUM'
  | 'BUSINESS'
  | 'LIFE'
  | 'OTHER';

export type BoardType = 'NEW_INSURANCE' | 'RENEWAL';

export interface ProposalData {
  id: string;
  organizationId: string;
  clientId: string;
  salespersonId: string;
  stage: ProposalStage;
  boardType: BoardType;
  branch: InsuranceBranch;
  premiumValueInCents: number;
  commissionPercentageInCents: number;
  lostReason: string | null;
  renewalPolicyId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const STAGE_LABELS: Record<ProposalStage, string> = {
  CAPTURE: 'Captação',
  QUOTE: 'Cotação',
  PROTOCOL: 'Protocolo',
  INSPECTION: 'Vistoria',
  PAYMENT: 'Pagamento',
  POLICY_ISSUED: 'Apólice Emitida',
  LOST: 'Perda',
};

export const BRANCH_LABELS: Record<InsuranceBranch, string> = {
  AUTO: 'Auto',
  RESIDENTIAL: 'Residencial',
  CONDOMINIUM: 'Condomínio',
  BUSINESS: 'Empresarial',
  LIFE: 'Vida',
  OTHER: 'Outros',
};

export const BOARD_TYPE_LABELS: Record<BoardType, string> = {
  NEW_INSURANCE: 'Novo Seguro',
  RENEWAL: 'Renovação',
};

export const STAGE_BADGE_VARIANT: Record<
  ProposalStage,
  'info' | 'warning' | 'default' | 'secondary' | 'success' | 'destructive'
> = {
  CAPTURE: 'info',
  QUOTE: 'warning',
  PROTOCOL: 'default',
  INSPECTION: 'secondary',
  PAYMENT: 'success',
  POLICY_ISSUED: 'success',
  LOST: 'destructive',
};

export const STAGES: readonly ProposalStage[] = [
  'CAPTURE',
  'QUOTE',
  'PROTOCOL',
  'INSPECTION',
  'PAYMENT',
  'POLICY_ISSUED',
  'LOST',
] as const;

export const BRANCHES: readonly InsuranceBranch[] = [
  'AUTO',
  'RESIDENTIAL',
  'CONDOMINIUM',
  'BUSINESS',
  'LIFE',
  'OTHER',
] as const;

export const BOARD_TYPES: readonly BoardType[] = ['NEW_INSURANCE', 'RENEWAL'] as const;
