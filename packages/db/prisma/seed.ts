/* eslint-disable no-console */
import { PrismaPg } from '@prisma/adapter-pg'
import {
  createCipheriv,
  createHmac,
  randomBytes,
  scryptSync,
} from 'node:crypto'
import { PrismaClient } from '../generated/client/client.js'

// ---------------------------------------------------------------------------
// Config — mirrors .env.example defaults so the seed can run standalone
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required to run the seed.')
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    'ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).'
  )
}

const HMAC_KEY = process.env.HMAC_KEY

const encryptionKeyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex')
const hmacKeyBuffer = HMAC_KEY
  ? Buffer.from(HMAC_KEY, 'utf8')
  : encryptionKeyBuffer

// ---------------------------------------------------------------------------
// Crypto helpers (mirrors packages/shared/src/crypto.ts — no @repo/env import)
// ---------------------------------------------------------------------------

interface EncryptedField {
  readonly ciphertext: string
  readonly iv: string
  readonly tag: string
}

function encrypt(plaintext: string): EncryptedField {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKeyBuffer, iv, {
    authTagLength: 16,
  })
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  }
}

function stripNonDigits(value: string): string {
  return value.replace(/\D/g, '')
}

function hashDocument(document: string): string {
  const digits = stripNonDigits(document)
  return createHmac('sha256', hmacKeyBuffer).update(digits).digest('hex')
}

function maskDocument(document: string): string {
  const digits = stripNonDigits(document)
  if (digits.length === 11) {
    return `***.***.${digits.slice(6, 9)}-${digits.slice(9)}`
  }
  if (digits.length === 14) {
    return `**.***.***/${digits.slice(8, 12)}-${digits.slice(12)}`
  }
  const visible = digits.slice(-4)
  const masked = '*'.repeat(Math.max(0, digits.length - 4))
  return `${masked}${visible}`
}

// ---------------------------------------------------------------------------
// Password hashing — mirrors Better Auth v1.x scrypt format (salt:hash hex)
// ---------------------------------------------------------------------------

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const key = scryptSync(password.normalize('NFKC'), salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  })
  return `${salt}:${key.toString('hex')}`
}

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

let idCounter = 0
function stableId(prefix: string): string {
  idCounter++
  return `seed_${prefix}_${String(idCounter).padStart(3, '0')}`
}

// ---------------------------------------------------------------------------
// Main seed
// ---------------------------------------------------------------------------

