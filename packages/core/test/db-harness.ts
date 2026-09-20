import { randomUUID } from 'node:crypto'
import { Prisma, prismaAdmin } from '@repo/db'
import { afterEach, beforeEach } from 'vitest'

const ROLLBACK = 'DB_HARNESS_ROLLBACK'

let tx: Prisma.TransactionClient | undefined
let release: (() => void) | undefined
let transactionEnded: Promise<void> | undefined

export let seededOrganizationId = ''

export function db(): Prisma.TransactionClient {
  if (!tx) {
    throw new Error('db harness transaction is not open')
  }
  return tx
}

beforeEach(async () => {
  let resolveReady: (client: Prisma.TransactionClient) => void = () => undefined
  const ready = new Promise<Prisma.TransactionClient>((resolve) => {
    resolveReady = resolve
  })
  const released = new Promise<void>((resolve) => {
    release = resolve
  })

  transactionEnded = prismaAdmin
    .$transaction(
      async (client) => {
        resolveReady(client)
        await released
        throw new Error(ROLLBACK)
      },
      { maxWait: 15_000, timeout: 60_000 }
    )
    .then(() => undefined)
    .catch((error: unknown) => {
      if (error instanceof Error && error.message === ROLLBACK) {
        return undefined
      }
      throw error
    })

  tx = await ready
  const org = await tx.organization.create({
    data: {
      name: `db-harness-${randomUUID()}`,
      slug: `db-harness-${randomUUID()}`,
    },
  })
  seededOrganizationId = org.id
})

afterEach(async () => {
  release?.()
  await transactionEnded
  tx = undefined
  release = undefined
  seededOrganizationId = ''
})
