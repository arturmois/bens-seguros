'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Table } from '@/components/ui/table';

import type { AssistanceStatus } from '../types';
import { useAssistances } from '../hooks/use-assistances';
import { AssistancesPagination } from './assistances-pagination';
import { AssistancesTableBody, AssistancesTableHeader } from './assistances-table-rows';
import { AssistancesToolbar } from './assistances-toolbar';

export function AssistancesTable() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [cursors, setCursors] = useState<string[]>([]);

  const currentCursor = cursors.at(-1);

  const { data, isLoading, isError, refetch } = useAssistances({
    status: statusFilter === 'ALL' ? undefined : (statusFilter as AssistanceStatus),
    cursor: currentCursor,
  });

  function handleRowClick(id: string) {
    router.push(`/assistances/${id}`);
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value);
    setCursors([]);
  }

  function handleNextPage() {
    if (data?.meta.nextCursor) {
      setCursors((prev) => [...prev, data.meta.nextCursor!]);
    }
  }

  function handlePreviousPage() {
    setCursors((prev) => prev.slice(0, -1));
  }

  if (isError) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-md border">
        <p className="text-destructive text-sm">Erro ao carregar assistências.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AssistancesToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
      />

      <div className="rounded-md border">
        <Table>
          <AssistancesTableHeader />
          <AssistancesTableBody
            data={data?.data}
            isLoading={isLoading}
            onRowClick={handleRowClick}
          />
        </Table>
      </div>

      <AssistancesPagination
        total={data?.meta.total ?? 0}
        hasNextPage={Boolean(data?.meta.nextCursor)}
        hasPreviousPage={cursors.length > 0}
        onNext={handleNextPage}
        onPrevious={handlePreviousPage}
      />
    </div>
  );
}