const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding database...\n')

  // Check if seed data already exists
  const existingOrg = await prisma.organization.findUnique({
    where: { slug: 'corretora-exemplo' },
  })
  if (existingOrg) {
    console.log(
      '⏭️  Seed data already exists (org "corretora-exemplo"). Skipping.\n' +
        '   To re-seed, delete the organization first or reset the database.'
    )
    return
  }

  // =========================================================================
  // 1. Organization
  // =========================================================================

  const org = await prisma.organization.create({
    data: {
      id: stableId('org'),
      name: 'Corretora Exemplo',
      slug: 'corretora-exemplo',
      active: true,
      metadata: {
        cnpj: '12.345.678/0001-95',
        phone: '(11) 99999-0000',
        address: 'Rua das Acácias, 100 - São Paulo, SP',
      },
    },
  })

  console.log(`  ✓ Organization: ${org.name} (${org.id})`)

  // =========================================================================
  // 2. Users + Accounts + Members
  // =========================================================================

  const PASSWORD = 'Senha@123'
  const hashedPw = hashPassword(PASSWORD)

  const usersData = [
    {
      id: stableId('user'),
      email: 'test@user.com',
      name: 'Carlos Administrador',
      role: 'OWNER' as const,
    },
    {
      id: stableId('user'),
      email: 'admin@user.com',
      name: 'Ana Gestora',
      role: 'ADMIN' as const,
    },
    {
      id: stableId('user'),
      email: 'gerente@user.com',
      name: 'Marcos Gerente',
      role: 'MANAGER' as const,
    },
    {
      id: stableId('user'),
      email: 'vendedor@user.com',
      name: 'Juliana Vendedora',
      role: 'COMMERCIAL' as const,
    },
    {
      id: stableId('user'),
      email: 'viewer@user.com',
      name: 'Roberto Visualizador',
      role: 'VIEWER' as const,
    },
  ]

  for (const u of usersData) {
    await prisma.user.create({
      data: {
        id: u.id,
        email: u.email,
        name: u.name,
        emailVerified: true,
        acceptedTermsAt: new Date(),
        termsVersion: '1.0',
        privacyVersion: '1.0',
        accounts: {
          create: {
            accountId: u.email,
            providerId: 'credential',
            password: hashedPw,
          },
        },
      },
    })

    await prisma.member.create({
      data: {
        organizationId: org.id,
        userId: u.id,
        role: u.role,
        active: true,
        commissionSplitPercentage: u.role === 'COMMERCIAL' ? 5000 : 0,
      },
    })
  }

  const ownerId = usersData[0]!.id
  const commercialId = usersData[3]!.id

  // Set active organization in sessions (create one for the main test user)
  await prisma.session.create({
    data: {
      id: stableId('session'),
      token: `seed-session-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      userId: ownerId,
      activeOrganizationId: org.id,
    },
  })

  console.log(
    `  ✓ Users: ${usersData.length} (all with password "${PASSWORD}")`
  )

  // =========================================================================
  // 3. Insurers
  // =========================================================================

  const insurerNames = [
    'Porto Seguro',
    'Bradesco Seguros',
    'SulAmérica',
    'Allianz',
    'Tokio Marine',
    'Mapfre',
    'Liberty Seguros',
    'HDI Seguros',
    'Itaú Seguros',
    'Zurich',
    'Generali',
    'Chubb',
    'AXA',
    'MetLife',
    'Prudential',
    'Icatu Seguros',
    'Caixa Seguros',
    'Banco do Brasil Seguros',
    'Santander Seguros',
    'Sompo Seguros',
    'Too Seguros',
    'Excelsior Seguros',
    'Yelum',
    'Kovr',
    'Pottencial',
  ]

  const insurers: Array<{ id: string; name: string }> = []
  for (const name of insurerNames) {
    const insurer = await prisma.insurer.create({
      data: {
        id: stableId('insurer'),
        organizationId: org.id,
        name,
        code: name.slice(0, 4).toUpperCase(),
        active: true,
      },
    })
    insurers.push(insurer)
  }

  console.log(`  ✓ Insurers: ${insurers.length}`)

  // =========================================================================
  // 4. Clients (PF + PJ — fiscal data only)
  // =========================================================================

  interface ClientSeed {
    key: string
    legalName: string
    cpf: string
    personType: 'INDIVIDUAL' | 'COMPANY'
    profession?: string
    maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER'
    fiscalBirthDate?: Date
    address?: Record<string, string>
  }

  const clientsData: ClientSeed[] = [
    // PF
    {
      key: 'client-1',
      legalName: 'Maria da Silva Santos',
      cpf: '52998224725',
      personType: 'INDIVIDUAL',
      profession: 'Engenheira Civil',
      maritalStatus: 'MARRIED',
      fiscalBirthDate: new Date('1985-03-15'),
      address: {
        street: 'Rua das Flores, 123',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      },
    },
    {
      key: 'client-2',
      legalName: 'João Carlos Oliveira',
      cpf: '11144477735',
      personType: 'INDIVIDUAL',
      profession: 'Médico',
      fiscalBirthDate: new Date('1978-09-22'),
    },
    {
      key: 'client-3',
      legalName: 'Pedro Henrique Costa',
      cpf: '98765432100',
      personType: 'INDIVIDUAL',
      fiscalBirthDate: new Date('1990-12-01'),
    },
    // PJ
    {
      key: 'client-4',
      legalName: 'Tech Solutions Ltda',
      cpf: '12345678000195',
      personType: 'COMPANY',
      address: {
        street: 'Av. Paulista, 1000',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      },
    },
    {
      key: 'client-5',
      legalName: 'Construtora ABC LTDA',
      cpf: '98765432000180',
      personType: 'COMPANY',
    },
  ]

  const clientIdByKey = new Map<string, string>()
  for (const c of clientsData) {
    const id = stableId('client')
    clientIdByKey.set(c.key, id)

    await prisma.client.create({
      data: {
        id,
        organizationId: org.id,
        legalName: c.legalName,
        document: maskDocument(c.cpf),
        documentEncrypted: JSON.stringify(encrypt(c.cpf)),
        documentHash: hashDocument(c.cpf),
        personType: c.personType,
        profession: c.profession,
        maritalStatus: c.maritalStatus,
        fiscalBirthDate: c.fiscalBirthDate,
        address: c.address,
      },
    })
  }

  console.log(
    `  ✓ Clients: ${clientsData.length} (${clientsData.filter((c) => c.personType === 'INDIVIDUAL').length} PF, ${clientsData.filter((c) => c.personType === 'COMPANY').length} PJ)`
  )

  // =========================================================================
  // 4b. Contacts (5 leads frios + 9 vinculados a Clients)
  // =========================================================================

  interface ContactSeed {
    key: string
    name: string
    phone?: string
    email?: string
    source:
      | 'MANUAL'
      | 'CHAT_WHATSAPP'
      | 'CHAT_WIDGET'
      | 'FORM_WEB'
      | 'IMPORT'
      | 'REFERRAL'
    clientKey: string | null
  }

  const contactsData: ContactSeed[] = [
    // Leads frios (sem clientId) — 5
    {
      key: 'lead-1',
      name: 'Ana Beatriz',
      phone: '+5511988887777',
      email: 'ana@example.com',
      source: 'CHAT_WHATSAPP',
      clientKey: null,
    },
    {
      key: 'lead-2',
      name: 'Carlos Eduardo',
      phone: '+5511977776666',
      source: 'FORM_WEB',
      clientKey: null,
    },
    {
      key: 'lead-3',
      name: 'Fernanda Lima',
      email: 'fernanda@example.com',
      source: 'REFERRAL',
      clientKey: null,
    },
    {
      key: 'lead-4',
      name: 'Ricardo Souza',
      phone: '+5511966665555',
      source: 'MANUAL',
      clientKey: null,
    },
    {
      key: 'lead-5',
      name: 'Patrícia Mendes',
      phone: '+5511955554444',
      email: 'patricia@example.com',
      source: 'CHAT_WIDGET',
      clientKey: null,
    },
    // PF linkados — 1 por Client PF (clients 1 e 2)
    {
      key: 'c1',
      name: 'Maria Silva',
      phone: '+5511944443333',
      email: 'maria.silva@email.com',
      source: 'MANUAL',
      clientKey: 'client-1',
    },
    {
      key: 'c2',
      name: 'João Oliveira',
      phone: '+5511933332222',
      source: 'MANUAL',
      clientKey: 'client-2',
    },
    // Pedro Henrique (client-3) unificado em 2 contatos (WhatsApp + Form)
    {
      key: 'c3a',
      name: 'Pedro (WhatsApp)',
      phone: '+5511922221111',
      source: 'CHAT_WHATSAPP',
      clientKey: 'client-3',
    },
    {
      key: 'c3b',
      name: 'Pedro (Form)',
      email: 'pedro.h@example.com',
      source: 'FORM_WEB',
      clientKey: 'client-3',
    },
    // PJ Tech Solutions (client-4) — 2 representantes
    {
      key: 'c4-gerente',
      name: 'Diego (Gerente Tech Solutions)',
      phone: '+5511911110000',
      email: 'diego@techsolutions.com.br',
      source: 'MANUAL',
      clientKey: 'client-4',
    },
    {
      key: 'c4-fin',
      name: 'Beatriz (Financeiro Tech Solutions)',
      phone: '+5511900009999',
      email: 'beatriz@techsolutions.com.br',
      source: 'MANUAL',
      clientKey: 'client-4',
    },
    // PJ Construtora ABC (client-5) — 3 representantes
    {
      key: 'c5-diretor',
      name: 'Roberto (Diretor ABC)',
      phone: '+5511899998888',
      source: 'MANUAL',
      clientKey: 'client-5',
    },
    {
      key: 'c5-gerente',
      name: 'Lúcia (Gerente Comercial ABC)',
      email: 'lucia@abc.com.br',
      source: 'MANUAL',
      clientKey: 'client-5',
    },
    {
      key: 'c5-fin',
      name: 'Marcos (Financeiro ABC)',
      phone: '+5511888887777',
      source: 'MANUAL',
      clientKey: 'client-5',
    },
  ]

  const contactIdByKey = new Map<string, string>()
  for (const c of contactsData) {
    const id = stableId('contact')
    contactIdByKey.set(c.key, id)

    await prisma.contact.create({
      data: {
        id,
        organizationId: org.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        source: c.source,
        salespersonId: commercialId,
        clientId: c.clientKey ? clientIdByKey.get(c.clientKey) : null,
        tags: [],
        consentLgpd: c.clientKey !== null,
      },
    })
  }

  const contactsWithClient = contactsData.filter((c) => c.clientKey !== null)
  const contactsWithoutClient = contactsData.filter((c) => c.clientKey === null)
  console.log(
    `  ✓ Contacts: ${contactsData.length} (${contactsWithoutClient.length} leads frios, ${contactsWithClient.length} vinculados a Clients)`
  )

  // =========================================================================
  // 5. Proposals (various stages and board types — now via Contact)
  // =========================================================================

  const branches = [
    'AUTO',
    'RESIDENTIAL',
    'CONDOMINIUM',
    'BUSINESS',
    'LIFE',
    'OTHER',
  ] as const

  type ProposalStageLiteral =
    | 'CAPTURE'
    | 'QUOTE'
    | 'PROTOCOL'
    | 'INSPECTION'
    | 'PAYMENT'
    | 'POLICY_ISSUED'
    | 'LOST'

  interface ProposalSeed {
    contactKey: string
    stage: ProposalStageLiteral
    branchIndex: number
    premiumInCents: number
  }

  // Distribuicao:
  //  - 2 leads frios (CAPTURE/QUOTE) — Contact sem Client
  //  - 3 em PROTOCOL/INSPECTION/PAYMENT — Contact com Client
  //  - 3 em POLICY_ISSUED — Contact com Client (essas viram Policy)
  //  - 1 LOST — Contact com Client
  const proposalsSeed: ProposalSeed[] = [
    // Leads frios — Contact sem Client (exercitando o novo fluxo)
    {
      contactKey: 'lead-1',
      stage: 'CAPTURE',
      branchIndex: 0,
      premiumInCents: 180000,
    },
    {
      contactKey: 'lead-3',
      stage: 'QUOTE',
      branchIndex: 1,
      premiumInCents: 240000,
    },
    // Em andamento — Contact com Client
    {
      contactKey: 'c1',
      stage: 'PROTOCOL',
      branchIndex: 0,
      premiumInCents: 320000,
    },
    {
      contactKey: 'c2',
      stage: 'INSPECTION',
      branchIndex: 4,
      premiumInCents: 280000,
    },
    {
      contactKey: 'c3a',
      stage: 'PAYMENT',
      branchIndex: 1,
      premiumInCents: 360000,
    },
    // POLICY_ISSUED — viram Policy
    {
      contactKey: 'c4-gerente',
      stage: 'POLICY_ISSUED',
      branchIndex: 3,
      premiumInCents: 480000,
    },
    {
      contactKey: 'c5-diretor',
      stage: 'POLICY_ISSUED',
      branchIndex: 2,
      premiumInCents: 520000,
    },
    {
      contactKey: 'c1',
      stage: 'POLICY_ISSUED',
      branchIndex: 0,
      premiumInCents: 410000,
    },
    // LOST — Contact com Client
    { contactKey: 'c2', stage: 'LOST', branchIndex: 0, premiumInCents: 200000 },
  ]

  interface ProposalRecord {
    id: string
    contactId: string
    stage: string
    branch: string
    premiumValueInCents: number
  }

  const proposals: ProposalRecord[] = []

  for (let i = 0; i < proposalsSeed.length; i++) {
    const seed = proposalsSeed[i]!
    const contactId = contactIdByKey.get(seed.contactKey)
    if (!contactId) {
      throw new Error(`Contact key not found: ${seed.contactKey}`)
    }
    const branch = branches[seed.branchIndex % branches.length]!
    const insurer = insurers[i % insurers.length]!
    const stage = seed.stage

    const proposal = await prisma.proposal.create({
      data: {
        id: stableId('proposal'),
        organizationId: org.id,
        contactId,
        salespersonId: commercialId,
        stage,
        boardType: 'NEW_INSURANCE',
        branch,
        premiumValueInCents: seed.premiumInCents,
        commissionPercentageInCents: 1500, // 15%
        insurerId: insurer.id,
        coverageStartDate:
          stage === 'POLICY_ISSUED'
            ? new Date()
            : stage !== 'LOST'
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              : null,
        coverageEndDate:
          stage === 'POLICY_ISSUED'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            : stage !== 'LOST'
              ? new Date(Date.now() + 395 * 24 * 60 * 60 * 1000)
              : null,
        lostReason:
          stage === 'LOST' ? 'Cliente optou por outra seguradora' : null,
        details: {
          notes: `Proposta de ${branch.toLowerCase()}`,
        },
      },
    })
    proposals.push({
      id: proposal.id,
      contactId,
      stage,
      branch,
      premiumValueInCents: seed.premiumInCents,
    })
  }

  // Renewal proposals (QUOTE) — usar contatos com Client (so faz sentido renovar de quem ja eh cliente)
  const renewalContactKeys = ['c4-gerente', 'c5-diretor'] as const
  for (const contactKey of renewalContactKeys) {
    const contactId = contactIdByKey.get(contactKey)
    if (!contactId) continue

    const branch = branches[Math.floor(Math.random() * branches.length)]!
    const premium = (Math.floor(Math.random() * 40) + 15) * 10000

    const proposal = await prisma.proposal.create({
      data: {
        id: stableId('proposal'),
        organizationId: org.id,
        contactId,
        salespersonId: commercialId,
        stage: 'QUOTE',
        boardType: 'RENEWAL',
        branch,
        premiumValueInCents: premium,
        commissionPercentageInCents: 1500,
        renewalPolicyNumber: `POL-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        insurerId: insurers[0]!.id,
        details: { notes: `Renovação` },
      },
    })
    proposals.push({
      id: proposal.id,
      contactId,
      stage: 'QUOTE',
      branch,
      premiumValueInCents: premium,
    })
  }

  console.log(`  ✓ Proposals: ${proposals.length}`)

  // =========================================================================
  // 6. Policies (from POLICY_ISSUED proposals + extras)
  // =========================================================================

  interface PolicyRecord {
    id: string
    clientId: string
    premiumValueInCents: number
    insurerId: string
  }

  const policies: PolicyRecord[] = []
  const issuedProposals = proposals.filter((p) => p.stage === 'POLICY_ISSUED')

  // Helper: derive clientId from proposal via Contact
  async function resolveProposalClientId(
    proposalId: string
  ): Promise<string | null> {
    const result = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { contact: true },
    })
    return result?.contact?.clientId ?? null
  }

  // Policies from issued proposals (skip if Contact has no Client linked)
  for (let i = 0; i < issuedProposals.length; i++) {
    const prop = issuedProposals[i]!
    const clientId = await resolveProposalClientId(prop.id)
    if (!clientId) continue // Contact ainda nao foi promovido a Client

    const insurer = insurers[i % insurers.length]!
    const policyNumber = `POL-${String(2024000 + i + 1)}`

    const policy = await prisma.policy.create({
      data: {
        id: stableId('policy'),
        organizationId: org.id,
        proposalId: prop.id,
        clientId,
        salespersonId: commercialId,
        insurerId: insurer.id,
        policyNumber,
        status: 'ACTIVE',
        branch: prop.branch as (typeof branches)[number],
        premiumValueInCents: prop.premiumValueInCents,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        coverageDetails: {
          type: prop.branch,
          limit: prop.premiumValueInCents * 10,
          deductible: prop.premiumValueInCents * 0.1,
        },
      },
    })
    policies.push({
      id: policy.id,
      clientId,
      premiumValueInCents: prop.premiumValueInCents,
      insurerId: insurer.id,
    })
  }

  // Extra policies for clients that don't have one yet (1 by 1)
  // Para cada Client sem Policy, criamos: Proposal POLICY_ISSUED via Contact -> Policy
  const clientsWithPolicies = new Set(policies.map((p) => p.clientId))
  const extraSeeds: Array<{ clientKey: string; contactKey: string }> = [
    { clientKey: 'client-2', contactKey: 'c2' },
    { clientKey: 'client-3', contactKey: 'c3b' },
  ]

  let extraIndex = 0
  for (const seed of extraSeeds) {
    const clientId = clientIdByKey.get(seed.clientKey)
    const contactId = contactIdByKey.get(seed.contactKey)
    if (!clientId || !contactId) continue
    if (clientsWithPolicies.has(clientId)) continue

    const insurer = insurers[(extraIndex + 2) % insurers.length]!
    const branch = branches[(extraIndex + 1) % branches.length]!
    const premium = (Math.floor(Math.random() * 40) + 10) * 10000
    const policyNumber = `POL-${String(2024100 + extraIndex + 1)}`

    const extraProposal = await prisma.proposal.create({
      data: {
        id: stableId('proposal'),
        organizationId: org.id,
        contactId,
        salespersonId: commercialId,
        stage: 'POLICY_ISSUED',
        boardType: 'NEW_INSURANCE',
        branch,
        premiumValueInCents: premium,
        commissionPercentageInCents: 1500,
        insurerId: insurer.id,
        coverageStartDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        coverageEndDate: new Date(Date.now() + 185 * 24 * 60 * 60 * 1000),
      },
    })

    const policy = await prisma.policy.create({
      data: {
        id: stableId('policy'),
        organizationId: org.id,
        proposalId: extraProposal.id,
        clientId,
        salespersonId: commercialId,
        insurerId: insurer.id,
        policyNumber,
        status: extraIndex === 0 ? 'EXPIRED' : 'ACTIVE',
        branch,
        premiumValueInCents: premium,
        startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        endDate:
          extraIndex === 0
            ? new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
            : new Date(Date.now() + 185 * 24 * 60 * 60 * 1000),
        coverageDetails: {
          type: branch,
          limit: premium * 10,
          deductible: premium * 0.1,
        },
      },
    })
    policies.push({
      id: policy.id,
      clientId,
      premiumValueInCents: premium,
      insurerId: insurer.id,
    })
    clientsWithPolicies.add(clientId)
    extraIndex++
  }

  const expiredCount = policies.length > 0 && extraSeeds.length > 0 ? 1 : 0
  console.log(
    `  ✓ Policies: ${policies.length} (${policies.length - expiredCount} active, ${expiredCount} expired)`
  )

  // =========================================================================
  // 7. Claims (different statuses and priorities)
  // =========================================================================

  const claimStatuses = [
    'REGISTERED',
    'IN_ANALYSIS',
    'AWAITING_DOCUMENT',
    'APPROVED',
    'PAID',
  ] as const

  const claimPriorities = ['NORMAL', 'HIGH', 'URGENT'] as const

  const claimsDescriptions = [
    'Colisão traseira no estacionamento do shopping',
    'Infiltração no teto do apartamento causando danos no piso',
    'Furto de equipamentos do escritório durante o final de semana',
    'Queda de árvore sobre o veículo durante tempestade',
    'Incêndio parcial na cozinha do restaurante',
  ]

  interface ClaimRecord {
    id: string
    policyId: string
  }

  const claims: ClaimRecord[] = []
  const activePolicies = policies.slice(0, Math.min(5, policies.length))

  for (let i = 0; i < activePolicies.length; i++) {
    const policy = activePolicies[i]!
    const status = claimStatuses[i % claimStatuses.length]!
    const priority = claimPriorities[i % claimPriorities.length]!

    const claim = await prisma.claim.create({
      data: {
        id: stableId('claim'),
        organizationId: org.id,
        claimNumber: 1000 + i + 1,
        policyId: policy.id,
        clientId: policy.clientId,
        insurerId: policy.insurerId,
        assignedToId: ownerId,
        status,
        priority,
        description: claimsDescriptions[i]!,
        estimatedValueInCents: (Math.floor(Math.random() * 100) + 10) * 10000,
        incidentDate: new Date(
          Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
        ),
        incidentLocation: 'São Paulo, SP',
        resolvedAt:
          status === 'PAID' || status === 'APPROVED' ? new Date() : null,
      },
    })
    claims.push({ id: claim.id, policyId: policy.id })

    // Add occurrences
    await prisma.occurrence.create({
      data: {
        id: stableId('occurrence'),
        claimId: claim.id,
        organizationId: org.id,
        type: 'NOTE',
        description: `Sinistro registrado — ${claimsDescriptions[i]}`,
        createdBy: ownerId,
      },
    })

    if (status !== 'REGISTERED') {
      await prisma.occurrence.create({
        data: {
          id: stableId('occurrence'),
          claimId: claim.id,
          organizationId: org.id,
          type: 'STATUS_CHANGE',
          description: `Status alterado para ${status}`,
          metadata: { from: 'REGISTERED', to: status },
          createdBy: ownerId,
        },
      })
    }
  }

  console.log(`  ✓ Claims: ${claims.length}`)

  // =========================================================================
  // 7b. Assistances (various statuses and types)
  // =========================================================================

  const assistanceStatuses = [
    'REQUESTED',
    'AWAITING_DOCUMENT',
    'PENDING_INSPECTION',
    'DISPATCHED',
    'IN_PROGRESS',
    'COMPLETED',
  ] as const

  const assistancesData = [
    {
      type: 'GUINCHO',
      status: assistanceStatuses[0]!, // REQUESTED
      description:
        'Veículo não liga após tentativa de partida — solicita guincho para oficina credenciada',
      address: 'Av. Paulista, 1578 - Bela Vista, São Paulo, SP',
      latitude: -23.5629,
      longitude: -46.6544,
      providerName: null,
      providerPhone: null,
      scheduledAt: null,
      completedAt: null,
      claimIndex: null,
    },
    {
      type: 'CHAVEIRO',
      status: assistanceStatuses[1]!, // AWAITING_DOCUMENT
      description:
        'Cliente trancou chaves dentro do veículo no estacionamento do shopping',
      address:
        'Shopping Ibirapuera - Av. Ibirapuera, 3103 - Moema, São Paulo, SP',
      latitude: -23.6095,
      longitude: -46.6692,
      providerName: 'Chaveiro Rápido 24h',
      providerPhone: '(11) 98765-0001',
      scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      completedAt: null,
      claimIndex: null,
    },
    {
      type: 'VIDRACEIRO',
      status: assistanceStatuses[2]!, // PENDING_INSPECTION
      description:
        'Vidro traseiro do veículo quebrado por tentativa de furto — aguardando vistoria',
      address: 'Rua Augusta, 2200 - Jardim Paulista, São Paulo, SP',
      latitude: -23.5567,
      longitude: -46.6626,
      providerName: 'Auto Vidros Express',
      providerPhone: '(11) 97654-0002',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      completedAt: null,
      claimIndex: 0, // link to first claim
    },
    {
      type: 'GUINCHO',
      status: assistanceStatuses[3]!, // DISPATCHED
      description:
        'Pneu furado em rodovia sem estepe — guincho despachado para local',
      address: 'Rod. Anchieta, km 42 - São Bernardo do Campo, SP',
      latitude: -23.7372,
      longitude: -46.5631,
      providerName: 'Guinchos Metrópole',
      providerPhone: '(11) 99876-0003',
      scheduledAt: new Date(Date.now() + 1 * 60 * 60 * 1000),
      completedAt: null,
      claimIndex: null,
    },
    {
      type: 'ELETRICISTA',
      status: assistanceStatuses[4]!, // IN_PROGRESS
      description:
        'Curto-circuito no painel elétrico da residência — eletricista em atendimento',
      address: 'Rua Oscar Freire, 890 - Pinheiros, São Paulo, SP',
      latitude: -23.5624,
      longitude: -46.6724,
      providerName: 'Elétrica Confiança',
      providerPhone: '(11) 96543-0004',
      scheduledAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      completedAt: null,
      claimIndex: null,
    },
    {
      type: 'ENCANADOR',
      status: assistanceStatuses[5]!, // COMPLETED
      description:
        'Vazamento de água no registro principal do apartamento — reparo concluído',
      address: 'Rua Haddock Lobo, 595 - Cerqueira César, São Paulo, SP',
      latitude: -23.5581,
      longitude: -46.6672,
      providerName: 'Hidráulica São Paulo',
      providerPhone: '(11) 95432-0005',
      scheduledAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 46 * 60 * 60 * 1000),
      claimIndex: 1, // link to second claim
    },
  ]

  let assistancesCount = 0
  for (let i = 0; i < assistancesData.length; i++) {
    const a = assistancesData[i]!
    const policy = activePolicies[i % activePolicies.length]!
    const claimId =
      a.claimIndex !== null ? (claims[a.claimIndex]?.id ?? null) : null

    await prisma.assistance.create({
      data: {
        id: stableId('assistance'),
        organizationId: org.id,
        policyId: policy.id,
        clientId: policy.clientId,
        claimId,
        type: a.type,
        status: a.status,
        description: a.description,
        address: a.address,
        latitude: a.latitude,
        longitude: a.longitude,
        providerName: a.providerName,
        providerPhone: a.providerPhone,
        requestedAt: new Date(
          Date.now() - (assistancesData.length - i) * 24 * 60 * 60 * 1000
        ),
        scheduledAt: a.scheduledAt,
        completedAt: a.completedAt,
      },
    })
    assistancesCount++
  }

  console.log(`  ✓ Assistances: ${assistancesCount}`)

  // =========================================================================
  // 8. Commissions (different statuses)
  // =========================================================================

  const commissionStatuses = [
    'PENDING_COMMERCIAL',
    'PENDING_ADMIN',
    'APPROVED',
    'PAID',
    'REJECTED',
  ] as const

  let commissionsCount = 0
  for (let i = 0; i < policies.length; i++) {
    const policy = policies[i]!
    const status = commissionStatuses[i % commissionStatuses.length]!
    const percentage = 1500 // 15% in basis points
    const commissionValue = Math.floor(
      (policy.premiumValueInCents * percentage) / 10000
    )

    await prisma.commission.create({
      data: {
        id: stableId('commission'),
        organizationId: org.id,
        policyId: policy.id,
        clientId: policy.clientId,
        salespersonId: commercialId,
        status,
        commissionValueInCents: commissionValue,
        premiumValueInCents: policy.premiumValueInCents,
        percentageInBasisPoints: percentage,
        splitPercentage: 5000, // 50%
        approvedBy: status === 'APPROVED' || status === 'PAID' ? ownerId : null,
        approvedAt:
          status === 'APPROVED' || status === 'PAID' ? new Date() : null,
        paidAt: status === 'PAID' ? new Date() : null,
        rejectedBy: status === 'REJECTED' ? ownerId : null,
        rejectedAt: status === 'REJECTED' ? new Date() : null,
        rejectionReason:
          status === 'REJECTED'
            ? 'Comissão duplicada — já paga em lote anterior'
            : null,
      },
    })
    commissionsCount++
  }

  console.log(`  ✓ Commissions: ${commissionsCount}`)

  // =========================================================================
  // 9. Notifications
  // =========================================================================

  const notificationTypes = [
    {
      type: 'CLAIM_OPENED',
      title: 'Novo sinistro registrado',
      body: 'O sinistro #1001 foi registrado para a apólice POL-2024001.',
      entityType: 'Claim',
    },
    {
      type: 'COMMISSION_APPROVED',
      title: 'Comissão aprovada',
      body: 'Sua comissão de R$ 450,00 foi aprovada pelo administrador.',
      entityType: 'Commission',
    },
    {
      type: 'POLICY_EXPIRING',
      title: 'Apólice próxima do vencimento',
      body: 'A apólice POL-2024101 vence em 30 dias. Inicie a renovação.',
      entityType: 'Policy',
    },
    {
      type: 'PROPOSAL_STAGNANT',
      title: 'Proposta parada há 7 dias',
      body: 'A proposta para Maria da Silva Santos está na fase QUOTE há 7 dias.',
      entityType: 'Proposal',
    },
    {
      type: 'COMMISSION_PENDING',
      title: 'Comissão aguardando aprovação',
      body: 'Há 3 comissões pendentes de aprovação administrativa.',
      entityType: 'Commission',
    },
  ]

  for (const notif of notificationTypes) {
    // Send to owner (unread)
    await prisma.notification.create({
      data: {
        id: stableId('notif'),
        organizationId: org.id,
        userId: ownerId,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        entityType: notif.entityType,
        read: false,
      },
    })

    // Send to commercial (some read)
    await prisma.notification.create({
      data: {
        id: stableId('notif'),
        organizationId: org.id,
        userId: commercialId,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        entityType: notif.entityType,
        read: notif.type === 'COMMISSION_APPROVED',
        readAt: notif.type === 'COMMISSION_APPROVED' ? new Date() : null,
      },
    })
  }

  console.log(`  ✓ Notifications: ${notificationTypes.length * 2}`)

  // =========================================================================
  // 10. Audit log entries
  // =========================================================================

  const auditActions = [
    { action: 'CLIENT_CREATED', entityType: 'Client' },
    { action: 'PROPOSAL_CREATED', entityType: 'Proposal' },
    { action: 'PROPOSAL_STAGE_CHANGED', entityType: 'Proposal' },
    { action: 'POLICY_CREATED', entityType: 'Policy' },
    { action: 'CLAIM_CREATED', entityType: 'Claim' },
    { action: 'COMMISSION_APPROVED', entityType: 'Commission' },
  ]

  for (const audit of auditActions) {
    await prisma.auditLog.create({
      data: {
        id: stableId('audit'),
        organizationId: org.id,
        userId: ownerId,
        action: audit.action,
        entityType: audit.entityType,
        ipAddress: '127.0.0.1',
        userAgent: 'seed-script',
      },
    })
  }

  console.log(`  ✓ Audit logs: ${auditActions.length}`)

  // =========================================================================
  // Summary
  // =========================================================================

  console.log('\n✅ Seed completed successfully!\n')
  console.log('  Login credentials (all users):')
  console.log(`    Password: ${PASSWORD}`)
  console.log('    Users:')
  for (const u of usersData) {
    console.log(`      ${u.email} (${u.role})`)
  }
  console.log(`\n  Organization: ${org.name} (slug: ${org.slug})`)
}

main()
  .catch((error: unknown) => {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
