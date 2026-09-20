import { describe, expect, it, vi } from 'vitest'
import type { ProposalRepository } from '../domain/proposal-repository.js'
import { MarkQuoteSent } from './mark-quote-sent.js'

describe('MarkQuoteSent', () => {
  it('sets sentToClientAt to the sentAt argument', async () => {
    const markQuoteSent = vi.fn().mockResolvedValue(undefined)
    const proposalRepo = { markQuoteSent } as Pick<
      ProposalRepository,
      'markQuoteSent'
    >
    const useCase = new MarkQuoteSent(proposalRepo)
    const sentAt = new Date('2026-03-15T10:00:00.000Z')
    await useCase.execute({
      proposalId: 'prop-1',
      organizationId: 'org-1',
      sentAt,
    })
    expect(markQuoteSent).toHaveBeenCalledWith({
      proposalId: 'prop-1',
      organizationId: 'org-1',
      sentToClientAt: sentAt,
    })
  })
})
