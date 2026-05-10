import { inject, injectable } from 'tsyringe'
import { cacheAside } from '../../../shared/cache-aside.js'
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
    return cacheAside(
      this.cache,
      `cache:${input.organizationId}:members`,
      MEMBER_LIST_CACHE_TTL_SECONDS,
      () =>
        this.memberRepo.listActive(input.organizationId, {
          limit: input.limit,
        })
    )
  }
}
