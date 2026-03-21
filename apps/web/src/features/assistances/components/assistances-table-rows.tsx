'use client';

import { LifeBuoy, MoreHorizontal } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu';

import type { AssistanceData } from '../types';
import { ASSISTANCE_TYPE_LABELS } from '../lib/constants';
import { AssistanceStatusBadge } from './assistance-status-badge';

const COLUMN_COUNT = 7;

export function AssistancesTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Tipo</TableHead>
        <TableHead>Cliente</TableHead>
        <TableHead className="hidden md:table-cell">Apolice</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden sm:table-cell">Data Solicitacao</TableHead>
        <TableHead className="hidden lg:table-cell">Endereco</TableHead>
        <TableHead className="w-12" />
      </TableRow>
    </TableHeader>
  );
}

export function AssistancesTableBody({
  data,
  isLoading,
  onRowClick,
}: {
  readonly data: readonly AssistanceData[] | undefined;
  readonly isLoading: boolean;
  readonly onRowClick: (id: string) => void;
}) {
  return (
    <TableBody>
      {isLoading && <LoadingRows />}
      {!isLoading && data?.length === 0 && <EmptyRow />}
      {!isLoading &&
        data?.map((assistance) => (
          <AssistanceRow
            key={assistance.id}
            assistance={assistance}
            onClick={() => onRowClick(assistance.id)}
          />
        ))}
    </TableBody>
  );
}

function AssistanceRow({
  assistance,
  onClick,
}: {
  readonly assistance: AssistanceData;
  readonly onClick: () => void;
}) {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(assistance.requestedAt));

  return (
    <TableRow
      className="cursor-pointer"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <TableCell className="font-medium">{ASSISTANCE_TYPE_LABELS[assistance.type]}</TableCell>
      <TableCell>{assistance.clientName ?? '-'}</TableCell>
      <TableCell className="hidden md:table-cell">{assistance.policyNumber ?? '-'}</TableCell>
      <TableCell>
        <AssistanceStatusBadge status={assistance.status} />
      </TableCell>
      <TableCell className="hidden sm:table-cell">{formattedDate}</TableCell>
      <TableCell className="hidden max-w-xs truncate lg:table-cell">
        {assistance.address ?? '-'}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="hover:bg-accent inline-flex h-10 w-10 items-center justify-center rounded-md"
            aria-haspopup="menu"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Acoes da assistencia</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Ver detalhes
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={`skeleton-${String(i)}`}>
          {Array.from({ length: COLUMN_COUNT }).map((_, j) => (
            <TableCell key={`skeleton-${String(i)}-${String(j)}`}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyRow() {
  return (
    <TableRow>
      <TableCell colSpan={COLUMN_COUNT} className="h-48 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <LifeBuoy className="text-muted-foreground size-10" />
          <div>
            <p className="font-medium">Nenhuma assistencia encontrada</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Registre sua primeira assistencia para comecar.
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
