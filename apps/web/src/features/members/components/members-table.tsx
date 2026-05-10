'use client'

import type { SortingState, VisibilityState } from '@tanstack/react-table'
import {
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Users } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { ReactNode } from 'react'

import { ConfirmDeleteDialog } from '@/components/shared/confirm-delete-dialog'
import { DataTable } from '@/components/shared/data-table'
import type { FilterValue } from '@/components/shared/filter-types'
import { MobileCardList } from '@/components/shared/mobile-card-list'
import { TableErrorState } from '@/components/shared/table-error-state'
import { UnifiedFilterBar } from '@/components/shared/unified-filter-bar'
import { useDebounce } from '@/hooks/use-debounce'

import { useMembers, useRemoveMember } from '../hooks/use-members'
import { useMembersFilters } from '../hooks/use-members-filters'
import {
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_SORTING,
  HIDEABLE_COLUMNS,
} from '../lib/constants'
import {
  MEMBER_FILTERS,
  matchesActive,
  matchesRole,
  matchesSearch,
} from '../lib/filters'
import type { MemberData } from '../types'
import { MemberCard } from './member-card'
import { createMemberColumns } from './members-columns'

interface MembersTableProps {
  readonly canManage: boolean
  readonly currentUserId: string
  readonly currentUserRole: string
  readonly headerAction?: ReactNode
}

function canActOnMember(
  canManage: boolean,
  currentUserId: string,
  member: MemberData
): boolean {
  if (!canManage) return false
  if (member.userId === currentUserId) return false
  if (member.role === 'OWNER') return false
  return true
}

export function MembersTable({
  canManage,
  currentUserId,
  currentUserRole,
  headerAction,
}: MembersTableProps) {
  'use no memo'
  const { data, isLoading, isError, refetch } = useMembers()
  const removeMember = useRemoveMember()
  const filters = useMembersFilters()
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    DEFAULT_COLUMN_VISIBILITY
  )
  const [memberToRemove, setMemberToRemove] = useState<MemberData | null>(null)
  const debouncedSearch = useDebounce(filters.search, 300)
  const members = useMemo<MemberData[]>(() => {
    const list = data ?? []
    return list.filter(
      (member) =>
        matchesActive(member, filters.active) &&
        matchesRole(member, filters.roleIn) &&
        matchesSearch(member, debouncedSearch)
    )
  }, [data, filters.active, filters.roleIn, debouncedSearch])
  const columnActions = useMemo(
    () => ({
      canAct: (member: MemberData) =>
        canActOnMember(canManage, currentUserId, member),
      currentUserRole,
      onRemove: (member: MemberData) => setMemberToRemove(member),
    }),
    [canManage, currentUserId, currentUserRole]
  )
  const columns = useMemo(
    () => createMemberColumns(columnActions),
    [columnActions]
  )
  const table = useReactTable({
    data: members,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  function handleFilterChange(key: string, value: FilterValue) {
    filters.setFilter(key, value)
  }
  function handleColumnToggle(id: string, visible: boolean) {
    setColumnVisibility((prev) => ({ ...prev, [id]: visible }))
  }
  function handleConfirmRemove() {
    if (!memberToRemove) return
    removeMember.mutate(memberToRemove.id, {
      onSuccess: () => setMemberToRemove(null),
    })
  }
  const totalMembers = data?.length ?? 0
  const emptyMessage =
    totalMembers === 0 ? 'Convide sua equipe!' : 'Nenhum membro encontrado'
  const emptyDescription =
    totalMembers === 0
      ? 'Adicione membros para colaborar na gestão da sua corretora.'
      : 'Ajuste a busca ou os filtros para encontrar um membro existente.'
  if (isError) {
    return (
      <TableErrorState message="Erro ao carregar membros." onRetry={refetch} />
    )
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <UnifiedFilterBar
        searchValue={filters.search}
        onSearchChange={filters.setSearch}
        searchPlaceholder="Buscar membros..."
        filters={MEMBER_FILTERS}
        values={filters.values}
        onFilterChange={handleFilterChange}
        onClearAll={filters.clearAll}
        columnVisibility={columnVisibility}
        onColumnVisibilityChange={handleColumnToggle}
        hideableColumns={HIDEABLE_COLUMNS}
      >
        {headerAction}
      </UnifiedFilterBar>
      <DataTable
        table={table}
        isLoading={isLoading}
        emptyIcon={<Users className="text-muted-foreground/50 size-10" />}
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        columnVisibility={columnVisibility}
      />
      <MobileCardList
        data={members}
        keyExtractor={(member) => member.id}
        isLoading={isLoading}
        emptyIcon={<Users className="text-muted-foreground/50 size-10" />}
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        renderCard={(member) => (
          <MemberCard
            member={member}
            canAct={canActOnMember(canManage, currentUserId, member)}
            currentUserRole={currentUserRole}
            onRemove={(m) => setMemberToRemove(m)}
          />
        )}
      />
      <ConfirmDeleteDialog
        entityLabel="membro"
        open={memberToRemove !== null}
        onOpenChange={(open) => {
          if (!open) setMemberToRemove(null)
        }}
        onConfirm={handleConfirmRemove}
        isPending={removeMember.isPending}
      />
    </div>
  )
}
