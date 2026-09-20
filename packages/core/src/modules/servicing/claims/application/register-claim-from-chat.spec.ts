import { describe, expect, it, vi } from 'vitest'
import { hashDocument } from '@repo/shared'
import type {
  ClientData,
  ClientRepository,
} from '../../../client/domain/client-repository.js'
import type {
  ContactData,
  ContactRepository,
} from '../../../sales/leads/domain/contact-repository.js'
import type {
  PolicyData,
  PolicyRepository,
} from '../../../sales/policies/domain/policy-repository.js'
import type { ClaimData } from '../domain/claim-repository.js'
import type { CreateClaim } from './create-claim.js'
import { RegisterClaimFromChat } from './register-claim-from-chat.js'

function makeClient(overrides: Partial<ClientData> = {}): ClientData {
  return {
    id: 'client-1',
    organizationId: 'org-1',
    legalName: 'João Silva',
    document: '52998224725',
    documentHash: 'hash',
    personType: 'INDIVIDUAL',
    profession: null,
    maritalStatus: null,
    address: null,
    fiscalBirthDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

function makeContact(overrides: Partial<ContactData> = {}): ContactData {
  return {
    id: 'contact-1',
    organizationId: 'org-1',
    name: 'João Silva',
    phone: '1198888777',
    email: 'joao@test.com',
    source: 'MANUAL',
    salespersonId: 'u-1',
    clientId: 'client-1',
    tags: [],
    socialMedia: null,
    notes: null,
    consentLgpd: true,
    birthDate: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  }
}

function makePolicy(overrides: Partial<PolicyData> = {}): PolicyData {
  return {
    id: 'pol-1',
    organizationId: 'org-1',
    proposalId: 'prop-1',
    clientId: 'client-1',
    salespersonId: 'u-1',
    insurerId: 'ins-1',
    policyNumber: 'POL-1',
    status: 'ACTIVE',
    branch: 'AUTO',
    premiumValueInCents: 150000,
    coverageDetails: null,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2026-01-01'),
    cancelledAt: null,
    cancelReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeClaim(overrides: Partial<ClaimData> = {}): ClaimData {
  return {
    id: 'claim-1',
    organizationId: 'org-1',
    claimNumber: 42,
    policyId: 'pol-1',
    clientId: 'client-1',
    insurerId: 'ins-1',
    assignedToId: null,
    status: 'REGISTERED',
    priority: 'URGENT',
    description: 'Colisão',
    estimatedValueInCents: null,
    incidentDate: null,
    incidentLocation: null,
    reportedAt: new Date(),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function createDeps(options?: {
  client?: ClientData | null
  contact?: ContactData | null
  policies?: PolicyData[]
  claim?: ClaimData
}) {
  const client = options?.client === undefined ? makeClient() : options.client
  const clientRepo = {
    findByDocumentHash: vi.fn().mockResolvedValue(client),
    findById: vi.fn().mockResolvedValue(client),
  } as unknown as ClientRepository
  const contactRepo = {
    findByPhone: vi.fn().mockResolvedValue(options?.contact ?? null),
  } as unknown as ContactRepository
  const policyRepo = {
    listActiveForClient: vi
      .fn()
      .mockResolvedValue(options?.policies ?? [makePolicy()]),
  } as unknown as PolicyRepository
  const createClaim = {
    execute: vi.fn().mockResolvedValue(options?.claim ?? makeClaim()),
  } as unknown as CreateClaim
  return { clientRepo, contactRepo, policyRepo, createClaim }
}

const BASE_INPUT = {
  organizationId: 'org-1',
  phoneOrDocument: '1198888777',
  description: 'Colisão traseira',
}

describe('RegisterClaimFromChat', () => {
  it('missing client returns dataSaved true and does not CreateClaim', async () => {
    const deps = createDeps({ client: null, contact: null })
    const useCase = new RegisterClaimFromChat(
      deps.clientRepo,
      deps.contactRepo,
      deps.policyRepo,
      deps.createClaim
    )
    const result = await useCase.execute({
      ...BASE_INPUT,
      phoneOrDocument: '00000000000',
    })
    expect(deps.createClaim.execute).not.toHaveBeenCalled()
    expect(result.claimCreated).toBe(false)
    expect(result.claimNumber).toBeNull()
    expect(result.dataSaved).toBe(true)
    expect(result.message).toBe(
      'Cliente não encontrado. Dados registrados para o corretor.'
    )
  })

  it('no ACTIVE policy returns dataSaved true and does not CreateClaim', async () => {
    const deps = createDeps({
      client: makeClient(),
      policies: [],
    })
    const useCase = new RegisterClaimFromChat(
      deps.clientRepo,
      deps.contactRepo,
      deps.policyRepo,
      deps.createClaim
    )
    const result = await useCase.execute({
      ...BASE_INPUT,
      phoneOrDocument: '52998224725',
    })
    expect(deps.createClaim.execute).not.toHaveBeenCalled()
    expect(result.claimCreated).toBe(false)
    expect(result.claimNumber).toBeNull()
    expect(result.dataSaved).toBe(true)
    expect(result.message).toBe(
      'Nenhuma apólice ativa encontrada. Dados registrados para o corretor.'
    )
  })

  it('creates URGENT claim SIN-number dataSaved false', async () => {
    const claim = makeClaim({ claimNumber: 42 })
    const deps = createDeps({ claim, policies: [makePolicy()] })
    const useCase = new RegisterClaimFromChat(
      deps.clientRepo,
      deps.contactRepo,
      deps.policyRepo,
      deps.createClaim
    )
    const result = await useCase.execute({
      ...BASE_INPUT,
      phoneOrDocument: '52998224725',
    })
    expect(deps.createClaim.execute).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'URGENT' })
    )
    expect(result.claimCreated).toBe(true)
    expect(result.claimNumber).toBe(`SIN-${String(claim.claimNumber)}`)
    expect(result.dataSaved).toBe(false)
    expect(result.claimData).toBeNull()
    expect(result.message).toBe(
      `Sinistro ${claim.claimNumber} registrado com prioridade urgente.`
    )
  })

  it('11 and 14 digit documents lookup documentHash not phone', async () => {
    const eleven = '52998224725'
    const fourteen = '11222333000181'
    const deps = createDeps({ client: makeClient() })
    const useCase = new RegisterClaimFromChat(
      deps.clientRepo,
      deps.contactRepo,
      deps.policyRepo,
      deps.createClaim
    )
    await useCase.execute({ ...BASE_INPUT, phoneOrDocument: eleven })
    expect(deps.clientRepo.findByDocumentHash).toHaveBeenCalledWith(
      hashDocument(eleven),
      'org-1'
    )
    expect(deps.contactRepo.findByPhone).not.toHaveBeenCalled()
    vi.mocked(deps.clientRepo.findByDocumentHash).mockClear()
    vi.mocked(deps.contactRepo.findByPhone).mockClear()
    await useCase.execute({ ...BASE_INPUT, phoneOrDocument: fourteen })
    expect(deps.clientRepo.findByDocumentHash).toHaveBeenCalledWith(
      hashDocument(fourteen),
      'org-1'
    )
    expect(deps.contactRepo.findByPhone).not.toHaveBeenCalled()
  })

  it('non-document phoneOrDocument lookups contact by raw phone', async () => {
    const rawPhone = '1198888777'
    const deps = createDeps({
      client: makeClient(),
      contact: makeContact({ phone: rawPhone, clientId: 'client-1' }),
    })
    const useCase = new RegisterClaimFromChat(
      deps.clientRepo,
      deps.contactRepo,
      deps.policyRepo,
      deps.createClaim
    )
    await useCase.execute({ ...BASE_INPUT, phoneOrDocument: rawPhone })
    expect(deps.contactRepo.findByPhone).toHaveBeenCalledWith(rawPhone, 'org-1')
    expect(deps.clientRepo.findByDocumentHash).not.toHaveBeenCalled()
  })

  it('picks ACTIVE policy with greatest endDate', async () => {
    const earlier = makePolicy({
      id: 'pol-old',
      endDate: new Date('2025-01-01'),
    })
    const later = makePolicy({
      id: 'pol-new',
      endDate: new Date('2027-06-01'),
    })
    const deps = createDeps({ policies: [earlier, later] })
    const useCase = new RegisterClaimFromChat(
      deps.clientRepo,
      deps.contactRepo,
      deps.policyRepo,
      deps.createClaim
    )
    await useCase.execute({
      ...BASE_INPUT,
      phoneOrDocument: '52998224725',
    })
    expect(deps.createClaim.execute).toHaveBeenCalledWith(
      expect.objectContaining({ policyId: 'pol-new' })
    )
  })
})
