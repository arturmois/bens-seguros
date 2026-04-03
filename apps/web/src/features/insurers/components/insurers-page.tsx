'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Building2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { useDebounce } from '@/hooks/use-debounce'

import {
  type InsurerItem,
  type InsurerStatusFilter,
  useInsurers,
  useUpdateInsurerMutation,
} from '../hooks/use-insurers'
import { InsurerFormSheet } from './insurer-form-sheet'
import { InsurersTable, InsurersTableSkeleton } from './insurers-table'
import { InsurersTableToolbar } from './insurers-table-toolbar'

export function InsurersPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<InsurerStatusFilter>('ACTIVE')
  const [editingInsurer, setEditingInsurer] = useState<InsurerItem | undefined>(
    undefined
  )
  const [formOpen, setFormOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 300)
  const updateInsurer = useUpdateInsurerMutation()

  const activeFilter = useMemo(() => {
    if (status === 'ALL') return undefined
    return status === 'ACTIVE'
  }, [status])

  const { data, isLoading, isError, refetch } = useInsurers({
    active: activeFilter,
    search: debouncedSearch || undefined,
  })

  const insurers = data?.data ?? []

  function handleCreate() {
    setEditingInsurer(undefined)
    setFormOpen(true)
  }

  function handleEdit(insurer: InsurerItem) {
    setEditingInsurer(insurer)
    setFormOpen(true)
  }

  function handleToggleActive(insurer: InsurerItem) {
    updateInsurer.mutate({
      id: insurer.id,
      body: {
        name: insurer.name,
        code: insurer.code ?? '',
        active: !insurer.active,
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Seguradoras</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie as seguradoras disponíveis para propostas, apólices e
          sinistros.
        </p>
      </div>

      <InsurersTableToolbar
        search={search}
        status={status}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        onCreate={handleCreate}
      />

      {isLoading ? (
        <InsurersTableSkeleton />
      ) : isError ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertTriangle />
            </EmptyMedia>
            <EmptyTitle>Erro ao carregar seguradoras</EmptyTitle>
            <EmptyDescription>
              Não foi possível carregar o cadastro. Tente novamente.
            </EmptyDescription>
          </EmptyHeader>
          <Button variant="outline" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </Empty>
      ) : insurers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>
              {debouncedSearch || status !== 'ACTIVE'
                ? 'Nenhuma seguradora encontrada'
                : 'Nenhuma seguradora cadastrada'}
            </EmptyTitle>
            <EmptyDescription>
              {debouncedSearch || status !== 'ACTIVE'
                ? 'Ajuste a busca ou os filtros para encontrar um cadastro existente.'
                : 'Cadastre a primeira seguradora para liberar a operação.'}
            </EmptyDescription>
          </EmptyHeader>
          {!debouncedSearch && status === 'ACTIVE' && (
            <Button onClick={handleCreate}>
              Cadastrar primeira seguradora
            </Button>
          )}
        </Empty>
      ) : (
        <InsurersTable
          insurers={insurers}
          onEdit={handleEdit}
          onToggleActive={handleToggleActive}
        />
      )}

      <InsurerFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        insurer={editingInsurer}
      />
    </div>
  )
}
