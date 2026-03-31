import { z } from 'zod'

import { META_GRAPH_API } from './channel-meta-service'

const instagramAccountSchema = z.object({
  id: z.string(),
})

const pageSchema = z.object({
  id: z.string(),
  name: z.string(),
  access_token: z.string(),
  instagram_business_account: instagramAccountSchema.optional(),
})

const pagesResponseSchema = z.object({
  data: z.array(pageSchema),
  paging: z
    .object({
      cursors: z
        .object({
          before: z.string().optional(),
          after: z.string().optional(),
        })
        .optional(),
      next: z.string().optional(),
    })
    .optional(),
})

export interface MetaPage {
  id: string
  name: string
  accessToken: string
  instagramBusinessAccountId: string | null
}

export interface MetaAsset {
  pageId: string
  pageName: string
  hasInstagram: boolean
  instagramAccountId: string | null
  instagramUsername?: string | null
}

export async function fetchUserPages(
  userAccessToken: string
): Promise<MetaPage[]> {
  const fields = 'id,name,access_token,instagram_business_account'
  const url = `${META_GRAPH_API}/me/accounts?fields=${fields}&access_token=${userAccessToken}&limit=100`

  const response = await fetch(url)
  const raw: unknown = await response.json()

  if (!response.ok) {
    throw new Error('Failed to fetch user pages from Meta')
  }

  const parsed = pagesResponseSchema.parse(raw)

  return parsed.data.map((page) => ({
    id: page.id,
    name: page.name,
    accessToken: page.access_token,
    instagramBusinessAccountId: page.instagram_business_account?.id ?? null,
  }))
}

export function mapPagesToAssets(pages: MetaPage[]): MetaAsset[] {
  return pages.map((page) => ({
    pageId: page.id,
    pageName: page.name,
    hasInstagram: page.instagramBusinessAccountId !== null,
    instagramAccountId: page.instagramBusinessAccountId,
  }))
}

export async function getInstagramUsername(
  instagramAccountId: string,
  pageAccessToken: string
): Promise<string | null> {
  const url = `${META_GRAPH_API}/${instagramAccountId}?fields=username&access_token=${pageAccessToken}`
  const response = await fetch(url)

  if (!response.ok) return null

  const data = (await response.json()) as Record<string, unknown>
  const username = data['username']
  return typeof username === 'string' ? username : null
}
