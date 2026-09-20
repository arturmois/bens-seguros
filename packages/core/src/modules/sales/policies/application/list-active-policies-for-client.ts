import type { ContactRepository } from '../../leads/domain/contact-repository.js'
import type {
  PolicyData,
  PolicyRepository,
} from '../domain/policy-repository.js'

export interface ListActivePoliciesForClientInput {
  organizationId: string
  clientId?: string
  phone?: string
  branch?: string
}

export interface ChatPolicyItem {
  id: string
  policyNumber: string
  branch: string
  status: string
  startDate: Date
  endDate: Date
  premiumValueInCents: number
  insurerName: string | null
}

export interface ListActivePoliciesForClientResult {
  policies: ChatPolicyItem[]
  total: number
}

export class ListActivePoliciesForClient {
  constructor(
    private readonly contactRepo: Pick<ContactRepository, 'findByPhone'>,
    private readonly policyRepo: Pick<PolicyRepository, 'listActiveForClient'>
  ) {}

  async execute(
    input: ListActivePoliciesForClientInput
  ): Promise<ListActivePoliciesForClientResult> {
    const clientId = await this.resolveClientId(input)
    if (!clientId) {
      return { policies: [], total: 0 }
    }
    const rows = await this.policyRepo.listActiveForClient({
      organizationId: input.organizationId,
      clientId,
      branch: input.branch,
      limit: 10,
    })
    const policies = rows
      .filter((row) => row.status === 'ACTIVE')
      .slice(0, 10)
      .map((row) => ({
        id: row.id,
        policyNumber: String(row.policyNumber),
        branch: row.branch,
        status: row.status,
        startDate: row.startDate,
        endDate: row.endDate,
        premiumValueInCents: row.premiumValueInCents,
        insurerName: row.insurerName ?? null,
      }))
    return { policies, total: policies.length }
  }

  private async resolveClientId(
    input: ListActivePoliciesForClientInput
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
