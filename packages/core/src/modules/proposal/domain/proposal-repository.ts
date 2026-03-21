import type { Proposal } from './proposal.js';

export interface ProposalFilters {
  organizationId: string;
  stage?: string;
  clientId?: string;
  salespersonId?: string;
  boardType?: string;
  search?: string;
}

export interface ProposalCursorPage {
  cursor?: string;
  limit: number;
}

export interface ProposalPage {
  items: Proposal[];
  total: number;
  nextCursor: string | null;
}

export interface ProposalRepository {
  save(proposal: Proposal): Promise<void>;
  findById(id: string, organizationId: string): Promise<Proposal | null>;
  findMany(filters: ProposalFilters, page: ProposalCursorPage): Promise<ProposalPage>;
}
