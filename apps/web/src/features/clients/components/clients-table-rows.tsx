'use client';

import { MoreHorizontal } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/menu';

import type { ClientData } from '../types';
import { TYPE_BADGE_VARIANT, TYPE_LABELS } from '../lib/constants';

export function ClientsTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Nome</TableHead>
        <TableHead>Documento</TableHead>
        <TableHead>Tipo</TableHead>
        <TableHead>E-mail</TableHead>
        <TableHead>Telefone</TableHead>
        <TableHead>Criado em</TableHead>
        <TableHead className="w-12" />
      </TableRow>
    </TableHeader>
  );
}

export function ClientsTableBody({
  data,
  isLoading,
  onRowClick,
  onEdit,
  onDelete,
}: {
  readonly data: ClientData[] | undefined;
  readonly isLoading: boolean;
  readonly onRowClick: (id: string) => void;
  readonly onEdit: (client: ClientData) => void;
  readonly onDelete: (id: string) => void;
}) {
  return (
    <TableBody>
      {isLoading && <LoadingRows />}
      {!isLoading && data?.length === 0 && <EmptyRow />}
      {!isLoading &&
        data?.map((client) => (
          <ClientRow
            key={client.id}
            client={client}
            onClick={() => onRowClick(client.id)}
            onEdit={() => onEdit(client)}
            onDelete={() => onDelete(client.id)}
          />
        ))}
    </TableBody>
  );
}

function ClientRow({
  client,
  onClick,
  onEdit,
  onDelete,
}: {
  readonly client: ClientData;
  readonly onClick: () => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
}) {
  return (
    <TableRow className="cursor-pointer" onClick={onClick}>
      <TableCell className="font-medium">{client.name}</TableCell>
      <TableCell>{client.document}</TableCell>
      <TableCell>
        <Badge variant={TYPE_BADGE_VARIANT[client.type]}>{TYPE_LABELS[client.type]}</Badge>
      </TableCell>
      <TableCell>{client.email ?? '-'}</TableCell>
      <TableCell>{client.phone ?? '-'}</TableCell>
      <TableCell>{new Date(client.createdAt).toLocaleDateString('pt-BR')}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="hover:bg-accent inline-flex h-8 w-8 items-center justify-center rounded-md"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Acoes</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              Editar
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
        <TableRow key={`skeleton-${i}`}>
          {Array.from({ length: 7 }).map((_, j) => (
            <TableCell key={`skeleton-${i}-${j}`}>
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
      <TableCell colSpan={7} className="h-48 text-center">
        <p className="text-muted-foreground text-sm">Nenhum cliente encontrado.</p>
      </TableCell>
    </TableRow>
  );
}
