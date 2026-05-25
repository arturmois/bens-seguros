import {
  BillingProviderAuthError,
  BillingProviderError,
  BillingProviderInvalidRequestError,
  BillingProviderNetworkError,
  BillingProviderRateLimitError,
} from '@repo/billing-port'
import { z } from 'zod'

const ErrorBodySchema = z.object({
  errors: z
    .array(z.object({ code: z.string(), description: z.string() }))
    .optional(),
})

type AsaasEnv = 'sandbox' | 'production'

type AsaasClientOptions = {
  env: AsaasEnv
  apiKey: string
  fetch?: typeof fetch
}

const BASE_URLS: Record<AsaasEnv, string> = {
  sandbox: 'https://api-sandbox.asaas.com',
  production: 'https://api.asaas.com',
}

export class AsaasClient {
  private readonly baseUrl: string
  private readonly apiKey: string
  private readonly fetchImpl: typeof fetch

  constructor(opts: AsaasClientOptions) {
    this.baseUrl = BASE_URLS[opts.env]
    this.apiKey = opts.apiKey
    this.fetchImpl = opts.fetch ?? fetch
  }

  async get(path: string): Promise<unknown> {
    return this.request('GET', path)
  }

  async post(path: string, body: unknown): Promise<unknown> {
    return this.request('POST', path, body)
  }

  async delete(path: string): Promise<unknown> {
    return this.request('DELETE', path)
  }

  private async request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: unknown
  ): Promise<unknown> {
    const url = `${this.baseUrl}${path}`

    let res: Response
    try {
      res = await this.fetchImpl(url, {
        method,
        headers: {
          access_token: this.apiKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (err) {
      throw new BillingProviderNetworkError(
        'asaas',
        `network error calling ${method} ${path}`,
        { cause: err }
      )
    }

    if (res.ok) {
      return await res.json()
    }

    let parsedBody: unknown
    try {
      parsedBody = await res.json()
    } catch {
      parsedBody = { errors: [] }
    }
    const errBody = ErrorBodySchema.safeParse(parsedBody)
    const errorList = errBody.success ? (errBody.data.errors ?? []) : []
    const validationErrors = Object.fromEntries(
      errorList.map((e) => [e.code, e.description])
    )

    const summaryMessage =
      errorList.length > 0
        ? errorList.map((e) => `${e.code}: ${e.description}`).join('; ')
        : `HTTP ${res.status} from Asaas`

    if (res.status === 401) {
      throw new BillingProviderAuthError('asaas', summaryMessage)
    }
    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after')
      throw new BillingProviderRateLimitError('asaas', summaryMessage, {
        retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined,
      })
    }
    if (res.status >= 400 && res.status < 500) {
      throw new BillingProviderInvalidRequestError('asaas', summaryMessage, {
        validationErrors,
      })
    }
    throw new BillingProviderError('asaas', summaryMessage)
  }
}
