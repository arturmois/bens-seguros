import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from '@repo/core'
import { prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse } from '../shared/response.schema.js'
import { acceptTermsResponse, acceptTermsSchema } from './schemas/index.js'

export function acceptTermsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/terms/accept',
    schema: {
      operationId: 'acceptTerms',
      tags: ['Terms'],
      summary: 'Accept current terms and privacy policy',
      body: acceptTermsSchema,
      response: { 200: acceptTermsResponse, 409: errorResponse },
    },
    handler: async (request, reply) => {
      const userId = request.user!.id
      const body = request.body
      const ipAddress = request.ip
      if (
        body.termsVersion !== CURRENT_TERMS_VERSION ||
        body.privacyVersion !== CURRENT_PRIVACY_VERSION
      ) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'VERSION_MISMATCH',
            message: 'Versão dos termos não corresponde à versão atual.',
          },
        })
      }
      const now = new Date()
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            acceptedTermsAt: now,
            termsVersion: CURRENT_TERMS_VERSION,
            privacyVersion: CURRENT_PRIVACY_VERSION,
          },
        }),
        prisma.termsAcceptance.create({
          data: {
            userId,
            type: 'terms',
            version: CURRENT_TERMS_VERSION,
            acceptedAt: now,
            ipAddress,
          },
        }),
        prisma.termsAcceptance.create({
          data: {
            userId,
            type: 'privacy',
            version: CURRENT_PRIVACY_VERSION,
            acceptedAt: now,
            ipAddress,
          },
        }),
      ])
      return {
        success: true as const,
        data: {
          termsVersion: CURRENT_TERMS_VERSION,
          privacyVersion: CURRENT_PRIVACY_VERSION,
          acceptedAt: now.toISOString(),
        },
      }
    },
  })
}
