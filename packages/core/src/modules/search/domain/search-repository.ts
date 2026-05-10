import type { GlobalSearchResult } from './search-result.js'

export interface SearchRepository {
  globalSearch(
    organizationId: string,
    query: string,
    perEntityLimit: number
  ): Promise<GlobalSearchResult>
}
