import type { SortingState, VisibilityState } from '@tanstack/react-table'
import { getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { useCursorPagination } from '@/hooks/use-cursor-pagination'
import { useDebounce } from '@/hooks/use-debounce'
import type {
  ListProposalsParams,
  ListProposalsSortBy,
  ListProposalsSortOrder,
} from '@/api/model'

import { useAdvanceProposal, useProposals } from './use-proposals'
import {
  ALL_FILTER_VALUE,
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  STAGES,
  type BoardType,
  type ProposalData,
} from '../lib/constants'
import { resolveBoardTypeParam, resolveStageParam } from '../lib/filter-helpers'
import { isProposalSortBy } from '../lib/type-guards'
import { createProposalColumns } from '../components/proposals-columns'

export function useProposalsTable(allowedBoardTypes: readonly BoardType[]) {
  const searchParams = useSearchParams()
  const pagination = useCursorPagination()

  const urlStages = searchParams.get('stages')
  const urlUpdatedAtFrom = searchParams.get('updatedAtFrom')
  const urlUpdatedAtTo = searchParams.get('updatedAtTo')

  const validStages = urlStages
    ? urlStages
        .split(',')
        .filter((s) => (STAGES as readonly string[]).includes(s))
    : []

  const updatedAtFromParam = urlUpdatedAtFrom ?? undefined
  const updatedAtToParam = urlUpdatedAtTo ?? undefined

  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>(ALL_FILTER_VALUE)
  const [boardTypeFilter, setBoardTypeFilter] = useState(ALL_FILTER_VALUE)
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [lostDialogProposalId, setLostDialogProposalId] = useState<
    string | null
  >(null)

  const debouncedSearch = useDebounce(search, 300)
  const { mutate: advanceMutate, isPending: isAdvancing } = useAdvanceProposal()

  const stageParam = resolveStageParam(stageFilter)
  const boardTypeParam = resolveBoardTypeParam(
    boardTypeFilter,
    allowedBoardTypes
  )

  const sortId = sorting[0]?.id
  const sortBy: ListProposalsSortBy | undefined =
    sortId !== undefined && isProposalSortBy(sortId) ? sortId : undefined
  const sortOrder: ListProposalsSortOrder | undefined =
    sorting[0] !== undefined ? (sorting[0].desc ? 'desc' : 'asc') : undefined

  const { data, isLoading, isError, refetch } = useProposals({
    search: debouncedSearch || undefined,
    stage: stageParam,
    boardType: boardTypeParam,
    cursor: pagination.currentCursor,
    limit: pagination.pageSize,
    sortBy,
    sortOrder,
    updatedAtFrom: updatedAtFromParam,
    updatedAtTo: updatedAtToParam,
    // Orval generates an impossible intersection type `string & ProposalStage[]` for
    // CSV params (backend uses z.string().transform(split).pipe(array)). The cast
    // bridges our validated `string[]` to that generated type; runtime behavior is
    // correct (array serializes to comma-separated string the backend expects).
    ...(validStages.length > 0 && {
      stages: validStages as ListProposalsParams['stages'],
    }),
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

  function withReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      pagination.reset()
    }
  }

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
    search,
    setSearch: withReset(setSearch),
    stageFilter,
    setStageFilter: withReset(setStageFilter),
    boardTypeFilter,
    setBoardTypeFilter: withReset(setBoardTypeFilter),
    columnVisibility,
    handleColumnToggle,
    columnActions,
    debouncedSearch,
    stageParam,
    boardTypeParam,
    lostDialogProposalId,
    setLostDialogProposalId,
  }
}
