import { PrismaPg } from '@prisma/adapter-pg'
import {
  createCipheriv,
  createHmac,
  randomBytes,
  scryptSync,
} from 'node:crypto'
import { PrismaClient } from '../generated/client/client.js'

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

let idCounter = 0
function stableId(prefix: string): string {
  idCounter++
  return `seed_${prefix}_${String(idCounter).padStart(3, '0')}`
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL })
const prisma = new PrismaClient({ adapter })

// Plan catalog seed — independent from the example org and idempotent via
// upsert(slug). Always runs so freshly cloned dev DBs and the test suite have
// the four tiers available, even when the example org already exists.
//
// Numbers tagged TBD-CALIBRATE are placeholders pending real baseline data
// from the AI metering Pre-0 collection (~60-90d into prod). Update via
// super-admin endpoint in Fase 4+ once we have signal.
async function seedPlans() {
  const plans = [
    {
      slug: 'free',
      name: 'Free',
      description: 'Para experimentar a plataforma sem custo.',
      priceCents: 0,
      maxUsers: 1,
      maxProposalsPerMonth: 10,
      maxChannels: 1,
      maxConversationsPerOrg: 10,
      maxImportRows: 50,
      maxLogoSizeBytes: 256 * 1024,
      aiEnabled: false,
      aiMessagesIncluded: 0,
      aiOverageCentsPerMessage: 0,
      features: { customBranding: false, advancedReports: false },
      isPublic: true,
      sortOrder: 0,
    },
    {
      slug: 'starter',
      name: 'Starter',
      description: 'Pra corretoras pequenas, comecando a digitalizar.',
      priceCents: 29900, // TBD-CALIBRATE
      maxUsers: 3,
      maxProposalsPerMonth: 100,
      maxChannels: 3,
      maxConversationsPerOrg: 100,
      maxImportRows: 500,
      maxLogoSizeBytes: 512 * 1024,
      aiEnabled: true,
      aiMessagesIncluded: 200, // TBD-CALIBRATE: baseline AI metering Pre-0
      aiOverageCentsPerMessage: 30, // TBD-CALIBRATE
      features: { customBranding: false, advancedReports: false },
      isPublic: true,
      sortOrder: 1,
    },
    {
      slug: 'pro',
      name: 'Pro',
      description: 'Pra corretoras em crescimento, com automacao AI.',
      priceCents: 69900, // TBD-CALIBRATE
      maxUsers: 10,
      maxProposalsPerMonth: 500,
      maxChannels: 10,
      maxConversationsPerOrg: 500,
      maxImportRows: 2000,
      maxLogoSizeBytes: 1024 * 1024,
      aiEnabled: true,
      aiMessagesIncluded: 1000, // TBD-CALIBRATE
      aiOverageCentsPerMessage: 20, // TBD-CALIBRATE
      features: { customBranding: true, advancedReports: true },
      isPublic: true,
      sortOrder: 2,
    },
    {
      slug: 'business',
      name: 'Business',
      description: 'Pra operacoes grandes, com volume ilimitado e suporte.',
      priceCents: 149900, // TBD-CALIBRATE
      maxUsers: null,
      maxProposalsPerMonth: null,
      maxChannels: null,
      maxConversationsPerOrg: null,
      maxImportRows: null,
      maxLogoSizeBytes: 5 * 1024 * 1024,
      aiEnabled: true,
      aiMessagesIncluded: 5000, // TBD-CALIBRATE
      aiOverageCentsPerMessage: 15, // TBD-CALIBRATE
      features: {
        customBranding: true,
        advancedReports: true,
        apiAccess: true,
        prioritySupport: true,
      },
      isPublic: true,
      sortOrder: 3,
    },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {}, // by design — never overwrite live tier numbers via re-seed
      create: plan,
    })
  }
  console.warn(
    `💎 Seeded ${String(plans.length)} billing plans (upserted by slug)`
  )
}

