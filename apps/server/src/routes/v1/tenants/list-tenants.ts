import { prisma } from '@repo/db'
import type { FastifyInstance } from 'fastify'
import type { ZodTypeProvider } from 'fastify-type-provider-zod'
import { errorResponse } from '../../shared/response.schema.js'
import { tenantListResponse } from './_schemas.js'

interface OrganizationData {
  id: string
  name: string
  slug: string
  logo: string | null
}

interface MemberWithOrganization {
  role: string
  organization: OrganizationData
}

export function listTenantsRoute(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: 'GET',
    url: '/api/v1/tenants',
    schema: {
      operationId: 'listTenants',
      tags: ['Tenants'],
      summary: 'List tenants for authenticated user',
      response: { 200: tenantListResponse, 401: errorResponse },
    },
    handler: async (request, reply) => {
      if (!request.user) {
        return reply.status(401).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        })
      }
      const members: MemberWithOrganization[] = await prisma.member.findMany({
        where: { userId: request.user.id, active: true },
        include: { organization: true },
      })
      return {
        success: true as const,
        data: members.map((member) => ({
          id: member.organization.id,
          name: member.organization.name,
          slug: member.organization.slug,
          logo: member.organization.logo,
          role: member.role,
        })),
      }
    },
  })
}
