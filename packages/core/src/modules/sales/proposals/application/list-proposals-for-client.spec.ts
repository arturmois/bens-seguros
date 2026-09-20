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
      .mockResolvedValue([
        chatProposal('p-old', new Date('2026-01-01T00:00:00.000Z')),
        chatProposal('p-mid', new Date('2026-01-10T00:00:00.000Z')),
        ...Array.from({ length: 13 }, (_, index) =>
          chatProposal(
            `p-${String(index)}`,
            new Date(
              `2026-01-${String(index + 2).padStart(2, '0')}T00:00:00.000Z`
            )
          )
        ),
      ])
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
    const createdAtTimes = result.proposals.map((item) =>
      item.createdAt.getTime()
    )
    expect(createdAtTimes).toEqual([...createdAtTimes].sort((a, b) => b - a))
    const ids = result.proposals.map((item) => item.id)
    expect(ids[0]).toBe('p-12')
    expect(ids).not.toContain('p-old')
    const first = result.proposals[0]
    expect(first).toBeDefined()
    expect(Object.keys(first ?? {}).sort()).toEqual(
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
    expect(first?.clientName).toBe('João Silva')
  })
})
