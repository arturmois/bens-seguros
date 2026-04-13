import { renderToBuffer } from '@react-pdf/renderer'
import {
  container,
  GetPolicy,
  type DocumentRepository,
  type StorageProvider,
} from '@repo/core'
import { prismaAdmin as prisma } from '@repo/db'
import { decrypt, getEncryptionKey, type EncryptedField } from '@repo/shared'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import pino from 'pino'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { PolicySummaryPdf } from '../../../pdf-templates/policy-summary-pdf.js'
import { handleDomainError } from '../handle-domain-error.js'
import {
  errorResponse,
  generatePdfQuery,
  idParam,
  policyPdfResponse,
} from './_schemas.js'

const logger = pino({ name: 'generate-policy-pdf' })

interface ClientFullData {
  name: string
  document: string
  email: string | null
  phone: string | null
  address: Record<string, string> | null
}

interface RawClientRow {
  name: string
  email: string | null
  phone: string | null
  address: unknown
  documentEncrypted: string
}

function isEncryptedField(value: unknown): value is EncryptedField {
  return (
    value !== null &&
    typeof value === 'object' &&
    'ciphertext' in value &&
    'iv' in value &&
    'tag' in value
  )
}

function toStringRecord(value: unknown): Record<string, string> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }
  const result: Record<string, string> = {}
  for (const [k, v] of Object.entries(value)) {
    result[k] = v != null ? String(v) : ''
  }
  return result
}

function decryptDocument(documentEncrypted: string): string | null {
  if (!documentEncrypted || documentEncrypted.length === 0) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(documentEncrypted)
    if (!isEncryptedField(parsed)) {
      return null
    }
    const key = getEncryptionKey()
    return decrypt(parsed, key)
  } catch (err: unknown) {
    logger.warn({ err }, 'Failed to decrypt client document for PDF')
    return null
  }
}

function buildClientFullData(
  rawClient: RawClientRow | null,
  fallbackDocument: string | undefined
): ClientFullData | null {
  if (!rawClient) {
    return null
  }
  const decrypted = decryptDocument(rawClient.documentEncrypted)
  const document = decrypted ?? fallbackDocument ?? 'Não informado'
  return {
    name: rawClient.name,
    document,
    email: rawClient.email,
    phone: rawClient.phone,
    address: toStringRecord(rawClient.address),
  }
}

export function generatePolicyPdfRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/policies/:id/pdf',
    schema: {
      tags: ['Policies'],
      summary: 'Generate or retrieve a cached policy PDF',
      operationId: 'generatePolicyPdf',
      params: idParam,
      querystring: generatePdfQuery,
      response: { 200: policyPdfResponse, 404: errorResponse },
    },
    preHandler: [requireAbility('read', 'Policy')],
    handler: async (request, reply) => {
      const organizationId = request.organizationId!
      const forceRegenerate = request.query.force === 'true'

      const documentRepo =
        container.resolve<DocumentRepository>('DocumentRepository')
      const storage = container.resolve<StorageProvider>('StorageProvider')

      if (!forceRegenerate) {
        const existing = await documentRepo.findByEntity(
          'POLICY',
          request.params.id,
          organizationId
        )
        const existingPdf = existing.find((doc) => doc.type === 'POLICY_PDF')
        if (existingPdf) {
          const url = await storage.getSignedUrl(existingPdf.storageKey)
          return reply.send({ success: true, data: { url, cached: true } })
        }
      }

      const getPolicyUseCase = container.resolve(GetPolicy)
      let policy
      try {
        policy = await getPolicyUseCase.execute(
          request.params.id,
          organizationId
        )
      } catch (error) {
        return handleDomainError(error, reply)
      }

      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, name: true, logo: true },
      })

      if (!org) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'ORGANIZATION_NOT_FOUND',
            message: 'Organização não encontrada',
          },
        })
      }

      let logoUrl: string | null = null
      if (org.logo) {
        logoUrl = await storage.getSignedUrl(org.logo)
      }

      const organizationData = {
        id: org.id,
        name: org.name,
        logo: logoUrl,
      }

      const rawClient = await prisma.client.findFirst({
        where: { id: policy.clientId, organizationId },
        select: {
          name: true,
          email: true,
          phone: true,
          address: true,
          documentEncrypted: true,
        },
      })

      const clientFullData = buildClientFullData(
        rawClient,
        policy.clientDocument
      )

      const buffer = Buffer.from(
        await renderToBuffer(
          PolicySummaryPdf({
            policy,
            organization: organizationData,
            clientFull: clientFullData,
          })
        )
      )

      const storageKey = `organizations/${organizationId}/policies/${request.params.id}/apolice.pdf`
      await storage.upload(storageKey, buffer, 'application/pdf')

      await documentRepo.upsertByStorageKey({
        organizationId,
        entityType: 'POLICY',
        entityId: request.params.id,
        type: 'POLICY_PDF',
        fileName: `apolice-${policy.policyNumber}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: buffer.length,
        storageKey,
        createdBy: request.user!.id,
      })

      const url = await storage.getSignedUrl(storageKey)
      return reply.send({ success: true, data: { url, cached: false } })
    },
  })
}
