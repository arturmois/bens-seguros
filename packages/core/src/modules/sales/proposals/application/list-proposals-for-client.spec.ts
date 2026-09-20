import { describe, expect, it, vi } from 'vitest'
import type { ContactRepository } from '../../leads/domain/contact-repository.js'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { ListProposalsForClient } from './list-proposals-for-client.js'

function chatProposal(id: string, createdAt: Date) {
  return {
    id,
    branch: 'AUTO',
    stage: 'CAPTURE',
    premiumValueInCents: 100,
    coverageStartDate: null,
    createdAt,
    clientName: 'João Silva',
  }
}

describe('ListProposalsForClient', () => {
  it('returns at most 10 proposals by createdAt desc with clientName', async () => {
    const contactRepo = {
      findByPhone: vi.fn(),
    } as unknown as ContactRepository
    const listForClient = vi
      .fn()
      .mockResolvedValue(
        Array.from({ length: 15 }, (_, index) =>
          chatProposal(`p-${String(index)}`, new Date(2026, 0, 15 - index))
        )
      )
    const proposalRepo = { listForClient } as unknown as ProposalRepository
    const useCase = new ListProposalsForClient(contactRepo, proposalRepo)
    const result = await useCase.execute({
      organizationId: 'org-1',
      clientId: 'client-1',
    })
    expect(listForClient).toHaveBeenCalledWith({
      organizationId: 'org-1',
      clientId: 'client-1',
      status: 'ACTIVE',
      limit: 10,
    })
    expect(result.proposals).toHaveLength(10)
    expect(result.total).toBe(10)
    const first = result.proposals[0]
    expect(first).toBeDefined()
    if (!first) return
    expect(Object.keys(first).sort()).toEqual(
      [
        'id',
        'branch',
        'stage',
        'premiumValueInCents',
        'coverageStartDate',
        'createdAt',
        'clientName',
      ].sort()
    )
    expect(first.clientName).toBe('João Silva')
  })
})
