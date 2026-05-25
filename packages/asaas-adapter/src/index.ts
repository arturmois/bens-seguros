import { env } from '@repo/env'
import { AsaasBillingProvider } from './provider'

export { AsaasBillingProvider } from './provider'

export function createAsaasBillingProvider(): AsaasBillingProvider {
  if (!env.ASAAS_API_KEY) {
    throw new Error(
      'ASAAS_API_KEY is required to instantiate AsaasBillingProvider'
    )
  }
  if (!env.ASAAS_WEBHOOK_SECRET_CURRENT) {
    throw new Error(
      'ASAAS_WEBHOOK_SECRET_CURRENT is required to instantiate AsaasBillingProvider'
    )
  }

  return new AsaasBillingProvider({
    env: env.ASAAS_ENV,
    apiKey: env.ASAAS_API_KEY,
    webhookSecretCurrent: env.ASAAS_WEBHOOK_SECRET_CURRENT,
    webhookSecretPrevious: env.ASAAS_WEBHOOK_SECRET_PREVIOUS,
  })
}
