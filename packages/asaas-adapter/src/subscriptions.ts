import type {
  CreateSubscriptionInput,
  PlanRef,
  SubscriptionRef,
} from '@repo/billing-port'
import { AsaasClient } from './client'
import {
  AsaasSubscriptionSchema,
  AsaasSubscriptionDeletedSchema,
} from './asaas-types'
import { PlanRefSchema, centsToDecimal, domainCycleToAsaas } from './mappers'

function formatDateForAsaas(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function nextMonth(): Date {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d
}

export async function createSubscription(
  client: AsaasClient,
  input: CreateSubscriptionInput
): Promise<SubscriptionRef> {
  const plan = PlanRefSchema.parse(input.planRef)

  const nextDueDate = formatDateForAsaas(input.trialEndsAt ?? nextMonth())

  const body = {
    customer: input.customerRef.externalId,
    billingType: 'BOLETO' as const,
    value: centsToDecimal(plan.priceCents),
    nextDueDate,
    cycle: domainCycleToAsaas(plan.billingPeriod),
  }

  const raw = await client.post('/v3/subscriptions', body)
  const parsed = AsaasSubscriptionSchema.parse(raw)

  return {
    provider: 'asaas',
    externalId: parsed.id,
    customerRef: input.customerRef,
  }
}

export async function cancelSubscription(
  client: AsaasClient,
  ref: SubscriptionRef
): Promise<void> {
  const raw = await client.delete(`/v3/subscriptions/${ref.externalId}`)
  AsaasSubscriptionDeletedSchema.parse(raw)
}

export async function changeSubscriptionPlan(
  client: AsaasClient,
  ref: SubscriptionRef,
  newPlan: PlanRef
): Promise<SubscriptionRef> {
  const plan = PlanRefSchema.parse(newPlan)

  const body = {
    value: centsToDecimal(plan.priceCents),
    cycle: domainCycleToAsaas(plan.billingPeriod),
    updatePendingPayments: true,
  }

  const raw = await client.post(`/v3/subscriptions/${ref.externalId}`, body)
  const parsed = AsaasSubscriptionSchema.parse(raw)

  return {
    provider: 'asaas',
    externalId: parsed.id,
    customerRef: ref.customerRef,
  }
}
