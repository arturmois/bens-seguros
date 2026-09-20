import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@repo/db'
import { createTenantClient, prismaAdmin } from '@repo/db'
import { describe, expect, it } from 'vitest'
import { db, seededOrganizationId } from '../../../../test/db-harness.js'
import { ClientAlreadyExistsError } from '../domain/client-errors.js'
import type { CreateClientPersistence } from '../domain/client-repository.js'
import { PrismaClientRepository } from './prisma-client-repository.js'

function buildInput(
  organizationId: string,
  document = '111.444.777-35'
): CreateClientPersistence {
  return {
    organizationId,
    legalName: 'Fulano de Tal',
    document,
    personType: 'INDIVIDUAL',
    profession: null,
    maritalStatus: null,
    address: null,
    fiscalBirthDate: null,
  }
}

function repositoryFor(client: PrismaClient): PrismaClientRepository {
  return new PrismaClientRepository(client)
}

describe('PrismaClientRepository live db', () => {
  it('harness rolls back inserted client', async () => {
    const repo = repositoryFor(db() as PrismaClient)
    await repo.save(buildInput(seededOrganizationId))
    const count = await db().client.count({
      where: { organizationId: seededOrganizationId },
    })
    expect(count).toBe(1)
  })

  it('harness rolls back inserted client leftover is zero', async () => {
    const count = await db().client.count({
      where: { organizationId: seededOrganizationId },
    })
    expect(count).toBe(0)
  })

  it('P2002 live-client conflict', async () => {
    const suffix = randomUUID()
    const org = await prismaAdmin.organization.create({
      data: { name: `p2002-${suffix}`, slug: `p2002-${suffix}` },
    })
    try {
      const repo = repositoryFor(prismaAdmin)
      const first = await repo.save(buildInput(org.id))
      let caught: unknown
      try {
        await repo.save(buildInput(org.id))
      } catch (error) {
        caught = error
      }
      expect(caught).toBeInstanceOf(ClientAlreadyExistsError)
      if (!(caught instanceof ClientAlreadyExistsError)) {
        throw new Error('expected ClientAlreadyExistsError')
      }
      expect(caught.details.existingClientId).toBe(first.id)
      const conflict = await prismaAdmin.client.findFirst({
        where: {
          organizationId: org.id,
          deletedAt: null,
        },
      })
      expect(conflict?.id).toBe(first.id)
    } finally {
      await prismaAdmin.client.deleteMany({ where: { organizationId: org.id } })
      await prismaAdmin.organization.delete({ where: { id: org.id } })
    }
  })

  it('tenant B cannot read org A client', async () => {
    const suffix = randomUUID()
    const orgA = await prismaAdmin.organization.create({
      data: { name: `org-a-${suffix}`, slug: `org-a-${suffix}` },
    })
    const orgB = await prismaAdmin.organization.create({
      data: { name: `org-b-${suffix}`, slug: `org-b-${suffix}` },
    })
    try {
      const repo = repositoryFor(prismaAdmin)
      const client = await repo.save(buildInput(orgA.id, '390.533.447-05'))
      const tenantB = createTenantClient(orgB.id)
      const row = await tenantB.client.findFirst({
        where: { id: client.id },
      })
      expect(row).toBeNull()
    } finally {
      await prismaAdmin.client.deleteMany({
        where: { organizationId: { in: [orgA.id, orgB.id] } },
      })
      await prismaAdmin.organization.deleteMany({
        where: { id: { in: [orgA.id, orgB.id] } },
      })
    }
  })
})
