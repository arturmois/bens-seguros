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

export function isInsuredObjectDetails(value: unknown): value is InsuredObjectDetails {
  if (typeof value !== 'object' || value === null || !('branch' in value)) return false;
  const obj = value as Record<string, unknown>;
  const branches = new Set(['AUTO', 'RESIDENTIAL', 'CONDOMINIUM', 'BUSINESS', 'LIFE', 'OTHER']);
  return typeof obj.branch === 'string' && branches.has(obj.branch);
}
