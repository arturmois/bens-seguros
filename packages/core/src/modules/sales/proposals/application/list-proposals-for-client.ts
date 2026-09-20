import type { ContactRepository } from '../../leads/domain/contact-repository.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'

export interface ChatProposalItem {
  id: string
  branch: string
  stage: string
  premiumValueInCents: number | null
  coverageStartDate: Date | null
  createdAt: Date
  clientName: string
}

export interface ListProposalsForClientInput {
  organizationId: string
  clientId?: string
  phone?: string
  status?: 'ACTIVE' | 'LOST' | 'ALL'
}

export interface ListProposalsForClientResult {
  proposals: ChatProposalItem[]
  total: number
}

export class ListProposalsForClient {
  constructor(
    private readonly contactRepo: Pick<ContactRepository, 'findByPhone'>,
    private readonly proposalRepo: Pick<ProposalRepository, 'listForClient'>
  ) {}

  async execute(
    input: ListProposalsForClientInput
  ): Promise<ListProposalsForClientResult> {
    const clientId = await this.resolveClientId(input)
    if (!clientId) {
      return { proposals: [], total: 0 }
    }
    const proposals = await this.proposalRepo.listForClient({
      organizationId: input.organizationId,
      clientId,
      status: input.status ?? 'ACTIVE',
      limit: 10,
    })
    const capped = proposals.slice(0, 10)
    return { proposals: capped, total: capped.length }
  }

  private async resolveClientId(
    input: ListProposalsForClientInput
  ): Promise<string | null> {
    if (input.clientId) return input.clientId
    if (!input.phone) return null
    const contact = await this.contactRepo.findByPhone(
      input.phone,
      input.organizationId
    )
    return contact?.clientId ?? null
  }
}
