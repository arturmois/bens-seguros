import type { PrismaClient } from '@repo/db'
import { inject, injectable } from 'tsyringe'
import type {
  OrganizationData,
  OrganizationRepository,
  UpdateOrganizationData,
} from '../domain/organization-repository.js'
import { OrganizationNotFoundError } from '../domain/organization-errors.js'

@injectable()
export class PrismaOrganizationRepository implements OrganizationRepository {
  constructor(@inject('PrismaClient') private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<OrganizationData | null> {
    const row = await this.prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        createdAt: true,
      },
    })
    return row
  }

  async update(
    id: string,
    data: UpdateOrganizationData
  ): Promise<OrganizationData> {
    return this.prisma.organization.update({
      where: { id },
      data: { name: data.name, slug: data.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        createdAt: true,
      },
    })
  }

  async updateLogo(id: string, logoKey: string): Promise<OrganizationData> {
    return this.prisma.organization.update({
      where: { id },
      data: { logo: logoKey },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        createdAt: true,
      },
    })
  }

  async slugTakenByAnother(
    currentOrganizationId: string,
    slug: string
  ): Promise<boolean> {
    const conflicting = await this.prisma.organization.findFirst({
      where: { slug, id: { not: currentOrganizationId } },
      select: { id: true },
    })
    return conflicting !== null
  }

  async getCurrentLogo(id: string): Promise<string | null> {
    const row = await this.prisma.organization.findUnique({
      where: { id },
      select: { logo: true },
    })
    if (!row) {
      throw new OrganizationNotFoundError(id)
    }
    return row.logo
  }
}
