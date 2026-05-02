import { describe, it, expect, vi } from 'vitest'
import 'reflect-metadata'
import { ListContacts } from './list-contacts.js'
import type { ContactRepository } from '../domain/contact-repository.js'

describe('ListContacts', () => {
  it('passa filtros e paginação ao repo', async () => {
    const repo = {
      findMany: vi.fn(async () => ({ items: [], nextCursor: null })),
    } as unknown as ContactRepository
    const useCase = new ListContacts(repo)
    await useCase.execute({ organizationId: 'org-1', stage: 'LEAD', limit: 20 })
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', stage: 'LEAD' }),
      expect.objectContaining({ limit: 20 })
    )
  })
})
