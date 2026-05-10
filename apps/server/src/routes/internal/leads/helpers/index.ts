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
  if (!phone) {
    return null
  }
  const contact = await tenantPrisma.contact.findFirst({
    where: { organizationId, phone, deletedAt: null },
    select: { clientId: true },
  })
  return contact?.clientId ?? null
}
