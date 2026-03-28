import type { FastifyInstance } from 'fastify'
import { prisma } from '@repo/db'
import { CURRENT_TERMS_VERSION, CURRENT_PRIVACY_VERSION } from '@repo/core'
import { z } from 'zod'

const acceptTermsSchema = z.object({
  termsVersion: z.string(),
  privacyVersion: z.string(),
})

export async function termsRoutes(app: FastifyInstance) {
  // GET /api/terms/status — check if user needs to re-accept
  app.get('/api/terms/status', async (request) => {
    const userId = request.user.id

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
  })

  // POST /api/terms/accept — accept current terms
  app.post('/api/terms/accept', async (request) => {
    const userId = request.user.id
    const body = acceptTermsSchema.parse(request.body)
    const ipAddress = request.ip

    if (
      body.termsVersion !== CURRENT_TERMS_VERSION ||
      body.privacyVersion !== CURRENT_PRIVACY_VERSION
    ) {
      return {
        success: false,
        error: {
          code: 'VERSION_MISMATCH',
          message: 'Versão dos termos não corresponde à versão atual.',
        },
      }
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
      success: true,
      data: {
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
        acceptedAt: now.toISOString(),
      },
    }
  })
}
