import type { createTenantClient } from '@repo/db/tenant'

export async function resolveClientId(
  tenantPrisma: ReturnType<typeof createTenantClient>,
  organizationId: string,
  clientId: string | undefined,
  phone: string | undefined
): Promise<string | null> {
  if (clientId) {
    return clientId
  }

  const client = await tenantPrisma.client.findFirst({
    where: { organizationId, phone, deletedAt: null },
    select: { id: true },
  })

  return client?.id ?? null
}
