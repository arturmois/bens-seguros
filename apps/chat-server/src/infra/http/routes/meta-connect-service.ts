import { Channel } from '@repo/db-chat'
import {
  encryptToken,
  decryptToken,
  isEncryptedField,
} from '@repo/shared/meta-crypto'

import { META_GRAPH_API } from './channel-meta-service.js'

export interface ConnectChannelInput {
  readonly tenantId: string
  readonly channelType: 'MESSENGER' | 'INSTAGRAM'
  readonly name: string
  readonly pageId: string
  readonly pageAccessToken: string
  readonly metaUserId: string
  readonly scopes: string[]
  readonly tokenExpiresAt: Date
  readonly instagramAccountId?: string
}

export interface ConnectResult {
  readonly channelId: string
  readonly name: string
  readonly type: string
  readonly status: string
}

export async function connectMetaChannel(
  input: ConnectChannelInput
): Promise<ConnectResult> {
  const encryptedToken = encryptToken(input.pageAccessToken)

  const channel = await Channel.create({
    tenantId: input.tenantId,
    name: input.name,
    type: input.channelType,
    brokerType: input.channelType,
    isActive: true,
    status: 'CONNECTED',
    lastConnectedAt: new Date(),
    connectionMethod: 'oauth',
    metaUserId: input.metaUserId,
    tokenExpiresAt: input.tokenExpiresAt,
    scopes: input.scopes,
    config: {
      metaPageId: input.pageId,
      metaToken: encryptedToken,
      ...(input.instagramAccountId
        ? { metaInstagramAccountId: input.instagramAccountId }
        : {}),
    },
  })

  return {
    channelId: String(channel._id),
    name: channel.name,
    type: String(channel.type),
    status: String(channel.status),
  }
}

export async function subscribePageToWebhooks(
  pageId: string,
  pageAccessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${META_GRAPH_API}/${pageId}/subscribed_apps`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscribed_fields: 'messages,messaging_postbacks',
          access_token: pageAccessToken,
        }),
      }
    )

    const raw: unknown = await response.json()
    const data =
      typeof raw === 'object' && raw !== null
        ? (raw as Record<string, unknown>)
        : {}

    if (!response.ok) {
      const err =
        typeof data['error'] === 'object' && data['error'] !== null
          ? (data['error'] as Record<string, unknown>)
          : undefined
      return {
        success: false,
        error:
          typeof err?.['message'] === 'string'
            ? err['message']
            : 'Failed to subscribe page',
      }
    }

    return { success: true }
  } catch {
    return {
      success: false,
      error: 'Failed to connect to Meta API for page subscription',
    }
  }
}

export async function disconnectMetaChannel(
  channelId: string,
  tenantId: string
): Promise<boolean> {
  const channel = await Channel.findOne({
    _id: channelId,
    tenantId,
    isActive: true,
  })

  if (!channel) return false

  const config =
    typeof channel.config === 'object' && channel.config !== null
      ? (channel.config as Record<string, unknown>)
      : undefined
  const metaToken = config?.['metaToken']

  if (metaToken && isEncryptedField(metaToken)) {
    const plainToken = decryptToken(metaToken)
    await fetch(`${META_GRAPH_API}/me/permissions`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${plainToken}` },
    }).catch(() => {
      // Best effort — token may already be invalid
    })
  }

  await Channel.updateOne(
    { _id: channelId, tenantId },
    {
      $set: {
        isActive: false,
        status: 'DISCONNECTED',
        'config.metaToken': null,
      },
    }
  )

  return true
}

export interface ChannelMetaStatus {
  readonly status: string
  readonly connectionMethod: string
  readonly tokenExpiresAt: Date | null
  readonly scopes: string[]
}

export async function getChannelMetaStatus(
  channelId: string,
  tenantId: string
): Promise<ChannelMetaStatus | null> {
  const channel = await Channel.findOne({ _id: channelId, tenantId }).lean()
  if (!channel) return null

  const doc = channel as Record<string, unknown>

  const rawStatus = doc['status']
  const rawConnectionMethod = doc['connectionMethod']
  const rawTokenExpiresAt = doc['tokenExpiresAt']
  const rawScopes = doc['scopes']

  return {
    status: typeof rawStatus === 'string' ? rawStatus : 'UNKNOWN',
    connectionMethod:
      typeof rawConnectionMethod === 'string' ? rawConnectionMethod : 'manual',
    tokenExpiresAt:
      rawTokenExpiresAt instanceof Date ? rawTokenExpiresAt : null,
    scopes: Array.isArray(rawScopes)
      ? rawScopes.filter((s): s is string => typeof s === 'string')
      : [],
  }
}
