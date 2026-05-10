import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'
import type { ContactRepository } from '../domain/contact-repository.js'
import { ListContacts } from './list-contacts.js'

function makeRepo() {
  return {
    findMany: vi.fn(async () => ({ items: [], nextCursor: null })),
  } as unknown as ContactRepository
}

describe('ListContacts', () => {
  it('passa filtros singulares e paginação ao repo (compat)', async () => {
    const repo = makeRepo()
    const useCase = new ListContacts(repo)
    await useCase.execute({ organizationId: 'org-1', stage: 'LEAD', limit: 20 })
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-1', stage: 'LEAD' }),
      expect.objectContaining({
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      })
    )
  })
  it('passa filtros plurais (stageIn, sourceIn, salespersonIdIn)', async () => {
    const repo = makeRepo()
    const useCase = new ListContacts(repo)
    await useCase.execute({
      organizationId: 'org-1',
      stageIn: ['LEAD', 'CLIENT_ACTIVE'],
      sourceIn: ['MANUAL', 'CHAT_WHATSAPP'],
      salespersonIdIn: ['user-1', 'user-2'],
      limit: 20,
    })
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        stageIn: ['LEAD', 'CLIENT_ACTIVE'],
        sourceIn: ['MANUAL', 'CHAT_WHATSAPP'],
        salespersonIdIn: ['user-1', 'user-2'],
      }),
      expect.anything()
    )
  })
  it('passa consentLgpd e date range', async () => {
    const repo = makeRepo()
    const useCase = new ListContacts(repo)
    const from = new Date('2026-04-01')
    const to = new Date('2026-04-30')
    await useCase.execute({
      organizationId: 'org-1',
      consentLgpd: true,
      createdFrom: from,
      createdTo: to,
      limit: 20,
    })
    expect(repo.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        consentLgpd: true,
        createdFrom: from,
        createdTo: to,
      }),
      expect.anything()
    )
  })
})
