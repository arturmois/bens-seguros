import { prismaAdmin } from '@repo/db'

interface HasExistingAlertParams {
  readonly organizationId: string
  readonly entityType: string
  readonly entityId: string
  readonly type: string
}

export async function hasExistingAlert(
  params: HasExistingAlertParams
): Promise<boolean> {
  const now = new Date()
  // BRT = UTC-3
  const brtOffset = -3 * 60
  const brtNow = new Date(
    now.getTime() + (brtOffset + now.getTimezoneOffset()) * 60_000
  )

  const startOfDay = new Date(brtNow)
  startOfDay.setHours(0, 0, 0, 0)
  // Convert back to UTC for DB query
  const startUtc = new Date(
    startOfDay.getTime() - (brtOffset + now.getTimezoneOffset()) * 60_000
  )

  const endOfDay = new Date(brtNow)
  endOfDay.setHours(23, 59, 59, 999)
  const endUtc = new Date(
    endOfDay.getTime() - (brtOffset + now.getTimezoneOffset()) * 60_000
  )

  const existing = await prismaAdmin.notification.findFirst({
    where: {
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      type: params.type,
      createdAt: { gte: startUtc, lte: endUtc },
    },
    select: { id: true },
  })

  return existing !== null
}
