import { describe, expect, it, vi } from 'vitest'
import type { CreateContact } from './create-contact.js'
import type { CreateProposal } from '../../proposals/application/create-proposal.js'
import type { ContactData } from '../domain/contact-repository.js'
import type { MemberRecord } from '../../../workspace/members/domain/member-repository.js'
import { CaptureLead } from './capture-lead.js'

const ORG_ID = 'org-1'
const PHONE = '11999999999'

function existingContact(): ContactData {
  return {
    id: 'contact-existing',
    organizationId: ORG_ID,
    name: 'João Silva',
    phone: PHONE,
    email: null,
    source: 'CHAT_WHATSAPP',
    salespersonId: 'user-original',
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
}

function oldestMember(): MemberRecord {
  return {
    id: 'member-oldest',
    userId: 'user-oldest',
    organizationId: ORG_ID,
    role: 'OWNER',
    active: true,
  }
}

function collaborators(
  overrides: { contact?: ContactData | null; member?: MemberRecord | null } = {}
) {
  const contactRepo = {
    findByPhone: vi.fn().mockResolvedValue(overrides.contact ?? null),
  }
  const memberRepo = {
    findOldestActive: vi
      .fn()
      .mockResolvedValue(
        overrides.member === undefined ? oldestMember() : overrides.member
      ),
  }
  const createContact = {
    execute: vi.fn().mockResolvedValue({
      id: 'contact-new',
      name: 'Maria Souza',
    }),
  }
  const createProposal = {
    execute: vi.fn().mockResolvedValue({ id: 'proposal-1' }),
  }
  const useCase = new CaptureLead(
    contactRepo,
    memberRepo,
    createContact as unknown as CreateContact,
    createProposal as unknown as CreateProposal
  )
  return { useCase, contactRepo, memberRepo, createContact, createProposal }
}

describe('CaptureLead', () => {
  it('reuses existing contact by phone and skips CreateContact', async () => {
    const { useCase, createContact, createProposal } = collaborators({
      contact: existingContact(),
    })
    const result = await useCase.execute({
      organizationId: ORG_ID,
      clientName: 'João Silva',
      clientPhone: PHONE,
      insuranceType: 'AUTO',
    })
    expect(createContact.execute).not.toHaveBeenCalled()
    expect(createProposal.execute).toHaveBeenCalledOnce()
    expect(result.contactId).toBe('contact-existing')
  })

  it('new phone CreateContact consentLgpd true oldest member MANUAL', async () => {
    const { useCase, createContact } = collaborators({ contact: null })
    await useCase.execute({
      organizationId: ORG_ID,
      clientName: 'Maria Souza',
      clientPhone: '11988888888',
      insuranceType: 'AUTO',
    })
    expect(createContact.execute).toHaveBeenCalledWith({
      organizationId: ORG_ID,
      name: 'Maria Souza',
      phone: '11988888888',
      source: 'MANUAL',
      salespersonId: 'user-oldest',
      consentLgpd: true,
    })
  })

  it('TRAVEL maps to branch OTHER NEW_INSURANCE', async () => {
    const { useCase, createProposal } = collaborators({ contact: null })
    await useCase.execute({
      organizationId: ORG_ID,
      clientName: 'Maria Souza',
      clientPhone: '11988888888',
      insuranceType: 'TRAVEL',
    })
    expect(createProposal.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: 'OTHER',
        boardType: 'NEW_INSURANCE',
      })
    )
  })

  it('throws NO_MEMBER No active member in org', async () => {
    const { useCase } = collaborators({ member: null })
    try {
      await useCase.execute({
        organizationId: ORG_ID,
        clientName: 'João Silva',
        clientPhone: PHONE,
        insuranceType: 'AUTO',
      })
      throw new Error('expected CaptureLead to throw')
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      if (!(error instanceof Error)) return
      expect('code' in error && error.code).toBe('NO_MEMBER')
      expect(error.message).toBe('No active member in org')
    }
  })

  it('does not persist notes on CreateContact', async () => {
    const { useCase, createContact } = collaborators({ contact: null })
    await useCase.execute({
      organizationId: ORG_ID,
      clientName: 'Maria Souza',
      clientPhone: '11988888888',
      insuranceType: 'AUTO',
      notes: 'detalhes do chat',
    })
    expect(createContact.execute).toHaveBeenCalledOnce()
    const input = createContact.execute.mock.calls[0]?.[0]
    expect(input).toBeDefined()
    expect(input).not.toHaveProperty('notes')
  })
})
