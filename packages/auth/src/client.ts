import { createAuthClient } from 'better-auth/client'
import { organizationClient } from 'better-auth/client/plugins'

export function createBetterAuthClient(baseURL: string) {
  return createAuthClient({
    baseURL,
    plugins: [organizationClient()],
    fetchOptions: {
      credentials: 'include',
    },
  })
}
