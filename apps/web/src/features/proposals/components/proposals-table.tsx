'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import { formatCurrency, formatDate } from '@/lib/formatters';

import { useAdvanceProposal, useProposals, useRevertProposal } from '../hooks/use-proposals';
import type { BoardType, ProposalData, ProposalStage } from '../types';
import {
  BOARD_TYPE_LABELS,
  BOARD_TYPES,
  BRANCH_LABELS,
  STAGE_BADGE_VARIANT,
  STAGE_LABELS,
  STAGES,
} from '../types';
import { LostReasonDialog } from './lost-reason-dialog';
import { ProposalActionButtons } from './proposal-action-buttons';
import { ProposalsEmptyState, ProposalsTableSkeleton } from './proposals-table-parts';

const ALL_VALUE = '__all__';

export function ProposalsTable() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>(ALL_VALUE);
  const [boardTypeFilter, setBoardTypeFilter] = useState<string>(ALL_VALUE);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [lostDialogProposalId, setLostDialogProposalId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const filters = {
    search: debouncedSearch || undefined,
    stage: stageFilter !== ALL_VALUE ? (stageFilter as ProposalStage) : undefined,
    boardType: boardTypeFilter !== ALL_VALUE ? (boardTypeFilter as BoardType) : undefined,
    cursor,
    limit: 20,
  };

  const { data, isLoading, isError } = useProposals(filters);
  const advanceMutation = useAdvanceProposal();
  const revertMutation = useRevertProposal();

  const handleRowClick = useCallback(
    (id: string) => {
      router.push(`/proposals/${id}`);
    },
    [router],
  );

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-destructive text-sm">Erro ao carregar propostas. Tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar propostas..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCursor(undefined);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={stageFilter}
          onValueChange={(v) => {
            if (v !== null) setStageFilter(v);
            setCursor(undefined);
          }}
          items={[
            { value: ALL_VALUE, label: 'Todos' },
            ...STAGES.map((s) => ({ value: s, label: STAGE_LABELS[s] })),
          ]}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos</SelectItem>
            {STAGES.map((s) => (
              <SelectItem key={s} value={s}>
                {STAGE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={boardTypeFilter}
          onValueChange={(v) => {
            if (v !== null) setBoardTypeFilter(v);
            setCursor(undefined);
          }}
          items={[
            { value: ALL_VALUE, label: 'Todos' },
            ...BOARD_TYPES.map((bt) => ({ value: bt, label: BOARD_TYPE_LABELS[bt] })),
          ]}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>Todos</SelectItem>
            {BOARD_TYPES.map((bt) => (
              <SelectItem key={bt} value={bt}>
                {BOARD_TYPE_LABELS[bt]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => router.push('/proposals/new')}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Proposta
        </Button>
      </div>

      {isLoading ? (
        <ProposalsTableSkeleton />
      ) : (
        <>
          {!data?.data.length ? (
            <ProposalsEmptyState />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Ramo</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((proposal: ProposalData) => (
                    <TableRow
                      key={proposal.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(proposal.id)}
                    >
                      <TableCell className="font-medium">{proposal.clientId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{BRANCH_LABELS[proposal.branch]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STAGE_BADGE_VARIANT[proposal.stage]}>
                          {STAGE_LABELS[proposal.stage]}
                        </Badge>
                      </TableCell>
                      <TableCell>{BOARD_TYPE_LABELS[proposal.boardType]}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(proposal.premiumValueInCents)}
                      </TableCell>
                      <TableCell>{formatDate(proposal.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ProposalActionButtons
                            stage={proposal.stage}
                            onAdvance={() => advanceMutation.mutate(proposal.id)}
                            onRevert={() => revertMutation.mutate(proposal.id)}
                            onLost={() => setLostDialogProposalId(proposal.id)}
                            isAdvancing={advanceMutation.isPending}
                            isReverting={revertMutation.isPending}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {data?.meta.hasMore && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => setCursor(data.meta.nextCursor ?? undefined)}
              >
                Carregar mais
              </Button>
            </div>
          )}
        </>
      )}

      <LostReasonDialog
        proposalId={lostDialogProposalId}
        onClose={() => setLostDialogProposalId(null)}
      />
    </div>
  );
}
