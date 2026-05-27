import type { ProviderName } from './types'

export class BillingProviderError extends Error {
  readonly provider: ProviderName

  constructor(
    provider: ProviderName,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = 'BillingProviderError'
    this.provider = provider
  }
}

export class BillingProviderRateLimitError extends BillingProviderError {
  readonly retryAfterSeconds?: number

  constructor(
    provider: ProviderName,
    message: string,
    options?: { cause?: unknown; retryAfterSeconds?: number }
  ) {
    super(provider, message, options)
    this.name = 'BillingProviderRateLimitError'
    this.retryAfterSeconds = options?.retryAfterSeconds
  }
}

export class BillingProviderAuthError extends BillingProviderError {
  constructor(
    provider: ProviderName,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(provider, message, options)
    this.name = 'BillingProviderAuthError'
  }
}

export class BillingProviderInvalidRequestError extends BillingProviderError {
  readonly validationErrors?: Record<string, string>

  constructor(
    provider: ProviderName,
    message: string,
    options?: { cause?: unknown; validationErrors?: Record<string, string> }
  ) {
    super(provider, message, options)
    this.name = 'BillingProviderInvalidRequestError'
    this.validationErrors = options?.validationErrors
  }
}

export class BillingProviderNetworkError extends BillingProviderError {
  constructor(
    provider: ProviderName,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(provider, message, options)
    this.name = 'BillingProviderNetworkError'
  }
}

export class BillingProviderUnhandledEventError extends BillingProviderError {
  readonly reason: string

  constructor(
    provider: ProviderName,
    message: string,
    options?: { cause?: unknown; reason?: string }
  ) {
    super(provider, message, options)
    this.name = 'BillingProviderUnhandledEventError'
    this.reason = options?.reason ?? 'unknown'
  }
}
