import type { SortingState, VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useDebounce } from '@/hooks/use-debounce'
import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import type { ListProposalsSortBy, ListProposalsSortOrder } from '@/api/model'

import { useAdvanceProposal, useProposals } from './use-proposals'
import { useProposalsFilters } from './use-proposals-filters'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  type ProposalData,
} from '../lib/constants'
import { isProposalSortBy } from '../lib/type-guards'
import { createProposalColumns } from '../components/proposals-columns'

export function useProposalsTable() {
  const filtersHook = useProposalsFilters()
  const pagination = useCursorPagination()

  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [lostDialogProposalId, setLostDialogProposalId] = useState<
    string | null
  >(null)

  const debouncedSearch = useDebounce(filtersHook.apiParams.search, 300)
  const { mutate: advanceMutate, isPending: isAdvancing } = useAdvanceProposal()

  const filterFingerprint = JSON.stringify({
    ...filtersHook.apiParams,
    search: debouncedSearch || undefined,
  })
  const lastFingerprint = useRef(filterFingerprint)
  useEffect(() => {
    if (lastFingerprint.current === filterFingerprint) return
    lastFingerprint.current = filterFingerprint
    pagination.reset()
  }, [filterFingerprint, pagination])

  const sortId = sorting[0]?.id
  const sortBy: ListProposalsSortBy | undefined =
    sortId !== undefined && isProposalSortBy(sortId) ? sortId : undefined
  const sortOrder: ListProposalsSortOrder | undefined =
    sorting[0] !== undefined ? (sorting[0].desc ? 'desc' : 'asc') : undefined

  const { data, isLoading, isError, refetch } = useProposals({
    search: debouncedSearch || undefined,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
    sortBy,
    sortOrder,
    stageIn: filtersHook.apiParams.stageIn,
    branchIn: filtersHook.apiParams.branchIn,
    salespersonIdIn: filtersHook.apiParams.salespersonIdIn,
    createdFrom: filtersHook.apiParams.createdFrom,
    createdTo: filtersHook.apiParams.createdTo,
    updatedAtFrom: filtersHook.apiParams.updatedAtFrom,
    updatedAtTo: filtersHook.apiParams.updatedAtTo,
  })

  const proposals: ProposalData[] = useMemo(
    () => [...(data?.data ?? [])],
    [data?.data]
  )
  const nextCursor = data?.meta.nextCursor ?? null
  const knownTotal =
    (pagination.currentPage - 1) * pagination.pageSize + proposals.length

  const columnActions = useMemo(
    () => ({
      isAdvancing,
      onAdvance: (id: string) => advanceMutate(id),
      onLost: (id: string) => setLostDialogProposalId(id),
    }),
    [isAdvancing, advanceMutate]
  )

  const columns = useMemo(
    () => createProposalColumns(columnActions),
    [columnActions]
  )

  const table = useReactTable({
    data: proposals,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: (updater) => {
      setSorting(updater)
      pagination.reset()
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
  })

  function handleColumnToggle(id: string, visible: boolean) {
    setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
  }

  return {
    table,
    proposals,
    isLoading,
    isError,
    refetch,
    pagination,
    nextCursor,
    knownTotal,
    columnVisibility,
    handleColumnToggle,
    columnActions,
    lostDialogProposalId,
    setLostDialogProposalId,
  }
}
