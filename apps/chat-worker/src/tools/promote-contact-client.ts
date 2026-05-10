import pino from 'pino'
import { env } from '@repo/env'
import { signRequest } from '@repo/shared'

const logger = pino({ name: 'promote-contact-client' })

const FETCH_TIMEOUT_MS = 10_000

export type PersonType = 'INDIVIDUAL' | 'COMPANY'

export interface PromoteContactInput {
  readonly tenantId: string
  readonly pgContactId: string
  readonly document: string
  readonly legalName?: string
  readonly personType?: PersonType
}

export interface PromoteContactResult {
  readonly success: boolean
  readonly clientId?: string
  readonly message: string
}

export async function promoteContactInPostgres(
  input: PromoteContactInput
): Promise<PromoteContactResult> {
  const { tenantId, pgContactId, document, legalName, personType } = input
  if (!env.INTERNAL_API_URL || !env.INTERNAL_API_SECRET) {
    logger.warn(
      { tenantId },
      'Internal API not configured, cannot promote contact'
    )
    return { success: false, message: 'Internal API not configured' }
  }
  try {
    const path = `/api/internal/contacts/${pgContactId}/promote`
    const body = JSON.stringify({ document, legalName, personType })
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = signRequest({
      secret: env.INTERNAL_API_SECRET,
      method: 'POST',
      path,
      tenantId,
      body,
      timestamp,
    })
    const response = await fetch(`${env.INTERNAL_API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Timestamp': String(timestamp),
        'X-Tenant-Id': tenantId,
      },
      body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    })
    if (!response.ok) {
      logger.error(
        { status: response.status, tenantId, pgContactId },
        'Failed to promote contact via internal API'
      )
      return {
        success: false,
        message: `API responded with status ${String(response.status)}`,
      }
    }
    const json: unknown = await response.json()
    let clientId: string | undefined
    if (
      typeof json === 'object' &&
      json !== null &&
      'data' in json &&
      typeof json.data === 'object' &&
      json.data !== null &&
      'clientId' in json.data &&
      typeof json.data.clientId === 'string'
    ) {
      clientId = json.data.clientId
    }
    if (!clientId) {
      logger.warn(
        { tenantId, pgContactId },
        'Promote contact succeeded but response missing clientId'
      )
      return { success: false, message: 'Resposta da API sem clientId' }
    }
    return {
      success: true,
      clientId,
      message: `Contato promovido a cliente: ${clientId}`,
    }
  } catch (err: unknown) {
    logger.error(
      { err, tenantId, pgContactId },
      'Error calling internal API for contact promotion'
    )
    return { success: false, message: 'Falha ao promover contato' }
  }
}
