import { inject, injectable } from 'tsyringe'
import type { CacheService } from '../../../shared/cache-service.js'
import type {
  MemberListPage,
  MemberRepository,
} from '../domain/member-repository.js'

interface ListMembersInput {
  organizationId: string
  limit: number
  cursor?: string
}

const MEMBER_LIST_CACHE_TTL_SECONDS = 3600

@injectable()
export class ListMembers {
  constructor(
    @inject('MemberRepository') private readonly memberRepo: MemberRepository,
    @inject('CacheService') private readonly cache: CacheService
  ) {}

  async execute(input: ListMembersInput): Promise<MemberListPage> {
    if (input.cursor) {
      return this.memberRepo.listActive(input.organizationId, {
        limit: input.limit,
        cursor: input.cursor,
      })
    }
    const cacheKey = `cache:${input.organizationId}:members`
    const cached = await this.cache.get<MemberListPage>(cacheKey)
    if (cached) {
      return cached
    }
    const fresh = await this.memberRepo.listActive(input.organizationId, {
      limit: input.limit,
    })
    await this.cache.set(cacheKey, fresh, MEMBER_LIST_CACHE_TTL_SECONDS)
    return fresh
  }
}
