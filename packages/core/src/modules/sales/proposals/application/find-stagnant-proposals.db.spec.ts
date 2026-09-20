import { randomUUID } from 'node:crypto'
import { prismaAdmin } from '@repo/db'
import { describe, expect, it } from 'vitest'
import { PrismaProposalRepository } from '../infrastructure/prisma-proposal-repository.js'
import { FindStagnantProposals } from './find-stagnant-proposals.js'

describe('FindStagnantProposals live db', () => {
  it('stagnant is updatedAt before now minus 15 days excluding terminal stages', async () => {
    const suffix = randomUUID()
    const now = new Date('2026-09-20T12:00:00.000Z')
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 15)
    const org = await prismaAdmin.organization.create({
      data: { name: `org-stag-${suffix}`, slug: `org-stag-${suffix}` },
    })
    const user = await prismaAdmin.user.create({
      data: { email: `stag-${suffix}@example.com`, name: 'Sales' },
    })
    const contact = await prismaAdmin.contact.create({
      data: {
        organizationId: org.id,
        name: 'Contato Stag',
        phone: '11988880001',
        source: 'MANUAL',
        salespersonId: user.id,
        consentLgpd: true,
      },
    })
    const stagnant = await prismaAdmin.proposal.create({
      data: {
        organizationId: org.id,
        contactId: contact.id,
        salespersonId: user.id,
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
        stage: 'QUOTE',
        updatedAt: new Date(cutoff.getTime() - 60_000),
      },
    })
    const fresh = await prismaAdmin.proposal.create({
      data: {
        organizationId: org.id,
        contactId: contact.id,
        salespersonId: user.id,
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
        stage: 'QUOTE',
        updatedAt: new Date(cutoff.getTime() + 60_000),
      },
    })
    const lost = await prismaAdmin.proposal.create({
      data: {
        organizationId: org.id,
        contactId: contact.id,
        salespersonId: user.id,
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
        stage: 'LOST',
        updatedAt: new Date(cutoff.getTime() - 60_000),
      },
    })
    const issued = await prismaAdmin.proposal.create({
      data: {
        organizationId: org.id,
        contactId: contact.id,
        salespersonId: user.id,
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
        stage: 'POLICY_ISSUED',
        updatedAt: new Date(cutoff.getTime() - 60_000),
      },
    })
    const deleted = await prismaAdmin.proposal.create({
      data: {
        organizationId: org.id,
        contactId: contact.id,
        salespersonId: user.id,
        branch: 'AUTO',
        boardType: 'NEW_INSURANCE',
        stage: 'QUOTE',
        deletedAt: now,
        updatedAt: new Date(cutoff.getTime() - 60_000),
      },
    })
    try {
      const result = await new FindStagnantProposals(
        new PrismaProposalRepository(prismaAdmin)
      ).execute({ organizationId: org.id, now, days: 15 })
      const ids = result.map((item) => item.id)
      expect(ids).toContain(stagnant.id)
      expect(ids).not.toContain(fresh.id)
      expect(ids).not.toContain(lost.id)
      expect(ids).not.toContain(issued.id)
      expect(ids).not.toContain(deleted.id)
    } finally {
      await prismaAdmin.proposal.deleteMany({
        where: { organizationId: org.id },
      })
      await prismaAdmin.contact.deleteMany({
        where: { organizationId: org.id },
      })
      await prismaAdmin.organization.delete({ where: { id: org.id } })
      await prismaAdmin.user.delete({ where: { id: user.id } })
    }
  })
})
