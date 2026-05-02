export type SortOrder = 'asc' | 'desc'

export interface CursorPage<TSortBy extends string = string> {
  cursor?: string
  limit: number
  sortBy?: TSortBy
  sortOrder?: SortOrder
}

export interface Page<TItem> {
  items: TItem[]
  total?: number
  nextCursor: string | null
}
