import { randomBytes } from 'node:crypto'

import type { Auth } from '@repo/auth'
import {
  createOrgWithTrial,
  PlanNotFoundError,
  type CreateOrgWithTrialDeps,
} from '@repo/core'
import { prismaAdmin } from '@repo/db'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import pino from 'pino'

import {
  completeOnboardingBody,
  completeOnboardingResponse,
  errorResponse,
} from './_schemas.js'

const logger = pino({ name: 'onboarding-complete' })

const SLUG_MAX_LENGTH = 50
const SLUG_SUFFIX_BYTES = 3 // 6 hex chars

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH - SLUG_SUFFIX_BYTES * 2 - 1)
  const suffix = randomBytes(SLUG_SUFFIX_BYTES).toString('hex')
  return base ? `${base}-${suffix}` : `org-${suffix}`
}

function buildAuthHeaders(req: FastifyRequest): Headers {
  const headers = new Headers()
  const cookie = req.headers.cookie
  if (cookie) headers.set('cookie', cookie)
  return headers
}

export function completeOnboardingRoute(app: FastifyInstance, auth: Auth) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'POST',
    url: '/api/v1/onboarding/complete',
    schema: {
      operationId: 'completeOnboarding',
      tags: ['Onboarding'],
      summary:
        'Cria organização + subscription TRIALING 14d após signup (Fase 7A)',
      body: completeOnboardingBody,
      response: {
        200: completeOnboardingResponse,
        400: errorResponse,
        401: errorResponse,
        404: errorResponse,
      },
    },
    handler: async (request, reply) => {
      const userId = request.user?.id
      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Login necessário para completar o cadastro',
          },
        })
      }

      const { orgName, planSlug } = request.body

      const deps: CreateOrgWithTrialDeps = {
        createOrganization: async ({ name, ownerUserId }) => {
          const slug = slugify(name)
          const result = await auth.api.createOrganization({
            body: { name, slug, userId: ownerUserId },
            headers: buildAuthHeaders(request),
          })
          return { id: result.id }
        },
        findPlanBySlug: async (slug) => {
          const p = await prismaAdmin.plan.findUnique({
            where: { slug },
            select: { id: true, slug: true, active: true },
          })
          return p && p.active ? { id: p.id, slug: p.slug } : null
        },
        createSubscription: async (input) =>
          prismaAdmin.subscription.create({
            data: input,
            select: { id: true },
          }),
        now: () => new Date(),
        logger,
      }

      try {
        const result = await createOrgWithTrial(deps, {
          ownerUserId: userId,
          orgName,
          planSlug,
        })
        return reply.code(200).send({
          success: true,
          data: {
            organizationId: result.organizationId,
            subscriptionId: result.subscriptionId,
            redirectTo: '/dashboard' as const,
          },
        })
      } catch (err) {
        if (err instanceof PlanNotFoundError) {
          return reply.code(404).send({
            success: false,
            error: {
              code: 'PLAN_NOT_FOUND',
              message: `Plano "${err.slug}" não encontrado`,
            },
          })
        }
        logger.error({ err, userId, planSlug }, 'Failed to complete onboarding')
        throw err
      }
    },
  })
}
