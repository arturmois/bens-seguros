import type { PrismaClient } from '@repo/db'
import { Prisma } from '@repo/db'
import { describe, expect, it, vi } from 'vitest'
import { ClientAlreadyExistsError } from '../domain/client-errors.js'
import type { CreateClientPersistence } from '../domain/client-repository.js'
import { PrismaClientRepository } from './prisma-client-repository.js'

function buildInput(): CreateClientPersistence {
  return {
    organizationId: 'org-1',
    legalName: 'Fulano de Tal',
    document: '111.444.777-35',
    personType: 'INDIVIDUAL',
    profession: null,
    maritalStatus: null,
    address: null,
    fiscalBirthDate: null,
  }
}

describe('PrismaClientRepository.save — conflito P2002', () => {
  it('resolve o conflito apenas entre clientes vivos (deletedAt: null)', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    })
    const findFirst = vi.fn().mockResolvedValue({ id: 'live-client-1' })
    const prisma = {
      client: {
        create: vi.fn().mockRejectedValue(p2002),
        findFirst,
      },
    } as unknown as PrismaClient
    const repo = new PrismaClientRepository(prisma)

    await expect(repo.save(buildInput())).rejects.toBeInstanceOf(
      ClientAlreadyExistsError
    )
    expect(findFirst).toHaveBeenCalledTimes(1)
    const where = findFirst.mock.calls[0]?.[0]?.where
    expect(where?.deletedAt).toBeNull()
    expect(where?.organizationId).toBe('org-1')
  })

  it('re-lança o P2002 original quando não há cliente ativo em conflito', async () => {
    const p2002 = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    })
    const prisma = {
      client: {
        create: vi.fn().mockRejectedValue(p2002),
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaClient
    const repo = new PrismaClientRepository(prisma)

    await expect(repo.save(buildInput())).rejects.toBe(p2002)
  })
})
