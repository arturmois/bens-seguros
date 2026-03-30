import { renderToBuffer } from '@react-pdf/renderer'
import {
  container,
  IssuePolicy,
  GetPolicy,
  type DocumentRepository,
  type StorageProvider,
} from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { auditCreate } from '../../../services/audit-logger.js'
import { handleDomainError } from '../handle-domain-error.js'
import { PolicySummaryPdf } from '../../../pdf-templates/policy-summary-pdf.js'
import { issuePolicyBody, policyDetailResponse } from './_schemas.js'

export function issuePolicyRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/policies',
    schema: {
      tags: ['Policies'],
      summary: 'Issue a new policy from a proposal',
      operationId: 'issuePolicy',
      body: issuePolicyBody,
      response: { 201: policyDetailResponse },
    },
    preHandler: [requireAbility('create', 'Policy')],
    handler: async (request, reply) => {
      const useCase = container.resolve(IssuePolicy)
      try {
        const { coverageDetails, ...rest } = request.body
        const policy = await useCase.execute({
          organizationId: request.organizationId!,
          ...rest,
          coverageDetails: coverageDetails
            ? JSON.parse(JSON.stringify(coverageDetails))
            : undefined,
        })
        auditCreate({
          request,
          entityType: 'Policy',
          entityId: policy.id,
          after: policy,
        })

        // Fire-and-forget PDF generation
        const orgId = request.organizationId!
        const userId = request.user!.id
        void generatePolicySummaryPdf(policy.id, orgId, userId).catch(
          (err: unknown) => {
            request.log.error(
              { err, policyId: policy.id },
              'Failed to auto-generate policy PDF'
            )
          }
        )

        return reply.status(201).send({ success: true, data: policy })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}

async function generatePolicySummaryPdf(
  policyId: string,
  organizationId: string,
  userId: string
): Promise<void> {
  const documentRepo =
    container.resolve<DocumentRepository>('DocumentRepository')
  const storage = container.resolve<StorageProvider>('StorageProvider')
  const getPolicyUseCase = container.resolve(GetPolicy)

  const policy = await getPolicyUseCase.execute(policyId, organizationId)
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, logo: true },
  })
  if (!org) return

  let logoUrl: string | null = null
  if (org.logo) {
    logoUrl = await storage.getSignedUrl(org.logo)
  }

  const buffer = Buffer.from(
    await renderToBuffer(
      PolicySummaryPdf({
        policy,
        organization: { id: org.id, name: org.name, logo: logoUrl },
      })
    )
  )

  const storageKey = `organizations/${organizationId}/policies/${policyId}/apolice.pdf`
  await storage.upload(storageKey, buffer, 'application/pdf')

  await documentRepo.upsertByStorageKey({
    organizationId,
    entityType: 'POLICY',
    entityId: policyId,
    type: 'POLICY_PDF',
    fileName: `apolice-${policy.policyNumber}.pdf`,
    mimeType: 'application/pdf',
    sizeBytes: buffer.length,
    storageKey,
    createdBy: userId,
  })
}
