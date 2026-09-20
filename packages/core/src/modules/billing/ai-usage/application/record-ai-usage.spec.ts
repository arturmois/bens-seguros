import { describe, expect, it, vi } from 'vitest'
import type { AiUsageRepository } from '../domain/ai-usage-repository.js'
import { RecordAiUsage } from './record-ai-usage.js'

function makeRepo() {
  return {
    create: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(),
    existsByMessageIdHash: vi.fn(),
  } satisfies AiUsageRepository
}

const baseInput = {
  organizationId: 'org-1',
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  inputQuantity: 100,
  outputQuantity: 50,
  unitType: 'TOKEN' as const,
  inputCostMicrocents: 15,
  outputCostMicrocents: 38,
}

describe('RecordAiUsage', () => {
  it('persists the derived record once', async () => {
    const repo = makeRepo()
    const useCase = new RecordAiUsage(repo)

    await useCase.execute(baseInput)

    expect(repo.create).toHaveBeenCalledTimes(1)
    const persisted = repo.create.mock.calls[0]?.[0]
    expect(persisted?.organizationId).toBe('org-1')
    expect(persisted?.periodKey).toMatch(/^\d{4}-\d{2}$/)
    expect(persisted?.countedAsIncluded).toBeNull()
  })

  it('propagates repository errors (caller decides retry/swallow)', async () => {
    const repo = makeRepo()
    repo.create.mockRejectedValueOnce(new Error('db down'))
    const useCase = new RecordAiUsage(repo)

    await expect(useCase.execute(baseInput)).rejects.toThrow('db down')
  })
})
