import { TEST_ORG_ID, TEST_USER_ID } from './create-test-app.js'

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export function makeUserTermsStatus(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    email: 'test@user.com',
    name: 'Test User',
    emailVerified: true,
    image: null as string | null,
    isSuperAdmin: false,
    acceptedTermsAt: null as Date | null,
    termsVersion: null as string | null,
    privacyVersion: null as string | null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

export function makeMinimalUser(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_USER_ID,
    email: 'test@user.com',
    name: 'Test User',
    emailVerified: true,
    image: null as string | null,
    isSuperAdmin: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export function makeOrganization(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_ORG_ID,
    name: 'Corretora Exemplo',
    slug: 'corretora-exemplo',
    logo: null as string | null,
    active: true,
    metadata: null as unknown,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

export function makeUpdatedOrganization(
  overrides: Record<string, unknown> = {}
) {
  return makeOrganization({
    logo: `organizations/${TEST_ORG_ID}/logo.png` as string | null,
    ...overrides,
  })
}

// ---------------------------------------------------------------------------
// Member
// ---------------------------------------------------------------------------

export function makeMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-id-001',
    userId: TEST_USER_ID,
    organizationId: TEST_ORG_ID,
    role: 'OWNER',
    active: true,
    commissionSplitPercentage: 0 as number | null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    user: { name: 'Test User', email: 'test@user.com' },
    ...overrides,
  }
}

export function makeMinimalMember(overrides: Record<string, unknown> = {}) {
  return {
    id: 'member-id-001',
    userId: 'other-user-id',
    organizationId: TEST_ORG_ID,
    role: 'ADMIN',
    active: true,
    commissionSplitPercentage: 0 as number | null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

export function makeTenantMember(overrides: Record<string, unknown> = {}) {
  return {
    role: 'OWNER',
    organization: {
      id: TEST_ORG_ID,
      name: 'Corretora Exemplo',
      slug: 'corretora-exemplo',
      logo: null as string | null,
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Invitation
// ---------------------------------------------------------------------------

export function makeInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invite-id-001',
    organizationId: TEST_ORG_ID,
    email: 'invited@user.com',
    role: 'COMMERCIAL',
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    inviterId: 'user-id-001',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

export function makePublicInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invite-id-001',
    organizationId: TEST_ORG_ID,
    email: 'invited@user.com',
    role: 'COMMERCIAL',
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    inviterId: 'inviter-user-id',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    organization: { name: 'Corretora Exemplo' },
    ...overrides,
  }
}

export function makeCreatedInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invite-id-001',
    organizationId: TEST_ORG_ID,
    email: 'newmember@user.com',
    role: 'COMMERCIAL',
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    inviterId: TEST_USER_ID,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Commission
// ---------------------------------------------------------------------------

export function makeCommission(overrides: Record<string, unknown> = {}) {
  return {
    id: 'commission-id-001',
    organizationId: TEST_ORG_ID,
    policyId: 'policy-id-001',
    salespersonId: 'user-id-001',
    status: 'APPROVED',
    commissionValueInCents: 150000,
    premiumValueInCents: 1000000,
    percentageInBasisPoints: 1500,
    splitPercentage: null as number | null,
    approvedBy: TEST_USER_ID as string | null,
    approvedAt: new Date() as Date | null,
    paidAt: null as Date | null,
    rejectedBy: null as string | null,
    rejectedAt: null as Date | null,
    rejectionReason: null as string | null,
    isReversal: false,
    originalCommissionId: null as string | null,
    deletedAt: null as Date | null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export function makeMinimalClient(overrides: Record<string, unknown> = {}) {
  return {
    id: 'client-id-001',
    organizationId: TEST_ORG_ID,
    name: 'João Silva',
    document: '***.***.789-01',
    documentEncrypted: '',
    documentHash: '',
    type: 'CLIENT',
    personType: 'INDIVIDUAL',
    email: 'joao@example.com' as string | null,
    phone: null as string | null,
    birthDate: null as Date | null,
    profession: null as string | null,
    maritalStatus: null as string | null,
    address: null as unknown,
    tags: [] as string[],
    socialMedia: null as unknown,
    consentLgpd: false,
    salespersonId: null as string | null,
    deletedAt: null as Date | null,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export function makeAuditLog(overrides: Record<string, unknown> = {}) {
  return {
    id: 'audit-id-001',
    organizationId: TEST_ORG_ID,
    userId: 'user-id-001' as string | null,
    action: 'CREATE',
    entityType: 'Client',
    entityId: 'client-id-001' as string | null,
    before: null as unknown,
    after: null as unknown,
    ipAddress: '127.0.0.1' as string | null,
    userAgent: 'test-agent' as string | null,
    createdAt: new Date(),
    ...overrides,
  }
}
