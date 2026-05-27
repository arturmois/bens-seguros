import { describe, expect, it } from 'vitest'
import {
  BillingProviderAuthError,
  BillingProviderError,
  BillingProviderInvalidRequestError,
  BillingProviderNetworkError,
  BillingProviderRateLimitError,
  BillingProviderUnhandledEventError,
} from './errors'

describe('BillingProviderError', () => {
  it('é uma subclasse de Error com nome correto', () => {
    const err = new BillingProviderError('asaas', 'something broke')
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('BillingProviderError')
    expect(err.provider).toBe('asaas')
    expect(err.message).toBe('something broke')
  })

  it('preserva cause quando passada', () => {
    const cause = new Error('underlying')
    const err = new BillingProviderError('asaas', 'wrapper', { cause })
    expect(err.cause).toBe(cause)
  })
})

describe('subclasses', () => {
  it('BillingProviderRateLimitError carrega retryAfterSeconds opcional', () => {
    const err = new BillingProviderRateLimitError('asaas', 'rate limited', {
      retryAfterSeconds: 30,
    })
    expect(err).toBeInstanceOf(BillingProviderError)
    expect(err.name).toBe('BillingProviderRateLimitError')
    expect(err.retryAfterSeconds).toBe(30)
  })

  it('BillingProviderAuthError', () => {
    const err = new BillingProviderAuthError('asaas', 'invalid api key')
    expect(err).toBeInstanceOf(BillingProviderError)
    expect(err.name).toBe('BillingProviderAuthError')
  })

  it('BillingProviderInvalidRequestError carrega validationErrors opcional', () => {
    const err = new BillingProviderInvalidRequestError('asaas', 'bad payload', {
      validationErrors: { email: 'required' },
    })
    expect(err).toBeInstanceOf(BillingProviderError)
    expect(err.validationErrors).toEqual({ email: 'required' })
  })

  it('BillingProviderNetworkError', () => {
    const err = new BillingProviderNetworkError('asaas', 'timeout')
    expect(err).toBeInstanceOf(BillingProviderError)
    expect(err.name).toBe('BillingProviderNetworkError')
  })

  it('BillingProviderUnhandledEventError carrega reason', () => {
    const err = new BillingProviderUnhandledEventError(
      'asaas',
      'event outside scope',
      { reason: 'no_subscription' }
    )
    expect(err).toBeInstanceOf(BillingProviderError)
    expect(err.name).toBe('BillingProviderUnhandledEventError')
    expect(err.reason).toBe('no_subscription')
  })

  it('BillingProviderUnhandledEventError reason default unknown', () => {
    const err = new BillingProviderUnhandledEventError('asaas', 'unscoped')
    expect(err.reason).toBe('unknown')
  })
})
