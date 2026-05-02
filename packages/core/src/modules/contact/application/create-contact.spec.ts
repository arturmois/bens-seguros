import { describe, it, expect, vi } from 'vitest'
import 'reflect-metadata'
import { CreateContact } from './create-contact.js'
import type {
  ContactRepository,
  ContactData,
} from '../domain/contact-repository.js'

function createMockRepo(): ContactRepository {
  return {
    save: vi.fn(
      async (data) =>
        ({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        }) as ContactData
    ),
    findById: vi.fn(),
    findByIdWithStage: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  }
}

describe('CreateContact', () => {
  it('creates contact without document', async () => {
    const repo = createMockRepo()
    const useCase = new CreateContact(repo)
    const result = await useCase.execute({
      organizationId: 'org-1',
      name: 'Maria',
      phone: '+5511999999999',
      source: 'CHAT_WHATSAPP',
      salespersonId: 'user-1',
      consentLgpd: true,
    })
    expect(result.id).toBeDefined()
    expect(result.clientId).toBeNull()
    expect(repo.save).toHaveBeenCalledTimes(1)
  })

  it('rejects when name is empty', async () => {
    const repo = createMockRepo()
    const useCase = new CreateContact(repo)
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        name: '',
        phone: '+5511999999999',
        source: 'MANUAL',
        salespersonId: 'user-1',
        consentLgpd: true,
      })
    ).rejects.toThrow(/nome/i)
    expect(repo.save).not.toHaveBeenCalled()
  })

  it('rejects when phone and email both missing', async () => {
    const repo = createMockRepo()
    const useCase = new CreateContact(repo)
    await expect(
      useCase.execute({
        organizationId: 'org-1',
        name: 'Maria',
        source: 'MANUAL',
        salespersonId: 'user-1',
        consentLgpd: true,
      })
    ).rejects.toThrow(/telefone|email/i)
  })
})
