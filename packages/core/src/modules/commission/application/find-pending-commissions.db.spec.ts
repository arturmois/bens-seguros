import { randomUUID } from 'node:crypto'
import { prismaAdmin } from '@repo/db'
import { describe, expect, it } from 'vitest'
import { PrismaClientRepository } from '../../client/infrastructure/prisma-client-repository.js'
import { PrismaCommissionRepository } from '../infrastructure/prisma-commission-repository.js'
import { FindPendingCommissions } from './find-pending-commissions.js'

describe('FindPendingCommissions live db', () => {
  it('pending commercial older than 7 days', async () => {
    const suffix = randomUUID()
    const now = new Date('2026-09-20T12:00:00.000Z')
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 7)
    const org = await prismaAdmin.organization.create({
      data: { name: `org-pcom-${suffix}`, slug: `org-pcom-${suffix}` },
    })
    const user = await prismaAdmin.user.create({
      data: { email: `pcom-${suffix}@example.com`, name: 'Sales' },
    })
    const client = await new PrismaClientRepository(prismaAdmin).save({
      organizationId: org.id,
      legalName: 'Cliente Com',
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
        name: 'Contato Com',
        phone: '11977770001',
        source: 'MANUAL',
        salespersonId: user.id,
        clientId: client.id,
        consentLgpd: true,
      },
    })
    async function seedCommission(input: {
      policyNumber: string
      status: 'PENDING_COMMERCIAL' | 'PAID'
      createdAt: Date
      deletedAt?: Date
    }): Promise<string> {
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
          policyNumber: input.policyNumber,
          status: 'ACTIVE',
          branch: 'AUTO',
          premiumValueInCents: 1000,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2026-01-01'),
        },
      })
      const commission = await prismaAdmin.commission.create({
        data: {
          organizationId: org.id,
          policyId: policy.id,
          salespersonId: user.id,
          status: input.status,
          commissionValueInCents: 100,
          premiumValueInCents: 1000,
          percentageInBasisPoints: 1000,
          createdAt: input.createdAt,
          deletedAt: input.deletedAt ?? null,
        },
      })
      return commission.id
    }
    const oldPending = await seedCommission({
      policyNumber: `OLD-${suffix.slice(0, 8)}`,
      status: 'PENDING_COMMERCIAL',
      createdAt: new Date(cutoff.getTime() - 60_000),
    })
    const freshPending = await seedCommission({
      policyNumber: `NEW-${suffix.slice(0, 8)}`,
      status: 'PENDING_COMMERCIAL',
      createdAt: new Date(cutoff.getTime() + 60_000),
    })
    const paidOld = await seedCommission({
      policyNumber: `PAY-${suffix.slice(0, 8)}`,
      status: 'PAID',
      createdAt: new Date(cutoff.getTime() - 60_000),
    })
    const deletedOld = await seedCommission({
      policyNumber: `DEL-${suffix.slice(0, 8)}`,
      status: 'PENDING_COMMERCIAL',
      createdAt: new Date(cutoff.getTime() - 60_000),
      deletedAt: now,
    })
    try {
      const result = await new FindPendingCommissions(
        new PrismaCommissionRepository(prismaAdmin)
      ).execute({ organizationId: org.id, now, days: 7 })
      const ids = result.map((item) => item.id)
      expect(ids).toContain(oldPending)
      expect(ids).not.toContain(freshPending)
      expect(ids).not.toContain(paidOld)
      expect(ids).not.toContain(deletedOld)
    } finally {
      await prismaAdmin.commission.deleteMany({
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
