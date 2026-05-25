import { createHash, timingSafeEqual } from 'node:crypto'
import {
  BillingProviderAuthError,
  BillingProviderInvalidRequestError,
  CanonicalEventSchema,
  type CanonicalEvent,
} from '@repo/billing-port'
import { AsaasWebhookPayloadSchema } from './asaas-types'
import { asaasEventToCanonicalType, decimalToCents } from './mappers'

type WebhookValidationOptions = {
  currentSecret: string
  previousSecret?: string
}

function lookupHeader(
  headers: Record<string, string>,
  name: string
): string | undefined {
  const lower = name.toLowerCase()
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === lower) return v
  }
  return undefined
}

function safeCompare(a: string, b: string): boolean {
  const aHash = createHash('sha256').update(a, 'utf8').digest()
  const bHash = createHash('sha256').update(b, 'utf8').digest()
  return timingSafeEqual(aHash, bHash)
}

export function validateAndParseWebhook(
  body: string,
  headers: Record<string, string>,
  opts: WebhookValidationOptions
): CanonicalEvent {
  const token = lookupHeader(headers, 'asaas-access-token')
  if (token === undefined) {
    throw new BillingProviderAuthError(
      'asaas',
      'missing asaas-access-token header'
    )
  }

  const matchesCurrent = safeCompare(token, opts.currentSecret)
  const matchesPrevious =
    opts.previousSecret !== undefined && safeCompare(token, opts.previousSecret)

  if (!matchesCurrent && !matchesPrevious) {
    throw new BillingProviderAuthError('asaas', 'asaas-access-token mismatch')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch (err) {
    throw new BillingProviderInvalidRequestError(
      'asaas',
      'webhook body is not valid JSON',
      { cause: err }
    )
  }

  const payload = AsaasWebhookPayloadSchema.safeParse(parsed)
  if (!payload.success) {
    throw new BillingProviderInvalidRequestError(
      'asaas',
      'webhook payload shape unexpected',
      { cause: payload.error }
    )
  }

  const canonicalType = asaasEventToCanonicalType(payload.data.event)
  if (canonicalType === null) {
    throw new BillingProviderInvalidRequestError(
      'asaas',
      `unsupported Asaas event: ${payload.data.event}`
    )
  }

  const occurredAt = payload.data.dateCreated
    ? new Date(payload.data.dateCreated.replace(' ', 'T') + 'Z')
    : new Date()

  if (canonicalType === 'SUBSCRIPTION_CANCELED_BY_PROVIDER') {
    if (!payload.data.subscription) {
      throw new BillingProviderInvalidRequestError(
        'asaas',
        'SUBSCRIPTION_DELETED event missing subscription payload'
      )
    }
    return CanonicalEventSchema.parse({
      type: canonicalType,
      provider: 'asaas',
      externalId: payload.data.id,
      occurredAt,
      providerCustomerId: payload.data.subscription.customer,
      providerSubscriptionId: payload.data.subscription.id,
    })
  }

  if (!payload.data.payment) {
    throw new BillingProviderInvalidRequestError(
      'asaas',
      `${payload.data.event} event missing payment payload`
    )
  }

  const payment = payload.data.payment
  if (!payment.subscription) {
    throw new BillingProviderInvalidRequestError(
      'asaas',
      `${payload.data.event} event has no subscription reference`
    )
  }
  const amountCents = decimalToCents(payment.value)

  if (canonicalType === 'PAYMENT_REFUNDED') {
    return CanonicalEventSchema.parse({
      type: canonicalType,
      provider: 'asaas',
      externalId: payload.data.id,
      occurredAt,
      providerCustomerId: payment.customer,
      providerSubscriptionId: payment.subscription,
      providerPaymentId: payment.id,
      refundedAmountCents: amountCents,
      currency: 'BRL',
    })
  }

  return CanonicalEventSchema.parse({
    type: canonicalType,
    provider: 'asaas',
    externalId: payload.data.id,
    occurredAt,
    providerCustomerId: payment.customer,
    providerSubscriptionId: payment.subscription,
    providerPaymentId: payment.id,
    amountCents,
    currency: 'BRL',
  })
}
