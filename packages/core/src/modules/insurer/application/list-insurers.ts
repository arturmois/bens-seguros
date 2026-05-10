import { inject, injectable } from 'tsyringe'
import { cacheAside } from '../../../shared/cache-aside.js'
import type { CacheService } from '../../../shared/cache-service.js'
import type { CursorPage, Page } from '../../../shared/pagination.js'
import type {
  InsurerData,
  InsurerFilters,
  InsurerRepository,
  InsurerSortField,
} from '../domain/insurer-repository.js'

const INSURER_LIST_CACHE_TTL_SECONDS = 86400

function isDefaultListing(
  filters: InsurerFilters,
  page: CursorPage<InsurerSortField>
): boolean {
  return (
    filters.active === undefined &&
    filters.search === undefined &&
    page.cursor === undefined &&
    page.limit === 20 &&
    page.sortBy === 'name' &&
    page.sortOrder === 'asc'
  )
}

@injectable()
export class ListInsurers {
  constructor(
    @inject('InsurerRepository')
    private readonly insurerRepo: InsurerRepository,
    @inject('CacheService') private readonly cache: CacheService
  ) {}

  async execute(
    filters: InsurerFilters,
    page: CursorPage<InsurerSortField>
  ): Promise<Page<InsurerData>> {
    if (!isDefaultListing(filters, page)) {
      return this.insurerRepo.findMany(filters, page)
    }
    return cacheAside(
      this.cache,
      `cache:${filters.organizationId}:insurers`,
      INSURER_LIST_CACHE_TTL_SECONDS,
      () => this.insurerRepo.findMany(filters, page)
    )
  }
}
