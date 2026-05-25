import { z } from 'zod'

export const AsaasCustomerSchema = z.object({
  object: z.literal('customer').optional(),
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  mobilePhone: z.string().optional().nullable(),
  cpfCnpj: z.string().optional().nullable(),
  dateCreated: z.string().optional(),
})

export type AsaasCustomer = z.infer<typeof AsaasCustomerSchema>

export const AsaasSubscriptionSchema = z.object({
  object: z.literal('subscription').optional(),
  id: z.string(),
  customer: z.string(),
  billingType: z.enum(['BOLETO', 'CREDIT_CARD', 'PIX']),
  value: z.number(),
  nextDueDate: z.string(),
  cycle: z.enum([
    'MONTHLY',
    'YEARLY',
    'WEEKLY',
    'BIWEEKLY',
    'QUARTERLY',
    'SEMIANNUALLY',
  ]),
  status: z.enum(['ACTIVE', 'EXPIRED', 'INACTIVE']),
  description: z.string().optional().nullable(),
  externalReference: z.string().optional().nullable(),
  dateCreated: z.string().optional(),
})

export type AsaasSubscription = z.infer<typeof AsaasSubscriptionSchema>

export const AsaasSubscriptionDeletedSchema = z.object({
  deleted: z.boolean(),
  id: z.string(),
})

export const AsaasPaymentSchema = z.object({
  object: z.literal('payment').optional(),
  id: z.string(),
  customer: z.string(),
  subscription: z.string().optional().nullable(),
  value: z.number(),
  netValue: z.number().optional(),
  billingType: z.string(),
  status: z.string(),
  dueDate: z.string(),
  paymentDate: z.string().optional().nullable(),
  invoiceUrl: z.string().optional().nullable(),
})

export type AsaasPayment = z.infer<typeof AsaasPaymentSchema>

export const AsaasWebhookPayloadSchema = z.object({
  id: z.string(),
  event: z.string(),
  dateCreated: z.string().optional(),
  payment: AsaasPaymentSchema.optional(),
  subscription: AsaasSubscriptionSchema.optional(),
})

export type AsaasWebhookPayload = z.infer<typeof AsaasWebhookPayloadSchema>
