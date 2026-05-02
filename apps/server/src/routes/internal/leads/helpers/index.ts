import type { createTenantClient } from '@repo/db/tenant'

/**
 * Resolves a Client.id from either an explicit clientId or a phone number.
 *
 * After the contact-client separation refactor, Client no longer holds a phone.
 * Phone lives on Contact, and a Contact may be linked to a Client (via
 * Contact.clientId) once promoted. This helper looks up the Contact by phone
 * and returns its linked Client.id (if any).
 */
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
