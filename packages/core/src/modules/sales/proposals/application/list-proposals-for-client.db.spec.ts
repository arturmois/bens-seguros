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
})
