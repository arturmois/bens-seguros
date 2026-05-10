import type { Prisma } from '@repo/db'
import { createTenantClient } from '@repo/db/tenant'
import {
  encrypt,
  getEncryptionKey,
  hashDocument,
  stripNonDigits,
} from '@repo/shared'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorResponse } from '../../shared/response.schema.js'
import {
  updateClientBodySchema,
  updateClientParamsSchema,
  updateClientResponse,
} from './schemas/index.js'

const CPF_LENGTH = 11
const CNPJ_LENGTH = 14

export function updateClientRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/internal/clients/:id',
    schema: {
      operationId: 'updateClientInternal',
      tags: ['Internal'],
      summary: 'Update client fiscal data from chat conversation',
      params: updateClientParamsSchema,
      body: updateClientBodySchema,
      response: {
        200: updateClientResponse,
        400: errorResponse,
        404: errorResponse,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params
      const body = request.body
      const organizationId = request.organizationId!
      const tenantPrisma = createTenantClient(organizationId)
      const existing = await tenantPrisma.client.findFirst({
        where: { id, organizationId, deletedAt: null },
      })
      if (!existing) {
        return reply.status(404).send({
          success: false,
          error: { code: 'CLIENT_NOT_FOUND', message: 'Client not found' },
        })
      }
      const updateData: Prisma.ClientUpdateInput = {}
      if (body.document !== undefined) {
        const digits = stripNonDigits(body.document)
        if (digits.length !== CPF_LENGTH && digits.length !== CNPJ_LENGTH) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_DOCUMENT',
              message:
                'Document must be a valid CPF (11 digits) or CNPJ (14 digits)',
            },
          })
        }
        const key = getEncryptionKey()
        const encrypted = encrypt(digits, key)
        updateData.documentEncrypted = JSON.stringify(encrypted)
        updateData.documentHash = hashDocument(digits)
        updateData.document = digits
      }
      if (body.address !== undefined) {
        updateData.address = body.address
      }
      if (body.birthDate !== undefined) {
        updateData.fiscalBirthDate = new Date(body.birthDate)
      }
      if (body.profession !== undefined) {
        updateData.profession = body.profession
      }
      if (body.maritalStatus !== undefined) {
        updateData.maritalStatus = body.maritalStatus
      }
      await tenantPrisma.client.update({
        where: { id },
        data: updateData,
      })
      return reply.status(200).send({
        success: true,
        data: { success: true, message: 'Dados do cliente atualizados' },
      })
    },
  })
}
