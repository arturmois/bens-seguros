import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@repo/db'
import type {
  InsurerData,
  InsurerRepository,
} from '../domain/insurer-repository.js'
import {
  InsurerAlreadyExistsError,
  InsurerNotFoundError,
} from '../domain/insurer-errors.js'
import { UpdateInsurer } from './update-insurer.js'
import { PrismaInsurerRepository } from '../infrastructure/prisma-insurer-repository.js'

function makeInsurer(overrides: Partial<InsurerData> = {}): InsurerData {
  return {
    id: 'ins-1',
    organizationId: 'org-1',
    name: 'Porto Seguro',
    code: null,
    active: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function createRepo({
  current,
  duplicate,
}: {
  current: InsurerData | null
  duplicate: InsurerData | null
}): InsurerRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(current),
    findByName: vi.fn().mockResolvedValue(duplicate),
    findMany: vi.fn(),
    update: vi.fn().mockImplementation(async (input) =>
      makeInsurer({
        id: input.id,
        organizationId: input.organizationId,
        name: input.name,
        code: input.code ?? null,
        active: input.active ?? true,
      })
    ),
  }
}

describe('UpdateInsurer', () => {
  it('updates insurer when id exists and name is unique', async () => {
    const repo = createRepo({
      current: makeInsurer(),
      duplicate: null,
    })
    const useCase = new UpdateInsurer(repo)
    const result = await useCase.execute({
      id: 'ins-1',
      organizationId: 'org-1',
      name: 'Allianz',
      code: 'ALZ',
      active: false,
    })
    expect(repo.findById).toHaveBeenCalledWith('ins-1', 'org-1')
    expect(repo.findByName).toHaveBeenCalledWith('Allianz', 'org-1')
    expect(repo.update).toHaveBeenCalledWith({
      id: 'ins-1',
      organizationId: 'org-1',
      name: 'Allianz',
      code: 'ALZ',
      active: false,
    })
    expect(result.active).toBe(false)
  })
  it('throws InsurerNotFoundError when insurer does not exist', async () => {
    const repo = createRepo({ current: null, duplicate: null })
    const useCase = new UpdateInsurer(repo)
    await expect(
      useCase.execute({
        id: 'missing',
        organizationId: 'org-1',
        name: 'Allianz',
        code: '',
        active: true,
      })
    ).rejects.toThrow(InsurerNotFoundError)
  })
  it('throws InsurerAlreadyExistsError when another insurer already uses the name', async () => {
    const repo = createRepo({
      current: makeInsurer({ id: 'ins-1', name: 'Porto Seguro' }),
      duplicate: makeInsurer({ id: 'ins-2', name: 'Allianz' }),
    })
    const useCase = new UpdateInsurer(repo)
    await expect(
      useCase.execute({
        id: 'ins-1',
        organizationId: 'org-1',
        name: 'Allianz',
        code: '',
        active: true,
      })
    ).rejects.toThrow(InsurerAlreadyExistsError)
  })
})
describe('PrismaInsurerRepository', () => {
  it('preserves the existing code and enforces organizationId when updating without code', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 })
    const findFirst = vi.fn().mockResolvedValue(
      makeInsurer({
        id: 'ins-1',
        code: 'BRK',
        active: false,
      })
    )
    const prisma = {
      insurer: {
        updateMany,
        findFirst,
      },
    } as unknown as PrismaClient
    const repo = new PrismaInsurerRepository(prisma)
    const result = await repo.update({
      id: 'ins-1',
      organizationId: 'org-1',
      name: 'Bradesco',
      active: false,
    })
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'ins-1', organizationId: 'org-1' },
      data: {
        name: 'Bradesco',
        active: false,
      },
    })
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'ins-1', organizationId: 'org-1' },
    })
    expect(result.code).toBe('BRK')
  })
})
