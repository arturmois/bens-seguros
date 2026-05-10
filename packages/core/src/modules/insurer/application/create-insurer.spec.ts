import { describe, expect, it, vi } from 'vitest'
import type { CacheService } from '../../../shared/cache-service.js'
import { InsurerAlreadyExistsError } from '../domain/insurer-errors.js'
import type {
  InsurerData,
  InsurerRepository,
} from '../domain/insurer-repository.js'
import { CreateInsurer } from './create-insurer.js'

function makeInsurerData(overrides: Partial<InsurerData> = {}): InsurerData {
  return {
    id: 'ins-1',
    organizationId: 'org-1',
    name: 'Porto Seguro',
    code: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createMockRepo(existingByName: InsurerData | null): InsurerRepository {
  return {
    create: vi.fn().mockImplementation(async (dto) => ({
      id: 'ins-new',
      code: null,
      active: true,
      ...dto,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    findById: vi.fn(),
    findByName: vi.fn().mockResolvedValue(existingByName),
    update: vi.fn(),
    findMany: vi.fn(),
  }
}

function createMockCache(): CacheService {
  return {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  }
}

describe('CreateInsurer', () => {
  it('creates insurer and invalidates cache when name is unique', async () => {
    const repo = createMockRepo(null)
    const cache = createMockCache()
    const useCase = new CreateInsurer(repo, cache)
    const result = await useCase.execute({
      organizationId: 'org-1',
      name: 'Allianz',
    })
    expect(repo.findByName).toHaveBeenCalledWith('Allianz', 'org-1')
    expect(repo.create).toHaveBeenCalledWith({
      organizationId: 'org-1',
      name: 'Allianz',
    })
    expect(result.name).toBe('Allianz')
    expect(vi.mocked(cache.delete)).toHaveBeenCalledWith('cache:org-1:insurers')
  })
  it('throws InsurerAlreadyExistsError and does not invalidate cache when name exists', async () => {
    const existing = makeInsurerData({ name: 'Porto Seguro' })
    const repo = createMockRepo(existing)
    const cache = createMockCache()
    const useCase = new CreateInsurer(repo, cache)
    await expect(
      useCase.execute({ organizationId: 'org-1', name: 'Porto Seguro' })
    ).rejects.toThrow(InsurerAlreadyExistsError)
    expect(repo.create).not.toHaveBeenCalled()
    expect(vi.mocked(cache.delete)).not.toHaveBeenCalled()
  })
})
