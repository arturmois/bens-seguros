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
  // 4. Clients (PF + PJ, different types)
  // =========================================================================

  const clientsData = [
    // Individuals
    {
      name: 'Maria da Silva Santos',
      cpf: '52998224725',
      type: 'CLIENT' as const,
      personType: 'INDIVIDUAL' as const,
      email: 'maria.silva@email.com',
      phone: '(11) 98765-4321',
      birthDate: new Date('1985-03-15'),
      profession: 'Engenheira Civil',
      maritalStatus: 'MARRIED' as const,
      tags: ['premium', 'auto'],
    },
    {
      name: 'João Pedro Oliveira',
      cpf: '71443618060',
      type: 'CLIENT' as const,
      personType: 'INDIVIDUAL' as const,
      email: 'joao.oliveira@email.com',
      phone: '(11) 97654-3210',
      birthDate: new Date('1990-07-22'),
      profession: 'Advogado',
      maritalStatus: 'SINGLE' as const,
      tags: ['residencial'],
    },
    {
      name: 'Ana Carolina Ferreira',
      cpf: '36243218000',
      type: 'CLIENT' as const,
      personType: 'INDIVIDUAL' as const,
      email: 'ana.ferreira@email.com',
      phone: '(21) 99876-5432',
      birthDate: new Date('1978-11-08'),
      profession: 'Médica',
      maritalStatus: 'DIVORCED' as const,
      tags: ['vida', 'premium'],
    },
    {
      name: 'Pedro Henrique Costa',
      cpf: '82934017068',
      type: 'LEAD' as const,
      personType: 'INDIVIDUAL' as const,
      email: 'pedro.costa@email.com',
      phone: '(31) 98765-1234',
      birthDate: new Date('1995-01-30'),
      profession: 'Designer',
      maritalStatus: 'SINGLE' as const,
      tags: ['lead-quente'],
    },
    {
      name: 'Fernanda Lima Souza',
      cpf: '94587203004',
      type: 'LEAD' as const,
      personType: 'INDIVIDUAL' as const,
      email: 'fernanda.lima@email.com',
      phone: '(41) 99654-7890',
      birthDate: new Date('1988-06-12'),
      profession: 'Contadora',
      maritalStatus: 'MARRIED' as const,
      tags: [],
    },
    {
      name: 'Ricardo Almeida',
      cpf: '45678912300',
      type: 'FORMER_CLIENT' as const,
      personType: 'INDIVIDUAL' as const,
      email: 'ricardo.almeida@email.com',
      phone: '(51) 98321-6540',
      birthDate: new Date('1970-09-05'),
      profession: 'Empresário',
      maritalStatus: 'WIDOWED' as const,
      tags: ['cancelou'],
    },
    // Companies
    {
      name: 'Tech Solutions Ltda',
      cpf: '12345678000195',
      type: 'CLIENT' as const,
      personType: 'COMPANY' as const,
      email: 'contato@techsolutions.com.br',
      phone: '(11) 3456-7890',
      birthDate: null,
      profession: null,
      maritalStatus: null,
      tags: ['empresarial', 'premium'],
    },
    {
      name: 'Restaurante Sabor & Cia',
      cpf: '98765432000198',
      type: 'CLIENT' as const,
      personType: 'COMPANY' as const,
      email: 'contato@saborecia.com.br',
      phone: '(11) 2345-6789',
      birthDate: null,
      profession: null,
      maritalStatus: null,
      tags: ['empresarial'],
    },
    {
      name: 'Condomínio Residencial Aurora',
      cpf: '11222333000144',
      type: 'CLIENT' as const,
      personType: 'COMPANY' as const,
      email: 'sindico@condaurora.com.br',
      phone: '(11) 3333-4444',
      birthDate: null,
      profession: null,
      maritalStatus: null,
      tags: ['condomínio'],
    },
    {
      name: 'Startup Inovação S.A.',
      cpf: '55667788000199',
      type: 'LEAD' as const,
      personType: 'COMPANY' as const,
      email: 'cfo@startupinovacao.com',
      phone: '(11) 4567-8901',
      birthDate: null,
      profession: null,
      maritalStatus: null,
      tags: ['lead-quente', 'empresarial'],
    },
  ]

  const clients: Array<{ id: string; name: string; type: string }> = []
  for (const c of clientsData) {
    const client = await prisma.client.create({
      data: {
        id: stableId('client'),
        organizationId: org.id,
        name: c.name,
        document: maskDocument(c.cpf),
        documentEncrypted: JSON.stringify(encrypt(c.cpf)),
        documentHash: hashDocument(c.cpf),
        type: c.type,
        personType: c.personType,
        email: c.email,
        phone: c.phone,
        birthDate: c.birthDate,
        profession: c.profession,
        maritalStatus: c.maritalStatus,
        tags: c.tags,
        consentLgpd: c.type === 'CLIENT',
        salespersonId: c.type === 'CLIENT' ? commercialId : null,
        address:
          c.personType === 'INDIVIDUAL'
            ? {
                street: 'Rua Exemplo',
                number: String(Math.floor(Math.random() * 999) + 1),
                complement: '',
                neighborhood: 'Centro',
                city: 'São Paulo',
                state: 'SP',
                zipCode: '01001-000',
              }
            : {
                street: 'Av. Paulista',
                number: String(Math.floor(Math.random() * 2000) + 1),
                complement: `Sala ${Math.floor(Math.random() * 50) + 1}`,
                neighborhood: 'Bela Vista',
                city: 'São Paulo',
                state: 'SP',
                zipCode: '01310-100',
              },
      },
    })
    clients.push({ id: client.id, name: client.name, type: c.type })
  }

  console.log(
    `  ✓ Clients: ${clients.length} (${clientsData.filter((c) => c.type === 'CLIENT').length} clients, ${clientsData.filter((c) => c.type === 'LEAD').length} leads, ${clientsData.filter((c) => c.type === 'FORMER_CLIENT').length} former)`
  )

  // =========================================================================
  // 5. Proposals (various stages and board types)
  // =========================================================================

  const activeClients = clients.filter((c) => c.type === 'CLIENT')
  const leadClients = clients.filter((c) => c.type === 'LEAD')

  const proposalStages = [
    'CAPTURE',
    'QUOTE',
    'PROTOCOL',
    'INSPECTION',
    'PAYMENT',
    'POLICY_ISSUED',
    'LOST',
  ] as const

  const branches = [
    'AUTO',
    'RESIDENTIAL',
    'CONDOMINIUM',
    'BUSINESS',
    'LIFE',
    'OTHER',
  ] as const

  interface ProposalRecord {
    id: string
    clientId: string
    stage: string
    branch: string
    premiumValueInCents: number
  }

  const proposals: ProposalRecord[] = []

  // Create proposals for active clients — spread across stages
  for (let i = 0; i < activeClients.length; i++) {
    const client = activeClients[i]!
    const stage = proposalStages[i % proposalStages.length]!
    const branch = branches[i % branches.length]!
    const insurer = insurers[i % insurers.length]!
    const premium = (Math.floor(Math.random() * 50) + 10) * 10000 // R$100-R$5000

    const proposal = await prisma.proposal.create({
      data: {
        id: stableId('proposal'),
        organizationId: org.id,
        clientId: client.id,
        salespersonId: commercialId,
        stage,
        boardType: 'NEW_INSURANCE',
        branch,
        premiumValueInCents: premium,
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
          notes: `Proposta de ${branch.toLowerCase()} para ${client.name}`,
        },
      },
    })
    proposals.push({
      id: proposal.id,
      clientId: client.id,
      stage,
      branch,
      premiumValueInCents: premium,
    })
  }

  // Extra proposals for leads (all CAPTURE)
  for (const client of leadClients) {
    const branch = branches[Math.floor(Math.random() * branches.length)]!
    const premium = (Math.floor(Math.random() * 30) + 5) * 10000

    const proposal = await prisma.proposal.create({
      data: {
        id: stableId('proposal'),
        organizationId: org.id,
        clientId: client.id,
        salespersonId: commercialId,
        stage: 'CAPTURE',
        boardType: 'NEW_INSURANCE',
        branch,
        premiumValueInCents: premium,
        commissionPercentageInCents: 1200,
        details: {
          notes: `Lead - primeiro contato com ${client.name}`,
        },
      },
    })
    proposals.push({
      id: proposal.id,
      clientId: client.id,
      stage: 'CAPTURE',
      branch,
      premiumValueInCents: premium,
    })
  }

  // A few renewal proposals
  const renewalClients = activeClients.slice(0, 2)
  for (const client of renewalClients) {
    const branch = branches[Math.floor(Math.random() * branches.length)]!
    const premium = (Math.floor(Math.random() * 40) + 15) * 10000

    const proposal = await prisma.proposal.create({
      data: {
        id: stableId('proposal'),
        organizationId: org.id,
        clientId: client.id,
        salespersonId: commercialId,
        stage: 'QUOTE',
        boardType: 'RENEWAL',
        branch,
        premiumValueInCents: premium,
        commissionPercentageInCents: 1500,
        renewalPolicyNumber: `POL-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        insurerId: insurers[0]!.id,
        details: { notes: `Renovação para ${client.name}` },
      },
    })
    proposals.push({
      id: proposal.id,
      clientId: client.id,
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

  // Policies from issued proposals
  for (let i = 0; i < issuedProposals.length; i++) {
    const prop = issuedProposals[i]!
    const insurer = insurers[i % insurers.length]!
    const policyNumber = `POL-${String(2024000 + i + 1)}`

    const policy = await prisma.policy.create({
      data: {
        id: stableId('policy'),
        organizationId: org.id,
        proposalId: prop.id,
        clientId: prop.clientId,
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
      clientId: prop.clientId,
      premiumValueInCents: prop.premiumValueInCents,
      insurerId: insurer.id,
    })
  }

  // Extra policies for clients that don't have one yet (standalone)
  const clientsWithPolicies = new Set(policies.map((p) => p.clientId))
  const clientsWithoutPolicies = activeClients.filter(
    (c) => !clientsWithPolicies.has(c.id)
  )

  for (let i = 0; i < clientsWithoutPolicies.length; i++) {
    const client = clientsWithoutPolicies[i]!
    const insurer = insurers[(i + 2) % insurers.length]!
    const branch = branches[(i + 1) % branches.length]!
    const premium = (Math.floor(Math.random() * 40) + 10) * 10000
    const policyNumber = `POL-${String(2024100 + i + 1)}`

    // Need a POLICY_ISSUED proposal for the 1:1 relation
    const extraProposal = await prisma.proposal.create({
      data: {
        id: stableId('proposal'),
        organizationId: org.id,
        clientId: client.id,
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
        clientId: client.id,
        salespersonId: commercialId,
        insurerId: insurer.id,
        policyNumber,
        status: i === 0 ? 'EXPIRED' : 'ACTIVE',
        branch,
        premiumValueInCents: premium,
        startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        endDate:
          i === 0
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
      clientId: client.id,
      premiumValueInCents: premium,
      insurerId: insurer.id,
    })
  }

  console.log(
    `  ✓ Policies: ${policies.length} (${policies.length - (clientsWithoutPolicies.length > 0 && clientsWithoutPolicies[0] ? 1 : 0)} active, 1 expired)`
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
