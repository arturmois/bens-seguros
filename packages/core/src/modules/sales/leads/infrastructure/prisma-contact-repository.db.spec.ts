import { randomUUID } from 'node:crypto'
import { createTenantClient, prismaAdmin } from '@repo/db'
import { describe, expect, it } from 'vitest'
import { PrismaContactRepository } from './prisma-contact-repository.js'

describe('PrismaContactRepository live db', () => {
  it('findByPhone under org B tenant returns null', async () => {
    const suffix = randomUUID()
    const orgA = await prismaAdmin.organization.create({
      data: { name: `org-a-${suffix}`, slug: `org-a-${suffix}` },
    })
    const orgB = await prismaAdmin.organization.create({
      data: { name: `org-b-${suffix}`, slug: `org-b-${suffix}` },
    })
    const salesperson = await prismaAdmin.user.create({
      data: {
        email: `sp-${suffix}@example.com`,
        name: 'Salesperson A',
      },
    })
    const phone = '11999990000'
    try {
      const repoA = new PrismaContactRepository(prismaAdmin)
      await repoA.save({
        id: randomUUID(),
        organizationId: orgA.id,
        name: 'Contato A',
        phone,
        email: null,
        source: 'MANUAL',
        salespersonId: salesperson.id,
        clientId: null,
        tags: [],
        socialMedia: null,
        notes: null,
        consentLgpd: true,
        birthDate: null,
      })
      const repoB = new PrismaContactRepository(createTenantClient(orgB.id))
      const row = await repoB.findByPhone(phone, orgA.id)
      expect(row).toBeNull()
    } finally {
      await prismaAdmin.contact.deleteMany({
        where: { organizationId: { in: [orgA.id, orgB.id] } },
      })
      await prismaAdmin.organization.deleteMany({
        where: { id: { in: [orgA.id, orgB.id] } },
      })
      await prismaAdmin.user.delete({ where: { id: salesperson.id } })
    }
  })
})
