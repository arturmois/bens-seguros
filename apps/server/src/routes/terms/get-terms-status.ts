import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { prisma } from '@repo/db'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@repo/core'

export function getTermsStatusRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/terms/status',
    schema: {
      operationId: 'getTermsStatus',
      tags: ['Terms'],
      summary: 'Get terms and privacy acceptance status',
    },
    handler: async (request) => {
      const userId = request.user!.id

      const user = await prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { termsVersion: true, privacyVersion: true },
      })

      const needsReAccept =
        user.termsVersion !== CURRENT_TERMS_VERSION ||
        user.privacyVersion !== CURRENT_PRIVACY_VERSION

      return {
        success: true,
        data: {
          needsReAccept,
          currentTermsVersion: CURRENT_TERMS_VERSION,
          currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
          userTermsVersion: user.termsVersion,
          userPrivacyVersion: user.privacyVersion,
        },
      }
    },
  })
}
