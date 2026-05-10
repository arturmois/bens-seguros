'use client'

import { useState } from 'react'

export interface UseCursorPaginationReturn {
  currentCursor: string | undefined
  currentPage: number
  hasPreviousPage: boolean
  goToNext: (nextCursor: string) => void
  goToPrevious: () => void
  reset: () => void
  pageSize: number
  setPageSize: (size: number) => void
}

export function useCursorPagination(
  initialPageSize = 10
): UseCursorPaginationReturn {
  const [cursors, setCursors] = useState<string[]>([])
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  return {
    currentCursor: cursors.at(-1),
    currentPage: cursors.length + 1,
    hasPreviousPage: cursors.length > 0,
    goToNext: (nextCursor: string) =>
      setCursors((prev) => [...prev, nextCursor]),
    goToPrevious: () => setCursors((prev) => prev.slice(0, -1)),
    reset: () => setCursors([]),
    pageSize,
    setPageSize: (size: number) => {
      setPageSizeState(size)
      setCursors([])
    },
  }
}
