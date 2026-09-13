export interface OrganizationData {
  id: string
  name: string
  slug: string
  logo: string | null
  createdAt: Date
}

export interface UpdateOrganizationData {
  name: string
  slug: string
}

export interface OrganizationRepository {
  findById(id: string): Promise<OrganizationData | null>
  update(id: string, data: UpdateOrganizationData): Promise<OrganizationData>
  updateLogo(id: string, logoKey: string): Promise<OrganizationData>
  slugTakenByAnother(
    currentOrganizationId: string,
    slug: string
  ): Promise<boolean>
  getCurrentLogo(id: string): Promise<string | null>
}
