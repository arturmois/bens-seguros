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

export interface AutoDetails {
  branch: 'AUTO';
  marca: string;
  modelo: string;
  anoFabricacao: number;
  anoModelo: number;
  placa?: string;
  chassi?: string;
  cor?: string;
  combustivel?: string;
  usoVeiculo?: string;
}

export interface ResidentialDetails {
  branch: 'RESIDENTIAL';
  tipoImovel: string;
  usoImovel: string;
  cep: string;
  endereco?: string;
  construcao?: string;
  areaM2?: number;
}

export interface CondominiumDetails {
  branch: 'CONDOMINIUM';
  nomeCondominio: string;
  numeroUnidades: number;
  cep: string;
  endereco?: string;
  anoConstrucao?: number;
  numeroAndares?: number;
}

export interface BusinessDetails {
  branch: 'BUSINESS';
  razaoSocial: string;
  cnpj: string;
  atividade: string;
  cep?: string;
  endereco?: string;
  areaM2?: number;
}

export interface LifeDetails {
  branch: 'LIFE';
  profissao: string;
  rendaMensalCentavos?: number;
  fumante?: boolean;
  esportesRadicais?: boolean;
  beneficiarios?: string;
}

export interface OtherDetails {
  branch: 'OTHER';
  descricao: string;
}

export type InsuredObjectDetails =
  | AutoDetails
  | ResidentialDetails
  | CondominiumDetails
  | BusinessDetails
  | LifeDetails
  | OtherDetails;

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
  details: InsuredObjectDetails | null;
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
