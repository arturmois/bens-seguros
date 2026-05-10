import { inject, injectable } from 'tsyringe'
import type { SearchRepository } from '../domain/search-repository.js'
import type { GlobalSearchResult } from '../domain/search-result.js'

@injectable()
export class GlobalSearch {
  constructor(
    @inject('SearchRepository') private readonly searchRepo: SearchRepository
  ) {}

  async execute(
    organizationId: string,
    query: string,
    limit: number
  ): Promise<GlobalSearchResult> {
    const perEntityLimit = Math.ceil(limit / 4)
    return this.searchRepo.globalSearch(organizationId, query, perEntityLimit)
  }
}
