'use client';

import { FileText } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table } from '@/components/ui/table';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { EndorsementData } from '../types';
import { ENDORSEMENT_TYPE_LABELS } from '../lib/constants';
import { useEndorsements } from '../hooks/use-endorsements';

interface EndorsementListProps {
  readonly policyId: string;
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(dateStr));
}

export function EndorsementList({ policyId }: EndorsementListProps) {
  const { data, isLoading, isError, refetch } = useEndorsements({ policyId });

  if (isLoading) return <EndorsementListSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <p className="text-destructive text-sm">Erro ao carregar endossos.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <FileText className="text-muted-foreground size-10" />
        <p className="text-muted-foreground text-sm">Nenhum endosso registrado</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Descricao</TableHead>
            <TableHead className="hidden sm:table-cell">Data Efetiva</TableHead>
            <TableHead className="hidden md:table-cell">Criado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.data.map((endorsement) => (
            <EndorsementRow key={endorsement.id} endorsement={endorsement} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EndorsementRow({ endorsement }: { readonly endorsement: EndorsementData }) {
  return (
    <TableRow>
      <TableCell>
        <span className="bg-muted rounded px-2 py-0.5 text-xs font-medium">
          {ENDORSEMENT_TYPE_LABELS[endorsement.type]}
        </span>
      </TableCell>
      <TableCell className="max-w-xs truncate">{endorsement.description}</TableCell>
      <TableCell className="hidden sm:table-cell">
        {formatDate(endorsement.effectiveDate)}
      </TableCell>
      <TableCell className="hidden md:table-cell">{formatDate(endorsement.createdAt)}</TableCell>
    </TableRow>
  );
}

function EndorsementListSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Descricao</TableHead>
            <TableHead className="hidden sm:table-cell">Data Efetiva</TableHead>
            <TableHead className="hidden md:table-cell">Criado em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={`end-skel-${String(i)}`}>
              {Array.from({ length: 4 }).map((_, j) => (
                <TableCell key={`end-skel-${String(i)}-${String(j)}`}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
