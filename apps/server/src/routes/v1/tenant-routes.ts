import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@repo/db';

interface OrganizationData {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

interface MemberWithOrganization {
  role: string;
  organization: OrganizationData;
}

const tenantResponseSchema = z.object({
  success: z.literal(true),
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      logo: z.string().nullable(),
      role: z.string(),
    }),
  ),
});

export async function tenantRoutes(app: FastifyInstance) {
  app.get(
    '/api/v1/tenants',
    {
      schema: {
        response: {
          200: tenantResponseSchema,
        },
      },
    },
    async (request) => {
      const members: MemberWithOrganization[] = await prisma.member.findMany({
        where: { userId: request.user.id, active: true },
        include: { organization: true },
      });

      return {
        success: true as const,
        data: members.map((member) => ({
          id: member.organization.id,
          name: member.organization.name,
          slug: member.organization.slug,
          logo: member.organization.logo,
          role: member.role,
        })),
      };
    },
  );
}
