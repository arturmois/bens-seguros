import { describe, expect, it, vi } from 'vitest'
import type { AiUsageRepository } from '../domain/ai-usage-repository.js'
import { ListAiUsageRecords } from './list-ai-usage-records.js'

function makeRepo() {
  return {
    create: vi.fn(),
    list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  } satisfies AiUsageRepository
}

describe('ListAiUsageRecords', () => {
  it('forwards filters and pagination to the repository', async () => {
    const repo = makeRepo()
    const useCase = new ListAiUsageRecords(repo)

    await useCase.execute(
      { organizationId: 'org-1', periodKey: '2026-05' },
      { limit: 25, cursor: 'cuid-abc' }
    )

    expect(repo.list).toHaveBeenCalledWith(
      { organizationId: 'org-1', periodKey: '2026-05' },
      { limit: 25, cursor: 'cuid-abc' }
    )
  })

  it('rejects limit above 100', async () => {
    const useCase = new ListAiUsageRecords(makeRepo())

    await expect(
      useCase.execute({ organizationId: 'org-1' }, { limit: 101 })
    ).rejects.toThrow('limit must be <= 100')
  })

  it('accepts limit at boundary (100)', async () => {
    const repo = makeRepo()
    const useCase = new ListAiUsageRecords(repo)

    await useCase.execute({ organizationId: 'org-1' }, { limit: 100 })

    expect(repo.list).toHaveBeenCalled()
  })
})
