export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue }

export interface CoverageDetails {
  [key: string]: JsonValue
}

export interface PolicyData {
  id: string
  organizationId: string
  proposalId: string
  clientId: string
  salespersonId: string
  insurerId: string | null
  policyNumber: string
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  branch: 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER'
  premiumValueInCents: number
  coverageDetails: CoverageDetails | null
  startDate: Date
  endDate: Date
  cancelledAt: Date | null
  cancelReason: string | null
  createdAt: Date
  updatedAt: Date
  clientName?: string
  clientDocument?: string
  salespersonName?: string
  insurerName?: string
  proposalIdentifier?: string
  proposalDetails?: Record<string, unknown> | null
  boardType?: string
}

export interface PolicyFilters {
  organizationId: string
  status?: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  clientId?: string
  proposalId?: string
  salespersonId?: string
  branch?:
    | 'AUTO'
    | 'RESIDENTIAL'
    | 'CONDOMINIUM'
    | 'BUSINESS'
    | 'LIFE'
    | 'OTHER'
  search?: string
}

export interface PolicyCursorPage {
  cursor?: string
  limit: number
}

export interface PolicyPage {
  items: PolicyData[]
  total?: number
  nextCursor: string | null
}

export interface CreatePolicyInput {
  id: string
  organizationId: string
  proposalId: string
  clientId: string
  salespersonId: string
  insurerId: string | null
  policyNumber: string
  status: 'ACTIVE'
  branch: 'AUTO' | 'RESIDENTIAL' | 'CONDOMINIUM' | 'BUSINESS' | 'LIFE' | 'OTHER'
  premiumValueInCents: number
  coverageDetails: CoverageDetails | null
  startDate: Date
  endDate: Date
}

export interface PolicyRepository {
  create(data: CreatePolicyInput): Promise<PolicyData>
  findById(id: string, organizationId: string): Promise<PolicyData | null>
  findByPolicyNumber(
    policyNumber: string,
    organizationId: string
  ): Promise<PolicyData | null>
  findMany(filters: PolicyFilters, page: PolicyCursorPage): Promise<PolicyPage>
  cancel(
    id: string,
    organizationId: string,
    reason: string
  ): Promise<PolicyData>
}
