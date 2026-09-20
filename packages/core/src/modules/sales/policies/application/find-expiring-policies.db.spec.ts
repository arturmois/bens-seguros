import { randomUUID } from 'node:crypto'
import { prismaAdmin } from '@repo/db'
import { describe, expect, it } from 'vitest'
import { PrismaClientRepository } from '../../../client/infrastructure/prisma-client-repository.js'
import { PrismaPolicyRepository } from '../infrastructure/prisma-policy-repository.js'
import { FindExpiringPolicies } from './find-expiring-policies.js'

async function seedPolicy(input: {
  organizationId: string
  userId: string
  clientId: string
  policyNumber: string
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  endDate: Date
}): Promise<string> {
  const contact = await prismaAdmin.contact.create({
    data: {
      organizationId: input.organizationId,
      name: `Contato ${input.policyNumber}`,
      phone: `119${input.policyNumber.replace(/[^0-9a-f]/gi, '').slice(-8)}`,
      source: 'MANUAL',
      salespersonId: input.userId,
      clientId: input.clientId,
      consentLgpd: true,
    },
  })
  const proposal = await prismaAdmin.proposal.create({
    data: {
      organizationId: input.organizationId,
      contactId: contact.id,
      salespersonId: input.userId,
      branch: 'AUTO',
      boardType: 'NEW_INSURANCE',
    },
  })
  const policy = await prismaAdmin.policy.create({
    data: {
      organizationId: input.organizationId,
      proposalId: proposal.id,
      clientId: input.clientId,
      salespersonId: input.userId,
      policyNumber: input.policyNumber,
      status: input.status,
      branch: 'AUTO',
      premiumValueInCents: 1000,
      startDate: new Date('2025-01-01T00:00:00.000Z'),
      endDate: input.endDate,
    },
  })
  return policy.id
}

function windowFor(now: Date, days: number): { start: Date; end: Date } {
  const targetDate = new Date(now)
  targetDate.setDate(targetDate.getDate() + days)
  const start = new Date(targetDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(targetDate)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

describe('FindExpiringPolicies live db', () => {
  it('expiring windows 30 15 7 calendar days', async () => {
    const suffix = randomUUID()
    const now = new Date('2026-09-20T15:00:00.000Z')
    const org = await prismaAdmin.organization.create({
      data: { name: `org-expw-${suffix}`, slug: `org-expw-${suffix}` },
    })
    const user = await prismaAdmin.user.create({
      data: { email: `expw-${suffix}@example.com`, name: 'Sales' },
    })
    const client = await new PrismaClientRepository(prismaAdmin).save({
      organizationId: org.id,
      legalName: 'Cliente Exp',
      document: '111.444.777-35',
      personType: 'INDIVIDUAL',
      profession: null,
      maritalStatus: null,
      address: null,
      fiscalBirthDate: null,
    })
    const day30 = windowFor(now, 30)
    const day15 = windowFor(now, 15)
    const day7 = windowFor(now, 7)
    const id30 = await seedPolicy({
      organizationId: org.id,
      userId: user.id,
      clientId: client.id,
      policyNumber: `E30-${suffix.slice(0, 8)}`,
      status: 'ACTIVE',
      endDate: new Date(day30.start.getTime() + 12 * 60 * 60 * 1000),
    })
    const id15 = await seedPolicy({
      organizationId: org.id,
      userId: user.id,
      clientId: client.id,
      policyNumber: `E15-${suffix.slice(0, 8)}`,
      status: 'ACTIVE',
      endDate: new Date(day15.start.getTime() + 12 * 60 * 60 * 1000),
    })
    const id7 = await seedPolicy({
      organizationId: org.id,
      userId: user.id,
      clientId: client.id,
      policyNumber: `E07-${suffix.slice(0, 8)}`,
      status: 'ACTIVE',
      endDate: new Date(day7.start.getTime() + 12 * 60 * 60 * 1000),
    })
    const cancelled = await seedPolicy({
      organizationId: org.id,
      userId: user.id,
      clientId: client.id,
      policyNumber: `CAN-${suffix.slice(0, 8)}`,
      status: 'CANCELLED',
      endDate: new Date(day7.start.getTime() + 12 * 60 * 60 * 1000),
    })
    const deletedId = await seedPolicy({
      organizationId: org.id,
      userId: user.id,
      clientId: client.id,
      policyNumber: `DEL-${suffix.slice(0, 8)}`,
      status: 'ACTIVE',
      endDate: new Date(day7.start.getTime() + 12 * 60 * 60 * 1000),
    })
    await prismaAdmin.policy.update({
      where: { id: deletedId },
      data: { deletedAt: now },
    })
    const outside = await seedPolicy({
      organizationId: org.id,
      userId: user.id,
      clientId: client.id,
      policyNumber: `OUT-${suffix.slice(0, 8)}`,
      status: 'ACTIVE',
      endDate: new Date(day7.start.getTime() - 24 * 60 * 60 * 1000),
    })
    try {
      const windows = await new FindExpiringPolicies(
        new PrismaPolicyRepository(prismaAdmin)
      ).execute({ organizationId: org.id, now, thresholds: [30, 15, 7] })
      const byDays = new Map(
        windows.map((window) => [
          window.days,
          window.policies.map((policy) => policy.id),
        ])
      )
      expect(byDays.get(30)).toContain(id30)
      expect(byDays.get(15)).toContain(id15)
      expect(byDays.get(7)).toContain(id7)
      expect(byDays.get(7)).not.toContain(cancelled)
      expect(byDays.get(7)).not.toContain(outside)
      expect(byDays.get(7)).not.toContain(deletedId)
    } finally {
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
