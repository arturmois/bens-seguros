import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EmailProvider } from '@repo/core'
import type { StorageProvider } from '@repo/core'
import { processSendQuoteEmailJob } from '../send-quote-email-processor.js'

const jobData = {
  proposalId: 'prop-1',
  organizationId: 'org-1',
  storageKey: 'quotes/prop-1.pdf',
  recipientEmail: 'cliente@example.com',
  recipientName: 'Cliente',
  salespersonName: 'Vendedor',
  salespersonEmail: null,
  organizationName: 'Corretora',
  branch: 'AUTO',
  premiumFormatted: 'R$ 1.000,00',
}

function mockStorage(): StorageProvider {
  return {
    getSignedUrl: vi
      .fn()
      .mockResolvedValue('https://storage.example/quote.pdf'),
  } as unknown as StorageProvider
}

describe('processSendQuoteEmailJob', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('MarkQuoteSent after successful send with proposalId organizationId', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })
    )
    const send = vi.fn().mockResolvedValue(undefined)
    const emailProvider = { send } as unknown as EmailProvider
    const execute = vi.fn().mockResolvedValue(undefined)
    await processSendQuoteEmailJob(
      { data: jobData },
      {
        resendApiKey: 're_test',
        emailProvider,
        storage: mockStorage(),
        markQuoteSent: { execute },
      }
    )
    expect(send).toHaveBeenCalledOnce()
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: 'prop-1',
        organizationId: 'org-1',
      })
    )
  })

  it('does not MarkQuoteSent when send throws', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })
    )
    const send = vi.fn().mockRejectedValue(new Error('smtp down'))
    const emailProvider = { send } as unknown as EmailProvider
    const execute = vi.fn().mockResolvedValue(undefined)
    await expect(
      processSendQuoteEmailJob(
        { data: jobData },
        {
          resendApiKey: 're_test',
          emailProvider,
          storage: mockStorage(),
          markQuoteSent: { execute },
        }
      )
    ).rejects.toThrow('smtp down')
    expect(execute).not.toHaveBeenCalled()
  })

  it('skips MarkQuoteSent when RESEND_API_KEY is unset', async () => {
    const send = vi.fn()
    const execute = vi.fn()
    await processSendQuoteEmailJob(
      { data: jobData },
      {
        resendApiKey: undefined,
        emailProvider: { send } as unknown as EmailProvider,
        storage: mockStorage(),
        markQuoteSent: { execute },
      }
    )
    expect(send).not.toHaveBeenCalled()
    expect(execute).not.toHaveBeenCalled()
  })
})
