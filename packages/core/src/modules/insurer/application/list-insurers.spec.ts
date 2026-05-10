import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ListInsurers } from './list-insurers.js'
import type {
  InsurerFilters,
  InsurerRepository,
  InsurerSortField,
} from '../domain/insurer-repository.js'
import type { CursorPage } from '../../client/domain/client-repository.js'

describe('ListInsurers', () => {
  let repo: InsurerRepository
  let useCase: ListInsurers
  beforeEach(() => {
    repo = {
      create: vi.fn(),
      findById: vi.fn(),
      findByName: vi.fn(),
      findMany: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
      update: vi.fn(),
    }
    useCase = new ListInsurers(repo)
  })
  it('passes sortBy=name asc through to the repository', async () => {
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<InsurerSortField> = {
      limit: 10,
      sortBy: 'name',
      sortOrder: 'asc',
    }
    await useCase.execute(filters, page)
    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ sortBy: 'name', sortOrder: 'asc' })
    )
  })
  it('passes sortBy=code asc through to the repository', async () => {
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<InsurerSortField> = {
      limit: 10,
      sortBy: 'code',
      sortOrder: 'asc',
    }
    await useCase.execute(filters, page)
    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ sortBy: 'code', sortOrder: 'asc' })
    )
  })
  it('passes sortBy=active desc through to the repository', async () => {
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<InsurerSortField> = {
      limit: 10,
      sortBy: 'active',
      sortOrder: 'desc',
    }
    await useCase.execute(filters, page)
    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ sortBy: 'active', sortOrder: 'desc' })
    )
  })
  it('passes sortBy=updatedAt desc through to the repository', async () => {
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<InsurerSortField> = {
      limit: 10,
      sortBy: 'updatedAt',
      sortOrder: 'desc',
    }
    await useCase.execute(filters, page)
    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ sortBy: 'updatedAt', sortOrder: 'desc' })
    )
  })
  it('passes undefined sortBy through to the repository (default passthrough)', async () => {
    const filters: InsurerFilters = { organizationId: 'org-1' }
    const page: CursorPage<InsurerSortField> = { limit: 10 }
    await useCase.execute(filters, page)
    expect(repo.findMany).toHaveBeenCalledWith(
      filters,
      expect.objectContaining({ limit: 10 })
    )
  })
})
