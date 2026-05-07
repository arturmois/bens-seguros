import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'
import type { ClientRepository } from '../domain/client-repository.js'
import { ListClients } from './list-clients.js'

function makeRepo(): ClientRepository {
  return {
    save: vi.fn(),
    findById: vi.fn(),
    findByIdWithMetrics: vi.fn(),
    findByDocumentHash: vi.fn(),
    findMany: vi.fn(async () => ({ items: [], nextCursor: null })),
    update: vi.fn(),
    softDelete: vi.fn(),
    lgpdAnonymize: vi.fn(),
  }
}

describe('ListClients', () => {
  it('passes filters and pagination to the repository', async () => {
    const repo = makeRepo()
    const useCase = new ListClients(repo)

    await useCase.execute({
      organizationId: 'org-1',
      hasActivePolicy: true,
      search: 'silva',
      limit: 20,
    })

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        hasActivePolicy: true,
        search: 'silva',
      }),
      expect.objectContaining({
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    )
  })

  it('passes personTypeIn filter to the repository', async () => {
    const repo = makeRepo()
    const useCase = new ListClients(repo)

    await useCase.execute({
      organizationId: 'org-1',
      personTypeIn: ['INDIVIDUAL'],
      limit: 20,
    })

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        personTypeIn: ['INDIVIDUAL'],
      }),
      expect.anything()
    )
  })

  it('passes multi-value personTypeIn filter (INDIVIDUAL + COMPANY)', async () => {
    const repo = makeRepo()
    const useCase = new ListClients(repo)

    await useCase.execute({
      organizationId: 'org-1',
      personTypeIn: ['INDIVIDUAL', 'COMPANY'],
      limit: 20,
    })

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        personTypeIn: ['INDIVIDUAL', 'COMPANY'],
      }),
      expect.anything()
    )
  })

  it('combines personTypeIn with hasActivePolicy', async () => {
    const repo = makeRepo()
    const useCase = new ListClients(repo)

    await useCase.execute({
      organizationId: 'org-1',
      personTypeIn: ['INDIVIDUAL', 'COMPANY'],
      hasActivePolicy: true,
      limit: 20,
    })

    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        personTypeIn: ['INDIVIDUAL', 'COMPANY'],
        hasActivePolicy: true,
      }),
      expect.anything()
    )
  })
})
