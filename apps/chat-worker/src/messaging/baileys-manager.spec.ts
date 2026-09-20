import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CHAT_LIMITS } from '@repo/shared'
import type { BrokerEvents } from './broker.js'
import {
  connectChannel,
  disconnectAll,
  getChannel,
  getChannelLimitForOrg,
} from './baileys-manager.js'

vi.mock('pino', () => ({
  default: () => ({
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  }),
}))

vi.mock('./baileys-broker.js', () => ({
  BaileysBroker: class {
    connect = vi.fn().mockResolvedValue(undefined)
    disconnect = vi.fn().mockResolvedValue(undefined)
  },
}))

const TENANT_ID = 'org-baileys-1'
const FETCH_URL = `http://localhost:3001/api/internal/billing/entitlements/${TENANT_ID}`

function entitlementsBody(maxChannels: number | null) {
  return {
    success: true,
    data: {
      maxChannels,
      maxUsers: null,
      maxProposalsPerMonth: null,
      maxConversationsPerOrg: null,
      maxImportRows: null,
      maxLogoSizeBytes: null,
      aiEnabled: true,
      aiMessagesIncluded: 0,
      aiOverageCentsPerMessage: 0,
      customBranding: true,
      apiAccess: true,
      advancedReports: true,
      prioritySupport: false,
      isActive: true,
      isTrialing: false,
      trialEndsAt: null,
      billingManagedExternally: true,
    },
  }
}

function jsonResponse(maxChannels: number | null): Response {
  return {
    ok: true,
    status: 200,
    json: async () => entitlementsBody(maxChannels),
  } as unknown as Response
}

const events: BrokerEvents = {
  onMessage: vi.fn(),
  onStatusUpdate: vi.fn(),
  onConnectionUpdate: vi.fn(),
}

describe('baileys-manager entitlements', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(null)))
  })

  afterEach(async () => {
    await disconnectAll()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('entitlements fetch uses 3000ms abort and HMAC headers', async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, 'timeout')
    await getChannelLimitForOrg(TENANT_ID)
    expect(timeoutSpy).toHaveBeenCalledWith(3000)
    expect(fetch).toHaveBeenCalledWith(
      FETCH_URL,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'X-Signature': expect.any(String),
          'X-Timestamp': expect.any(String),
          'X-Tenant-Id': TENANT_ID,
        }),
      })
    )
  })

  it('connectChannel rejects when entitlements fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))
    await expect(connectChannel('ch-fail', TENANT_ID, events)).rejects.toThrow()
    expect(getChannel('ch-fail')).toBeUndefined()
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as unknown as Response)
    await expect(
      connectChannel('ch-fail-status', TENANT_ID, events)
    ).rejects.toThrow()
    expect(getChannel('ch-fail-status')).toBeUndefined()
  })

  it('null maxChannels effective limit is 10', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(null))
    const limit = await getChannelLimitForOrg(TENANT_ID)
    expect(limit).toBe(CHAT_LIMITS.MAX_BAILEYS_CHANNELS_PER_ORG)
    expect(limit).toBe(10)
  })

  it('maxChannels 3 effective limit is 3', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(3))
    const limit = await getChannelLimitForOrg(TENANT_ID)
    expect(limit).toBe(3)
  })
})
