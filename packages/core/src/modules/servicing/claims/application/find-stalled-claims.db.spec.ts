import { randomUUID } from 'node:crypto'
import { prismaAdmin } from '@repo/db'
import { describe, expect, it } from 'vitest'
import { PrismaClientRepository } from '../../../client/infrastructure/prisma-client-repository.js'
import { PrismaClaimRepository } from '../infrastructure/prisma-claim-repository.js'
import { FindStalledClaims } from './find-stalled-claims.js'

describe('FindStalledClaims live db', () => {
  it('stalled statuses older than 7 days', async () => {
    const suffix = randomUUID()
    const now = new Date('2026-09-20T12:00:00.000Z')
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 7)
    const org = await prismaAdmin.organization.create({
      data: { name: `org-stall-${suffix}`, slug: `org-stall-${suffix}` },
    })
    const user = await prismaAdmin.user.create({
      data: { email: `stall-${suffix}@example.com`, name: 'Sales' },
    })
    const client = await new PrismaClientRepository(prismaAdmin).save({
      organizationId: org.id,
      legalName: 'Cliente Claim',
      document: '111.444.777-35',
      personType: 'INDIVIDUAL',
      profession: null,
      maritalStatus: null,
      address: null,
      fiscalBirthDate: null,
    })
    const contact = await prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: 'Contato Claim',
        phone: '11966660001',
        source: 'MANUAL',
        salespersonId: user.id,
        clientId: client.id,
        consentLgpd: true,
      },
    })
    const proposal = await prismaAdmin.proposal.create({
      data: {
        organizationId: org.id,
        contactId: contact.id,
        salespersonId: user.id,
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      },
    })
    const policy = await prismaAdmin.policy.create({
      data: {
        organizationId: org.id,
        proposalId: proposal.id,
        clientId: client.id,
        salespersonId: user.id,
        policyNumber: `CLM-${suffix.slice(0, 8)}`,
        status: 'ACTIVE',
        branch: 'AUTO',
        premiumValueInCents: 1000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-01-01'),
      },
    })
    async function seedClaim(input: {
      claimNumber: number
      status:
        | 'REGISTERED'
        | 'IN_ANALYSIS'
        | 'AWAITING_DOCUMENT'
        | 'PENDING_INSPECTION'
        | 'COMPLETED'
      updatedAt: Date
      deletedAt?: Date
    }): Promise<string> {
      const claim = await prismaAdmin.claim.create({
        data: {
          organizationId: org.id,
          claimNumber: input.claimNumber,
          policyId: policy.id,
          clientId: client.id,
          status: input.status,
          description: 'Test claim',
          updatedAt: input.updatedAt,
          deletedAt: input.deletedAt ?? null,
        },
      })
      return claim.id
    }
    const stalled = await seedClaim({
      claimNumber: 1,
      status: 'REGISTERED',
      updatedAt: new Date(cutoff.getTime() - 60_000),
    })
    const analysis = await seedClaim({
      claimNumber: 2,
      status: 'IN_ANALYSIS',
      updatedAt: new Date(cutoff.getTime() - 60_000),
    })
    const awaiting = await seedClaim({
      claimNumber: 3,
      status: 'AWAITING_DOCUMENT',
      updatedAt: new Date(cutoff.getTime() - 60_000),
    })
    const inspection = await seedClaim({
      claimNumber: 4,
      status: 'PENDING_INSPECTION',
      updatedAt: new Date(cutoff.getTime() - 60_000),
    })
    const fresh = await seedClaim({
      claimNumber: 5,
      status: 'REGISTERED',
      updatedAt: new Date(cutoff.getTime() + 60_000),
    })
    const completed = await seedClaim({
      claimNumber: 6,
      status: 'COMPLETED',
      updatedAt: new Date(cutoff.getTime() - 60_000),
    })
    const deleted = await seedClaim({
      claimNumber: 7,
      status: 'REGISTERED',
      updatedAt: new Date(cutoff.getTime() - 60_000),
      deletedAt: now,
    })
    try {
      const result = await new FindStalledClaims(
        new PrismaClaimRepository(prismaAdmin)
      ).execute({ organizationId: org.id, now, days: 7 })
      const ids = result.map((item) => item.id)
      expect(ids).toContain(stalled)
      expect(ids).toContain(analysis)
      expect(ids).toContain(awaiting)
      expect(ids).toContain(inspection)
      expect(ids).not.toContain(fresh)
      expect(ids).not.toContain(completed)
      expect(ids).not.toContain(deleted)
    } finally {
      await prismaAdmin.claim.deleteMany({
        where: { organizationId: org.id },
      })
      await prismaAdmin.policy.deleteMany({
        where: { organizationId: org.id },
      })
      await prismaAdmin.proposal.deleteMany({
        where: { organizationId: org.id },
      })
      await prismaAdmin.contact.deleteMany({
        where: { organizationId: org.id },
      })
      await prismaAdmin.client.deleteMany({
        where: { organizationId: org.id },
      })
      await prismaAdmin.organization.delete({ where: { id: org.id } })
      await prismaAdmin.user.delete({ where: { id: user.id } })
    }
  })
})
