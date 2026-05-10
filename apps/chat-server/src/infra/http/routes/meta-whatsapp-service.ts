import { randomBytes } from 'node:crypto'
import { Channel } from '@repo/db-chat'
import { env } from '@repo/env'
import { encryptToken } from '@repo/shared/meta-crypto'

import { META_GRAPH_API } from './channel-meta-service.js'

interface EmbeddedSignupInput {
  tenantId: string
  code: string
  phoneNumberId: string
  wabaId: string
  name: string
}

interface ConnectResult {
  channelId: string
  name: string
  type: string
  status: string
  phoneNumber: string | null
}

export async function connectWhatsAppEmbeddedSignup(
  input: EmbeddedSignupInput
): Promise<ConnectResult> {
  const appId = env.META_APP_ID
  const appSecret = env.META_APP_SECRET
  if (!appId || !appSecret) {
    throw new Error('META_APP_ID and META_APP_SECRET required')
  }
  const tokenParams = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    code: input.code,
  })
  const tokenResponse = await fetch(
    `${META_GRAPH_API}/oauth/access_token?${tokenParams.toString()}`
  )
  const tokenRaw: unknown = await tokenResponse.json()
  const tokenData =
    typeof tokenRaw === 'object' && tokenRaw !== null
      ? (tokenRaw as Record<string, unknown>)
      : {}
  if (!tokenResponse.ok || typeof tokenData['error'] === 'object') {
    const err =
      typeof tokenData['error'] === 'object' && tokenData['error'] !== null
        ? (tokenData['error'] as Record<string, unknown>)
        : undefined
    throw new Error(
      `WhatsApp token exchange failed: ${
        typeof err?.['message'] === 'string' ? err['message'] : 'Unknown error'
      }`
    )
  }
  const accessToken = tokenData['access_token']
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new Error('WhatsApp token exchange returned no access_token')
  }
  const pin = String(
    Math.floor(100000 + (randomBytes(4).readUInt32BE() % 900000))
  )
  const registerResponse = await fetch(
    `${META_GRAPH_API}/${input.phoneNumberId}/register`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        pin,
      }),
    }
  )
  if (!registerResponse.ok) {
    const registerRaw: unknown = await registerResponse.json()
    const registerData =
      typeof registerRaw === 'object' && registerRaw !== null
        ? (registerRaw as Record<string, unknown>)
        : {}
    const regErr =
      typeof registerData['error'] === 'object' &&
      registerData['error'] !== null
        ? (registerData['error'] as Record<string, unknown>)
        : undefined
    throw new Error(
      `Phone registration failed: ${
        typeof regErr?.['message'] === 'string'
          ? regErr['message']
          : 'Unknown error'
      }`
    )
  }
  await fetch(`${META_GRAPH_API}/${input.wabaId}/subscribed_apps`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const phoneResponse = await fetch(
    `${META_GRAPH_API}/${input.phoneNumberId}?fields=display_phone_number&access_token=${accessToken}`
  )
  const phoneRaw: unknown = await phoneResponse.json()
  const phoneData =
    typeof phoneRaw === 'object' && phoneRaw !== null
      ? (phoneRaw as Record<string, unknown>)
      : {}
  const phoneNumber =
    typeof phoneData['display_phone_number'] === 'string'
      ? phoneData['display_phone_number']
      : null
  const encryptedToken = encryptToken(accessToken)
  const encryptedPin = encryptToken(pin)
  const channel = await Channel.create({
    tenantId: input.tenantId,
    name: input.name,
    type: 'WHATSAPP',
    brokerType: 'META',
    phoneNumber,
    isActive: true,
    status: 'CONNECTED',
    lastConnectedAt: new Date(),
    connectionMethod: 'embedded_signup',
    tokenExpiresAt: null, // BISU tokens don't expire
    scopes: ['whatsapp_business_management', 'whatsapp_business_messaging'],
    config: {
      metaPhoneNumberId: input.phoneNumberId,
      metaWabaId: input.wabaId,
      metaToken: encryptedToken,
      metaRegistrationPin: encryptedPin,
    },
  })
  return {
    channelId: String(channel._id),
    name: channel.name,
    type: String(channel.type),
    status: String(channel.status),
    phoneNumber,
  }
}
