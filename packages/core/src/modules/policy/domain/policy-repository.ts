export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface CoverageDetails {
  [key: string]: JsonValue;
}

export interface PolicyData {
  id: string;
  organizationId: string;
  proposalId: string;
  clientId: string;
  salespersonId: string;
  policyNumber: string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  branch: 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER';
  premiumValueInCents: number;
  coverageDetails: CoverageDetails | null;
  startDate: Date;
  endDate: Date;
  cancelledAt: Date | null;
  cancelReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyFilters {
  organizationId: string;
  status?: 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  clientId?: string;
  salespersonId?: string;
  branch?: 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER';
  search?: string;
}

export interface PolicyCursorPage {
  cursor?: string;
  limit: number;
}

export interface PolicyPage {
  items: PolicyData[];
  total: number;
  nextCursor: string | null;
}

export interface CreatePolicyInput {
  id: string;
  organizationId: string;
  proposalId: string;
  clientId: string;
  salespersonId: string;
  policyNumber: string;
  status: 'ACTIVE';
  branch: 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER';
  premiumValueInCents: number;
  coverageDetails: CoverageDetails | null;
  startDate: Date;
  endDate: Date;
}

export interface PolicyRepository {
  create(data: CreatePolicyInput): Promise<PolicyData>;
  findById(id: string, organizationId: string): Promise<PolicyData | null>;
  findMany(filters: PolicyFilters, page: PolicyCursorPage): Promise<PolicyPage>;
  cancel(id: string, organizationId: string, reason: string): Promise<PolicyData>;
}
