import { injectable, inject } from 'tsyringe'
import type { CursorPage, Page } from '../../client/domain/client-repository.js'
import type {
  InsurerRepository,
  InsurerData,
  InsurerFilters,
  InsurerSortField,
} from '../domain/insurer-repository.js'

@injectable()
export class ListInsurers {
  constructor(
    @inject('InsurerRepository') private readonly insurerRepo: InsurerRepository
  ) {}

  async execute(
    filters: InsurerFilters,
    page: CursorPage<InsurerSortField>
  ): Promise<Page<InsurerData>> {
    return this.insurerRepo.findMany(filters, page)
  }
}
