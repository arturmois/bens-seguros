import { container, LookupVehicleByPlate } from '@repo/core'
import { RATE_LIMITS } from '@repo/shared'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { requireAbility } from '../../../middlewares/ability-middleware.js'
import { handleDomainError } from '../handle-domain-error.js'
import { lookupVehicleBody, lookupVehicleResponse } from './_schemas.js'

export function lookupVehicleRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/vehicles/lookup',
    schema: {
      tags: ['Vehicles'],
      summary: 'Lookup vehicle data by plate or chassi',
      operationId: 'lookupVehicle',
      body: lookupVehicleBody,
      response: { 200: lookupVehicleResponse },
    },
    config: {
      rateLimit: {
        max: RATE_LIMITS.VEHICLE_LOOKUP.max,
        timeWindow: `${String(RATE_LIMITS.VEHICLE_LOOKUP.windowSeconds)} seconds`,
        keyGenerator: (request: FastifyRequest) =>
          `vlookup:${String(request.user?.id ?? request.ip)}`,
      },
    },
    preHandler: [requireAbility('create', 'Proposal')],
    handler: async (request, reply) => {
      const useCase = container.resolve(LookupVehicleByPlate)
      try {
        const { data, source } = await useCase.execute({
          organizationId: request.organizationId!,
          userId: request.user!.id,
          plate: request.body.plate,
          chassi: request.body.chassi,
          proposalId: request.body.proposalId,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'] ?? undefined,
        })
        return reply.code(200).send({ success: true, data, meta: { source } })
      } catch (error) {
        return handleDomainError(error, reply)
      }
    },
  })
}