async function main() {
  console.warn('🌱 Seeding database...\n')
  await seedPlans()
  const existingOrg = await prisma.organization.findUnique({
    where: { slug: 'corretora-exemplo' },
  })
  if (existingOrg) {
    console.warn(
      '⏭️  Seed data already exists (org "corretora-exemplo"). Skipping.\n' +
        '   To re-seed, delete the organization first or reset the database.'
    )
    return
  }
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
  console.warn(`  ✓ Organization: ${org.name} (${org.id})`)
  const proPlan = await prisma.plan.findUniqueOrThrow({
    where: { slug: 'pro' },
  })
  await prisma.subscription.create({
    data: {
      organizationId: org.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    },
  })
  console.warn(`  ✓ Subscription: ${proPlan.name} (ACTIVE, 30d period)`)
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
  await prisma.session.create({
    data: {
      id: stableId('session'),
      token: `seed-session-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
      userId: ownerId,
      activeOrganizationId: org.id,
    },
  })
  console.warn(
    `  ✓ Users: ${usersData.length} (all with password "${PASSWORD}")`
  )
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
  console.warn(`  ✓ Insurers: ${insurers.length}`)
  interface ClientSeed {
    key: string
    legalName: string
    cpf: string
    personType: 'INDIVIDUAL' | 'COMPANY'
    profession?: string
    maritalStatus?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER'
    fiscalBirthDate?: Date
    address?: {
      cep: string
      street: string
      number: string | null
      complement: string | null
      neighborhood: string
      city: string
      state: string
    }
  }
  const clientsData: ClientSeed[] = [
    {
      key: 'client-1',
      legalName: 'Maria da Silva Santos',
      cpf: '52998224725',
      personType: 'INDIVIDUAL',
      profession: 'Engenheira Civil',
      maritalStatus: 'MARRIED',
      fiscalBirthDate: new Date('1985-03-15'),
      address: {
        cep: '01310100',
        street: 'Rua das Flores',
        number: '123',
        complement: null,
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
    },
    {
      key: 'client-2',
      legalName: 'João Carlos Oliveira',
      cpf: '11144477735',
      personType: 'INDIVIDUAL',
      profession: 'Médico',
      fiscalBirthDate: new Date('1978-09-22'),
      address: {
        cep: '04538133',
        street: 'Rua Funchal',
        number: '500',
        complement: 'Sala 1201',
        neighborhood: 'Vila Olímpia',
        city: 'São Paulo',
        state: 'SP',
      },
    },
    {
      key: 'client-3',
      legalName: 'Pedro Henrique Costa',
      cpf: '98765432100',
      personType: 'INDIVIDUAL',
      fiscalBirthDate: new Date('1990-12-01'),
      address: {
        cep: '20021040',
        street: 'Av. Rio Branco',
        number: '156',
        complement: null,
        neighborhood: 'Centro',
        city: 'Rio de Janeiro',
        state: 'RJ',
      },
    },
    {
      key: 'client-4',
      legalName: 'Tech Solutions Ltda',
      cpf: '12345678000195',
      personType: 'COMPANY',
      address: {
        cep: '01310100',
        street: 'Av. Paulista',
        number: '1000',
        complement: '15º andar',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
      },
    },
    {
      key: 'client-5',
      legalName: 'Construtora ABC LTDA',
      cpf: '98765432000180',
      personType: 'COMPANY',
      address: {
        cep: '04543011',
        street: 'Av. Brigadeiro Faria Lima',
        number: '3477',
        complement: 'Torre B',
        neighborhood: 'Itaim Bibi',
        city: 'São Paulo',
        state: 'SP',
      },
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
  console.warn(
    `  ✓ Clients: ${clientsData.length} (${clientsData.filter((c) => c.personType === 'INDIVIDUAL').length} PF, ${clientsData.filter((c) => c.personType === 'COMPANY').length} PJ)`
  )
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
  console.warn(
    `  ✓ Contacts: ${contactsData.length} (${contactsWithoutClient.length} leads frios, ${contactsWithClient.length} vinculados a Clients)`
  )
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
  const proposalsSeed: ProposalSeed[] = [
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
  console.warn(`  ✓ Proposals: ${proposals.length}`)
  interface PolicyRecord {
    id: string
    clientId: string
    premiumValueInCents: number
    insurerId: string
  }
  const policies: PolicyRecord[] = []
  const issuedProposals = proposals.filter((p) => p.stage === 'POLICY_ISSUED')
  async function resolveProposalClientId(
    proposalId: string
  ): Promise<string | null> {
    const result = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { contact: true },
    })
    return result?.contact?.clientId ?? null
  }
  for (let i = 0; i < issuedProposals.length; i++) {
    const prop = issuedProposals[i]!
    const clientId = await resolveProposalClientId(prop.id)
    if (!clientId) continue
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
  console.warn(
    `  ✓ Policies: ${policies.length} (${policies.length - expiredCount} active, ${expiredCount} expired)`
  )
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
  console.warn(`  ✓ Claims: ${claims.length}`)
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
  console.warn(`  ✓ Assistances: ${assistancesCount}`)
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
    const percentage = 1500
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
  console.warn(`  ✓ Commissions: ${commissionsCount}`)
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
  console.warn(`  ✓ Notifications: ${notificationTypes.length * 2}`)
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
  console.warn(`  ✓ Audit logs: ${auditActions.length}`)

  // Goals — current year sample (12 months × 2 boardTypes)
  const currentYear = new Date().getFullYear()
  const goalsToSeed: Array<{
    month: number
    boardType: 'NEW_INSURANCE' | 'RENEWAL'
    targetPremiumCents: number
  }> = []
  for (let m = 1; m <= 12; m++) {
    goalsToSeed.push({
      month: m,
      boardType: 'NEW_INSURANCE',
      targetPremiumCents: 50_000_00,
    })
    goalsToSeed.push({
      month: m,
      boardType: 'RENEWAL',
      targetPremiumCents: 80_000_00,
    })
  }
  await Promise.all(
    goalsToSeed.map((g) =>
      prisma.goal.upsert({
        where: {
          organizationId_year_month_boardType: {
            organizationId: org.id,
            year: currentYear,
            month: g.month,
            boardType: g.boardType,
          },
        },
        create: {
          organizationId: org.id,
          year: currentYear,
          month: g.month,
          boardType: g.boardType,
          targetPremiumCents: g.targetPremiumCents,
        },
        update: {},
      })
    )
  )
  console.warn(`  ✓ Goals: ${goalsToSeed.length} (year ${currentYear})`)

  console.warn('\n✅ Seed completed successfully!\n')
  console.warn('  Login credentials (all users):')
  console.warn(`    Password: ${PASSWORD}`)
  console.warn('    Users:')
  for (const u of usersData) {
    console.warn(`      ${u.email} (${u.role})`)
  }
  console.warn(`\n  Organization: ${org.name} (slug: ${org.slug})`)
}

main()
  .catch((error: unknown) => {
    console.error('❌ Seed failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
