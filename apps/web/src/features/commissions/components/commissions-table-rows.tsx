'use client';

import { DollarSign } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/formatters';

import type { CommissionData } from '../types';
import { CommissionStatusBadge } from './commission-status-badge';

const COLUMN_COUNT = 8;

export function CommissionsTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Vendedor</TableHead>
        <TableHead className="hidden md:table-cell">Apólice</TableHead>
        <TableHead className="hidden lg:table-cell">Cliente</TableHead>
        <TableHead className="hidden text-right sm:table-cell">Prêmio</TableHead>
        <TableHead className="text-right">%</TableHead>
        <TableHead className="text-right">Valor (R$)</TableHead>
        <TableHead>Status</TableHead>
        <TableHead className="hidden lg:table-cell">Data</TableHead>
      </TableRow>
    </TableHeader>
  );
}

export function CommissionsTableBody({
  data,
  isLoading,
  onRowClick,
}: {
  readonly data: readonly CommissionData[] | undefined;
  readonly isLoading: boolean;
  readonly onRowClick: (id: string) => void;
}) {
  return (
    <TableBody>
      {isLoading && <LoadingRows />}
      {!isLoading && data?.length === 0 && <EmptyRow />}
      {!isLoading &&
        data?.map((commission) => (
          <CommissionRow
            key={commission.id}
            commission={commission}
            onClick={() => onRowClick(commission.id)}
          />
        ))}
    </TableBody>
  );
}

function CommissionRow({
  commission,
  onClick,
}: {
  readonly commission: CommissionData;
  readonly onClick: () => void;
}) {
  const percentageDisplay = `${(commission.percentageInBasisPoints / 100).toFixed(1)}%`;

  return (
    <TableRow
      className="cursor-pointer"
      tabIndex={0}
      aria-label={`Ver comissão de ${commission.salespersonName ?? commission.salespersonId}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <TableCell className="font-medium">{commission.salespersonName ?? '-'}</TableCell>
      <TableCell className="hidden md:table-cell">{commission.policyNumber ?? '-'}</TableCell>
      <TableCell className="hidden lg:table-cell">{commission.clientName ?? '-'}</TableCell>
      <TableCell className="hidden text-right sm:table-cell">
        {formatCurrency(commission.premiumValueInCents)}
      </TableCell>
      <TableCell className="text-right">{percentageDisplay}</TableCell>
      <TableCell className="text-right font-medium">
        {formatCurrency(commission.commissionValueInCents)}
      </TableCell>
      <TableCell>
        <CommissionStatusBadge status={commission.status} />
      </TableCell>
      <TableCell className="hidden lg:table-cell">{formatDate(commission.createdAt)}</TableCell>
    </TableRow>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
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
          <DollarSign aria-hidden="true" className="text-muted-foreground size-10" />
          <div>
            <p className="font-medium">Nenhuma comissão encontrada</p>
            <p className="text-muted-foreground mt-1 text-sm">
              As comissões serão criadas automaticamente ao emitir apólices.
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
