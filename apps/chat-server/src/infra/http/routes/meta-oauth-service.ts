import { randomBytes } from 'node:crypto'
import { env } from '@repo/env'
import {
  type EncryptedField,
  decryptToken,
  encryptToken,
  isEncryptedField,
} from '@repo/shared/meta-crypto'

import { META_GRAPH_API } from './channel-meta-service.js'

const META_OAUTH_BASE = 'https://www.facebook.com/v21.0/dialog/oauth'

export interface OAuthState {
  readonly tenantId: string
  readonly channelType: string
  readonly nonce: string
  readonly expiresAt: number
}

export interface TokenExchangeResult {
  readonly accessToken: string
  readonly expiresIn: number
  readonly tokenType: string
}

const metaErrorSchema = {
  parse(data: Record<string, unknown>): string | undefined {
    const err = data['error']
    if (typeof err === 'object' && err !== null) {
      const errObj = err as Record<string, unknown>
      return typeof errObj['message'] === 'string'
        ? errObj['message']
        : 'Unknown Meta API error'
    }
    return undefined
  },
}

function parseTokenExchangeResponse(
  data: Record<string, unknown>
): TokenExchangeResult {
  const accessToken = data['access_token']
  if (typeof accessToken !== 'string' || !accessToken) {
    throw new Error('Meta API returned no access_token')
  }
  const rawExpiresIn = data['expires_in']
  const expiresIn = typeof rawExpiresIn === 'number' ? rawExpiresIn : 0
  const rawTokenType = data['token_type']
  const tokenType = typeof rawTokenType === 'string' ? rawTokenType : 'bearer'
  return { accessToken, expiresIn, tokenType }
}

export function generateOAuthUrl(
  tenantId: string,
  channelType: string
): { url: string; state: string } {
  const appId = env.META_APP_ID
  const redirectUri = env.META_OAUTH_REDIRECT_URI
  if (!appId || !redirectUri) {
    throw new Error(
      'META_APP_ID and META_OAUTH_REDIRECT_URI must be configured'
    )
  }
  const statePayload: OAuthState = {
    tenantId,
    channelType,
    nonce: randomBytes(16).toString('hex'),
    expiresAt: Date.now() + 5 * 60 * 1000,
  }
  const encrypted: EncryptedField = encryptToken(JSON.stringify(statePayload))
  const state = Buffer.from(JSON.stringify(encrypted)).toString('base64url')
  const scopes = [
    'pages_messaging',
    'pages_manage_metadata',
    'pages_read_engagement',
    'instagram_basic',
    'instagram_manage_messages',
  ].join(',')
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: scopes,
    response_type: 'code',
  })
  return { url: `${META_OAUTH_BASE}?${params.toString()}`, state }
}

export function validateState(stateParam: string): OAuthState {
  const encryptedJson = Buffer.from(stateParam, 'base64url').toString('utf8')
  const parsed: unknown = JSON.parse(encryptedJson)
  if (!isEncryptedField(parsed)) {
    throw new Error('Invalid OAuth state structure')
  }
  const decrypted = decryptToken(parsed)
  const payload: unknown = JSON.parse(decrypted)
  if (
    typeof payload !== 'object' ||
    payload === null ||
    typeof (payload as Record<string, unknown>)['tenantId'] !== 'string' ||
    typeof (payload as Record<string, unknown>)['channelType'] !== 'string' ||
    typeof (payload as Record<string, unknown>)['nonce'] !== 'string' ||
    typeof (payload as Record<string, unknown>)['expiresAt'] !== 'number'
  ) {
    throw new Error('Invalid OAuth state payload')
  }
  const state = payload as OAuthState
  if (state.expiresAt < Date.now()) {
    throw new Error('OAuth state expired')
  }
  return state
}

export async function exchangeCodeForToken(
  code: string
): Promise<TokenExchangeResult> {
  const appId = env.META_APP_ID
  const appSecret = env.META_APP_SECRET
  const redirectUri = env.META_OAUTH_REDIRECT_URI
  if (!appId || !appSecret || !redirectUri) {
    throw new Error(
      'META_APP_ID, META_APP_SECRET, META_OAUTH_REDIRECT_URI must be configured'
    )
  }
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  })
  const response = await fetch(
    `${META_GRAPH_API}/oauth/access_token?${params.toString()}`
  )
  const data = (await response.json()) as Record<string, unknown>
  const errorMessage = metaErrorSchema.parse(data)
  if (!response.ok || errorMessage !== undefined) {
    throw new Error(
      `Meta token exchange failed: ${errorMessage ?? 'Unknown error'}`
    )
  }
  return parseTokenExchangeResponse(data)
}

export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<TokenExchangeResult> {
  const appId = env.META_APP_ID
  const appSecret = env.META_APP_SECRET
  if (!appId || !appSecret) {
    throw new Error('META_APP_ID and META_APP_SECRET must be configured')
  }
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  })
  const response = await fetch(
    `${META_GRAPH_API}/oauth/access_token?${params.toString()}`
  )
  const data = (await response.json()) as Record<string, unknown>
  const errorMessage = metaErrorSchema.parse(data)
  if (!response.ok || errorMessage !== undefined) {
    throw new Error(
      `Meta long-lived token exchange failed: ${errorMessage ?? 'Unknown error'}`
    )
  }
  const result = parseTokenExchangeResponse(data)
  return {
    ...result,
    expiresIn: result.expiresIn || 5184000,
  }
}

export async function getMetaUserId(accessToken: string): Promise<string> {
  const response = await fetch(
    `${META_GRAPH_API}/me?access_token=${accessToken}`
  )
  const data = (await response.json()) as Record<string, unknown>
  if (!response.ok) {
    throw new Error('Failed to fetch Meta user ID')
  }
  const id = data['id']
  if (typeof id !== 'string' || !id) {
    throw new Error('Meta API returned no user id')
  }
  return id
}
