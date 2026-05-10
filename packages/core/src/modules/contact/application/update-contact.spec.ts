import { describe, it, expect, vi } from 'vitest'
import 'reflect-metadata'
import { UpdateContact } from './update-contact.js'
import type {
  ContactRepository,
  ContactData,
} from '../domain/contact-repository.js'

const existing: ContactData = {
  id: 'c-1',
  organizationId: 'org-1',
  name: 'Maria',
  phone: '+5511999998888',
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
}

describe('UpdateContact', () => {
  it('atualiza campos básicos', async () => {
    const repo = {
      findById: vi.fn(async () => existing),
      update: vi.fn(async (_id, _org, data) => ({ ...existing, ...data })),
      findByIdWithStage: vi.fn(async (_id, _org) => ({
        ...existing,
        name: 'Maria Silva',
        tags: ['vip'],
        stage: 'LEAD' as const,
        activePolicyCount: 0,
      })),
    } as unknown as ContactRepository
    const result = await new UpdateContact(repo).execute({
      id: 'c-1',
      organizationId: 'org-1',
      name: 'Maria Silva',
      tags: ['vip'],
    })
    expect(result.name).toBe('Maria Silva')
    expect(result.stage).toBe('LEAD')
    expect(result.activePolicyCount).toBe(0)
  })
  it('rejeita quando contato não existe', async () => {
    const repo = {
      findById: vi.fn(async () => null),
    } as unknown as ContactRepository
    await expect(
      new UpdateContact(repo).execute({
        id: 'x',
        organizationId: 'org-1',
        name: 'Y',
      })
    ).rejects.toThrow(/não encontrado/i)
  })
})
