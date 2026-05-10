export type { SearchRepository } from './domain/search-repository.js'
export type {
  ClientSearchHit,
  ClaimSearchHit,
  GlobalSearchResult,
  PolicySearchHit,
  ProposalSearchHit,
} from './domain/search-result.js'

export { GlobalSearch } from './application/global-search.js'

export { PrismaSearchRepository } from './infrastructure/prisma-search-repository.js'
