import { describe, it, expect, vi } from 'vitest';
import { AdvanceProposalStage } from './advance-proposal-stage.js';
import { Proposal } from '../domain/proposal.js';
import type { ProposalRepository } from '../domain/proposal-repository.js';

function createMockRepo(proposal: Proposal | null): ProposalRepository {
  return {
    save: vi.fn(),
    findById: vi.fn().mockResolvedValue(proposal),
    findMany: vi.fn(),
  };
}

describe('AdvanceProposalStage', () => {
  it('advances proposal to next stage', async () => {
    const proposal = Proposal.create({
      organizationId: 'org-1',
      clientId: 'c-1',
      salespersonId: 'u-1',
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    });
    const repo = createMockRepo(proposal);
    const useCase = new AdvanceProposalStage(repo);

    const result = await useCase.execute(proposal.id, 'org-1');

    expect(result.stage).toBe('QUOTE');
    expect(repo.save).toHaveBeenCalledWith(proposal);
  });

  it('throws if proposal not found', async () => {
    const repo = createMockRepo(null);
    const useCase = new AdvanceProposalStage(repo);

    await expect(useCase.execute('xxx', 'org-1')).rejects.toThrow('não encontrada');
  });
});
