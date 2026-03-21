'use client';

import { FileWarning, MoreHorizontal } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu';

import type { ClaimData } from '../types';
import { formatClaimNumber } from '../lib/constants';
import { ClaimPriorityBadge } from './claim-priority-badge';
import { ClaimStatusBadge } from './claim-status-badge';

const COLUMN_COUNT = 7;

export function ClaimsTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Sinistro</TableHead>
        <TableHead>Cliente</TableHead>
        <TableHead className="hidden md:table-cell">Apolice</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden sm:table-cell">Prioridade</TableHead>
        <TableHead className="hidden lg:table-cell">Data Registro</TableHead>
        <TableHead className="w-12" />
      </TableRow>
    </TableHeader>
  );
}

export function ClaimsTableBody({
  data,
  isLoading,
  onRowClick,
  onDelete,
}: {
  readonly data: readonly ClaimData[] | undefined;
  readonly isLoading: boolean;
  readonly onRowClick: (id: string) => void;
  readonly onDelete: (id: string) => void;
}) {
  return (
    <TableBody>
      {isLoading && <LoadingRows />}
      {!isLoading && data?.length === 0 && <EmptyRow />}
      {!isLoading &&
        data?.map((claim) => (
          <ClaimRow
            key={claim.id}
            claim={claim}
            onClick={() => onRowClick(claim.id)}
            onDelete={() => onDelete(claim.id)}
          />
        ))}
    </TableBody>
  );
}

function ClaimRow({
  claim,
  onClick,
  onDelete,
}: {
  readonly claim: ClaimData;
  readonly onClick: () => void;
  readonly onDelete: () => void;
}) {
  const formattedNumber = formatClaimNumber(claim.claimNumber, claim.createdAt);
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(claim.reportedAt));

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
      <TableCell className="font-medium">{formattedNumber}</TableCell>
      <TableCell>{claim.clientName ?? '-'}</TableCell>
      <TableCell className="hidden md:table-cell">{claim.policyNumber ?? '-'}</TableCell>
      <TableCell>
        <ClaimStatusBadge status={claim.status} />
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <ClaimPriorityBadge priority={claim.priority} />
      </TableCell>
      <TableCell className="hidden lg:table-cell">{formattedDate}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="hover:bg-accent inline-flex h-10 w-10 items-center justify-center rounded-md"
            aria-haspopup="menu"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Acoes do sinistro {formattedNumber}</span>
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
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              Excluir
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
          <FileWarning className="text-muted-foreground size-10" />
          <div>
            <p className="font-medium">Nenhum sinistro encontrado</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Registre seu primeiro sinistro para comecar.
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
