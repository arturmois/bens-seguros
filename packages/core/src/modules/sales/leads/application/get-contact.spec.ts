import { describe, it, expect, vi } from 'vitest'
import 'reflect-metadata'
import { GetContact } from './get-contact.js'
import type {
  ContactRepository,
  ContactWithStage,
} from '../domain/contact-repository.js'

describe('GetContact', () => {
  it('retorna contato com stage', async () => {
    const data: ContactWithStage = {
      id: 'c-1',
      organizationId: 'org-1',
      name: 'Maria',
      phone: '+55119',
      email: null,
      source: 'MANUAL',
      salespersonId: 'u-1',
      clientId: null,
      tags: [],
      socialMedia: null,
      notes: null,
      consentLgpd: true,
      birthDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      stage: 'LEAD',
      activePolicyCount: 0,
    }
    const repo = {
      findByIdWithStage: vi.fn(async () => data),
    } as unknown as ContactRepository
    const result = await new GetContact(repo).execute({
      id: 'c-1',
      organizationId: 'org-1',
    })
    expect(result.stage).toBe('LEAD')
  })
  it('lança ContactNotFound quando não existe', async () => {
    const repo = {
      findByIdWithStage: vi.fn(async () => null),
    } as unknown as ContactRepository
    await expect(
      new GetContact(repo).execute({ id: 'x', organizationId: 'org-1' })
    ).rejects.toThrow(/não encontrado/i)
  })
})
