import { randomUUID } from 'node:crypto'
import { prismaAdmin } from '@repo/db'
import { describe, expect, it } from 'vitest'
import { PrismaClientRepository } from '../../../client/infrastructure/prisma-client-repository.js'
import { PrismaPolicyRepository } from '../infrastructure/prisma-policy-repository.js'
import { ExpireDuePolicies } from './expire-due-policies.js'

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
      phone: `119${input.policyNumber.slice(-8)}`,
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
      cancelledAt: input.status === 'CANCELLED' ? new Date('2026-01-01') : null,
      cancelReason: input.status === 'CANCELLED' ? 'test' : null,
    },
  })
  return policy.id
}

describe('ExpireDuePolicies live db', () => {
  it('ACTIVE past endDate becomes EXPIRED', async () => {
    const suffix = randomUUID()
    const org = await prismaAdmin.organization.create({
      data: { name: `org-exp-${suffix}`, slug: `org-exp-${suffix}` },
    })
    const user = await prismaAdmin.user.create({
      data: { email: `exp-${suffix}@example.com`, name: 'Sales' },
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
    const now = new Date('2026-09-20T12:00:00.000Z')
    const pastId = await seedPolicy({
      organizationId: org.id,
      userId: user.id,
      clientId: client.id,
      policyNumber: `PAST-${suffix.slice(0, 8)}`,
      status: 'ACTIVE',
      endDate: new Date('2026-09-01T00:00:00.000Z'),
    })
    try {
      const useCase = new ExpireDuePolicies(
        new PrismaPolicyRepository(prismaAdmin)
      )
      await useCase.execute({ now })
      const past = await prismaAdmin.policy.findUnique({
        where: { id: pastId },
      })
      expect(past?.status).toBe('EXPIRED')
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

  it('CANCELLED and future ACTIVE are untouched', async () => {
    const suffix = randomUUID()
    const org = await prismaAdmin.organization.create({
      data: { name: `org-keep-${suffix}`, slug: `org-keep-${suffix}` },
    })
    const user = await prismaAdmin.user.create({
      data: { email: `keep-${suffix}@example.com`, name: 'Sales' },
    })
    const client = await new PrismaClientRepository(prismaAdmin).save({
      organizationId: org.id,
      legalName: 'Cliente Keep',
      document: '111.444.777-35',
      personType: 'INDIVIDUAL',
      profession: null,
      maritalStatus: null,
      address: null,
      fiscalBirthDate: null,
    })
    const now = new Date('2026-09-20T12:00:00.000Z')
    const cancelledId = await seedPolicy({
      organizationId: org.id,
      userId: user.id,
      clientId: client.id,
      policyNumber: `CAN-${suffix.slice(0, 8)}`,
      status: 'CANCELLED',
      endDate: new Date('2026-09-01T00:00:00.000Z'),
    })
    const futureId = await seedPolicy({
      organizationId: org.id,
      userId: user.id,
      clientId: client.id,
      policyNumber: `FUT-${suffix.slice(0, 8)}`,
      status: 'ACTIVE',
      endDate: new Date('2026-10-01T00:00:00.000Z'),
    })
    try {
      const useCase = new ExpireDuePolicies(
        new PrismaPolicyRepository(prismaAdmin)
      )
      await useCase.execute({ now })
      const cancelled = await prismaAdmin.policy.findUnique({
        where: { id: cancelledId },
      })
      const future = await prismaAdmin.policy.findUnique({
        where: { id: futureId },
      })
      expect(cancelled?.status).toBe('CANCELLED')
      expect(future?.status).toBe('ACTIVE')
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
