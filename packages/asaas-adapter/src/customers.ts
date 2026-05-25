import type { CreateCustomerInput, CustomerRef } from '@repo/billing-port'
import { AsaasClient } from './client'
import { AsaasCustomerSchema } from './asaas-types'

export async function createCustomer(
  client: AsaasClient,
  input: CreateCustomerInput
): Promise<CustomerRef> {
  const body: Record<string, string> = {
    name: input.name,
    email: input.email,
  }
  if (input.taxId !== undefined) body.cpfCnpj = input.taxId
  if (input.externalRef !== undefined)
    body.externalReference = input.externalRef

  const raw = await client.post('/v3/customers', body)
  const parsed = AsaasCustomerSchema.parse(raw)

  return { provider: 'asaas', externalId: parsed.id }
}
