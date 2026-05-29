import { rm } from 'node:fs/promises'
import { resolve } from 'node:path'

import { GetEntitlementsForOrg, PrismaSubscriptionRepository } from '@repo/core'
import { prismaAdmin } from '@repo/db'
import { Channel } from '@repo/db-chat'
import { env } from '@repo/env'
import { CHAT_LIMITS } from '@repo/shared'
import pino from 'pino'

import { BaileysBroker } from './baileys-broker.js'
import type { BrokerEvents } from './broker.js'

// Hard cap independent of plan: Baileys SDK and host RAM constraints. Plan
// quota (entitlements.maxChannels) is layered on top — the effective limit is
// the minimum of the two.
const BAILEYS_TECHNICAL_HARD_CAP = CHAT_LIMITS.MAX_BAILEYS_CHANNELS_PER_ORG

// Module-level instance — reused across all getChannelLimitForOrg calls
const getEntitlementsForOrg = new GetEntitlementsForOrg(
  new PrismaSubscriptionRepository(prismaAdmin)
)

async function getChannelLimitForOrg(tenantId: string): Promise<number> {
  const entitlements = await getEntitlementsForOrg.execute(tenantId)
  const planLimit = entitlements.maxChannels ?? Number.POSITIVE_INFINITY
  return Math.min(planLimit, BAILEYS_TECHNICAL_HARD_CAP)
}

interface ManagedConnection {
  readonly broker: BaileysBroker
  readonly tenantId: string
}

const logger = pino({ level: 'info' }).child({ module: 'baileys-manager' })

const connections = new Map<string, ManagedConnection>()

const SESSIONS_DIR = env.BAILEYS_SESSIONS_DIR

export async function cleanupSession(channelId: string): Promise<void> {
  const sessionPath = resolve(SESSIONS_DIR, channelId)
  try {
    await rm(sessionPath, { recursive: true, force: true })
    logger.info({ channelId, sessionPath }, 'Baileys session cleaned up')
  } catch (err: unknown) {
    logger.warn({ channelId, err }, 'Failed to cleanup Baileys session')
  }
}

function countChannelsForTenant(tenantId: string): number {
  let count = 0
  for (const conn of connections.values()) {
    if (conn.tenantId === tenantId) {
      count += 1
    }
  }
  return count
}

export async function connectChannel(
  channelId: string,
  tenantId: string,
  events: BrokerEvents
): Promise<void> {
  if (connections.has(channelId)) {
    logger.warn({ channelId }, 'Channel already connected, skipping')
    return
  }
  const currentCount = countChannelsForTenant(tenantId)
  const limit = await getChannelLimitForOrg(tenantId)
  if (currentCount >= limit) {
    logger.warn(
      { tenantId, currentCount, limit },
      'Baileys channel limit reached for tenant'
    )
    throw new Error(
      `Tenant ${tenantId} has reached the max of ${String(limit)} Baileys channels`
    )
  }
  const broker = new BaileysBroker(tenantId, channelId)
  connections.set(channelId, { broker, tenantId })
  logger.info({ channelId, tenantId }, 'Connecting Baileys channel')
  await broker.connect(events)
}

export async function connectChannelWithPairingCode(
  channelId: string,
  tenantId: string,
  phoneNumber: string,
  events: BrokerEvents
): Promise<string> {
  if (connections.has(channelId)) {
    const existing = connections.get(channelId)
    if (existing) {
      await existing.broker.disconnect()
      connections.delete(channelId)
    }
  }
  const currentCount = countChannelsForTenant(tenantId)
  const limit = await getChannelLimitForOrg(tenantId)
  if (currentCount >= limit) {
    logger.warn(
      { tenantId, currentCount, limit },
      'Baileys channel limit reached for tenant'
    )
    throw new Error(
      `Tenant ${tenantId} has reached the max of ${String(limit)} Baileys channels`
    )
  }
  const broker = new BaileysBroker(tenantId, channelId)
  connections.set(channelId, { broker, tenantId })
  logger.info(
    { channelId, tenantId },
    'Connecting Baileys channel with pairing code'
  )
  const code = await broker.connectWithPairingCode(phoneNumber, events)
  return code
}

export async function disconnectChannel(channelId: string): Promise<void> {
  const conn = connections.get(channelId)
  if (!conn) {
    return
  }
  logger.info(
    { channelId, tenantId: conn.tenantId },
    'Disconnecting Baileys channel'
  )
  await conn.broker.disconnect()
  connections.delete(channelId)
}

export function getChannel(channelId: string): BaileysBroker | undefined {
  return connections.get(channelId)?.broker
}

export async function disconnectAll(): Promise<void> {
  logger.info({ count: connections.size }, 'Disconnecting all Baileys channels')
  const tasks: Array<Promise<void>> = []
  for (const [channelId, conn] of connections) {
    tasks.push(
      conn.broker.disconnect().then(() => {
        connections.delete(channelId)
      })
    )
  }
  await Promise.all(tasks)
}

export async function loadActiveChannels(
  createEvents: (channelId: string, tenantId: string) => BrokerEvents
): Promise<void> {
  const channels = await Channel.find({
    brokerType: 'BAILEYS',
    isActive: true,
  })
    .lean()
    .exec()
  logger.info(
    { count: channels.length },
    'Loading active Baileys channels from database'
  )
  for (const channel of channels) {
    const channelId = String(channel._id)
    const tenantId = channel.tenantId
    try {
      const events = createEvents(channelId, tenantId)
      await connectChannel(channelId, tenantId, events)
    } catch (err: unknown) {
      logger.error(
        { channelId, tenantId, err },
        'Failed to connect Baileys channel on startup'
      )
    }
  }
}
