import { randomUUID } from 'node:crypto'
import { createTenantClient, prismaAdmin } from '@repo/db'
import { describe, expect, it } from 'vitest'
import { PrismaClientRepository } from '../../../client/infrastructure/prisma-client-repository.js'
import { PrismaContactRepository } from '../../leads/infrastructure/prisma-contact-repository.js'
import { PrismaProposalRepository } from '../infrastructure/prisma-proposal-repository.js'
import { ListProposalsForClient } from './list-proposals-for-client.js'

describe('ListProposalsForClient live db', () => {
  it('org B tenant does not list org A proposals', async () => {
    const suffix = randomUUID()
    const orgA = await prismaAdmin.organization.create({
      data: { name: `org-a-${suffix}`, slug: `org-a-${suffix}` },
    })
    const orgB = await prismaAdmin.organization.create({
      data: { name: `org-b-${suffix}`, slug: `org-b-${suffix}` },
    })
    const user = await prismaAdmin.user.create({
      data: { email: `sp-${suffix}@example.com`, name: 'Sales' },
    })
    const clientRepo = new PrismaClientRepository(prismaAdmin)
    const client = await clientRepo.save({
      organizationId: orgA.id,
      legalName: 'Cliente A',
      document: '111.444.777-35',
      personType: 'INDIVIDUAL',
      profession: null,
      maritalStatus: null,
      address: null,
      fiscalBirthDate: null,
    })
    const contact = await prismaAdmin.contact.create({
      data: {
        organizationId: orgA.id,
        name: 'Contato A',
        phone: '11999990001',
        source: 'MANUAL',
        salespersonId: user.id,
        clientId: client.id,
        consentLgpd: true,
      },
    })
    const proposal = await prismaAdmin.proposal.create({
      data: {
        organizationId: orgA.id,
        contactId: contact.id,
        salespersonId: user.id,
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
      },
    })
    try {
      const tenantB = createTenantClient(orgB.id)
      const useCase = new ListProposalsForClient(
        new PrismaContactRepository(tenantB),
        new PrismaProposalRepository(tenantB)
      )
      const result = await useCase.execute({
        organizationId: orgA.id,
        clientId: client.id,
      })
      expect(result.proposals.map((item) => item.id)).not.toContain(proposal.id)
    } finally {
      await prismaAdmin.proposal.deleteMany({
        where: { organizationId: { in: [orgA.id, orgB.id] } },
      })
      await prismaAdmin.contact.deleteMany({
        where: { organizationId: { in: [orgA.id, orgB.id] } },
      })
      await prismaAdmin.client.deleteMany({
        where: { organizationId: { in: [orgA.id, orgB.id] } },
      })
      await prismaAdmin.organization.deleteMany({
        where: { id: { in: [orgA.id, orgB.id] } },
      })
      await prismaAdmin.user.delete({ where: { id: user.id } })
    }
  })

  it('returns the 10 newest proposals by createdAt desc', async () => {
    const suffix = randomUUID()
    const org = await prismaAdmin.organization.create({
      data: { name: `org-ord-${suffix}`, slug: `org-ord-${suffix}` },
    })
    const user = await prismaAdmin.user.create({
      data: { email: `ord-${suffix}@example.com`, name: 'Sales' },
    })
    const client = await new PrismaClientRepository(prismaAdmin).save({
      organizationId: org.id,
      legalName: 'Cliente Ordem',
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
        name: 'Contato Ordem',
        phone: '11999990002',
        source: 'MANUAL',
        salespersonId: user.id,
        clientId: client.id,
        consentLgpd: true,
      },
    })
    const ids: string[] = []
    for (let day = 1; day <= 11; day += 1) {
      const proposal = await prismaAdmin.proposal.create({
        data: {
          organizationId: org.id,
          contactId: contact.id,
          salespersonId: user.id,
          branch: 'AUTO',
          boardType: 'NEW_INSURANCE',
        },
      })
      await prismaAdmin.proposal.update({
        where: { id: proposal.id },
        data: {
          createdAt: new Date(
            `2026-01-${String(day).padStart(2, '0')}T00:00:00.000Z`
          ),
        },
      })
      ids.push(proposal.id)
    }
    try {
      const tenant = createTenantClient(org.id)
      const result = await new ListProposalsForClient(
        new PrismaContactRepository(tenant),
        new PrismaProposalRepository(tenant)
      ).execute({
        organizationId: org.id,
        clientId: client.id,
      })
      const createdAtTimes = result.proposals.map((item) =>
        item.createdAt.getTime()
      )
      expect(result.proposals).toHaveLength(10)
      expect(createdAtTimes).toEqual(
        [...createdAtTimes].sort((left, right) => right - left)
      )
      expect(result.proposals[0]?.id).toBe(ids[10])
      expect(result.proposals.map((item) => item.id)).not.toContain(ids[0])
    } finally {
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
