import {
  container,
  UpdateProposalDetails,
  isInsuredObjectDetails,
} from '@repo/core'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'

import { errorResponse } from '../../_shared/response.schema.js'
import {
  updateInternalProposalDetailsBodySchema,
  updateInternalProposalDetailsParamsSchema,
  updateInternalProposalDetailsResponse,
} from './_schemas.js'

export function updateInternalProposalDetailsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'PUT',
    url: '/api/internal/proposals/:id/details',
    schema: {
      operationId: 'updateInternalProposalDetails',
      tags: ['Internal'],
      summary: 'Update proposal insured object details from chat conversation',
      params: updateInternalProposalDetailsParamsSchema,
      body: updateInternalProposalDetailsBodySchema,
      response: {
        200: updateInternalProposalDetailsResponse,
        400: errorResponse,
        404: errorResponse,
      },
    },
    handler: async (request, reply) => {
      const { id } = request.params
      const { details, premiumValueInCents, commissionBasisPoints } =
        request.body
      const organizationId = request.organizationId!

      if (!isInsuredObjectDetails(details)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_DETAILS',
            message:
              'details must include a valid branch (AUTO, RESIDENTIAL, LIFE, BUSINESS, CONDOMINIUM, OTHER)',
          },
        })
      }

      try {
        await container
          .resolve(UpdateProposalDetails)
          .execute(id, organizationId, {
            details,
            premiumValueInCents,
            commissionBasisPoints,
          })

        return reply.status(200).send({
          success: true,
          data: { success: true, message: 'Detalhes da proposta atualizados' },
        })
      } catch (err: unknown) {
        const code = (err as { code?: string }).code

        if (code === 'PROPOSAL_NOT_FOUND') {
          return reply.status(404).send({
            success: false,
            error: {
              code: 'PROPOSAL_NOT_FOUND',
              message: 'Proposal not found',
            },
          })
        }

        throw err
      }
    },
  })
}
