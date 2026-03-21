'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, ChevronLeft, ChevronRight, MoreHorizontal, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Menu, MenuPopup, MenuItem, MenuTrigger } from '@/components/ui/menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/use-debounce';

import { useCancelPolicy, usePolicies } from '../hooks/use-policies';
import type { PolicyData, PolicyStatus } from '../types';
import { POLICY_BRANCH_LABELS, POLICY_STATUS_BADGE_VARIANT, POLICY_STATUS_LABELS } from '../types';

const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

const formatDate = (dateStr: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(
    new Date(dateStr),
  );

export function PoliciesTable() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | 'ALL'>('ALL');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cancelTarget, setCancelTarget] = useState<PolicyData | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const debouncedSearch = useDebounce(search, 300);
  const cancelMutation = useCancelPolicy();

  const { data, isLoading, isError } = usePolicies({
    search: debouncedSearch || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    cursor,
  });

  const policies = data?.data ?? [];
  const meta = data?.meta;

  function handleCancelConfirm() {
    if (!cancelTarget || !cancelReason.trim()) return;
    cancelMutation.mutate(
      { id: cancelTarget.id, reason: cancelReason.trim() },
      {
        onSuccess: () => {
          setCancelTarget(null);
          setCancelReason('');
        },
      },
    );
  }

  if (isError) {
    return <p className="text-destructive text-sm">Erro ao carregar apólices. Tente novamente.</p>;
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-2.5 size-4" />
          <Input
            placeholder="Buscar por número ou cliente..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCursor(undefined);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            if (v !== null) {
              setStatusFilter(v as PolicyStatus | 'ALL');
              setCursor(undefined);
            }
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            <SelectItem value="ACTIVE">Ativa</SelectItem>
            <SelectItem value="CANCELLED">Cancelada</SelectItem>
            <SelectItem value="EXPIRED">Expirada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={`skeleton-${String(i)}`} className="h-12 w-full" />
          ))}
        </div>
      ) : policies.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          Nenhuma apólice encontrada.
        </p>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Apólice</TableHead>
                <TableHead>Ramo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {policies.map((policy: PolicyData) => (
                <TableRow
                  key={policy.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/policies/${policy.id}`)}
                >
                  <TableCell className="font-medium">{policy.policyNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{POLICY_BRANCH_LABELS[policy.branch]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={POLICY_STATUS_BADGE_VARIANT[policy.status]}>
                      {POLICY_STATUS_LABELS[policy.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(policy.premiumValueInCents)}
                  </TableCell>
                  <TableCell>
                    {formatDate(policy.startDate)} – {formatDate(policy.endDate)}
                  </TableCell>
                  <TableCell>{formatDate(policy.createdAt)}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {policy.status === 'ACTIVE' && (
                      <Menu>
                        <MenuTrigger>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </MenuTrigger>
                        <MenuPopup align="end">
                          <MenuItem onClick={() => setCancelTarget(policy)}>
                            <Ban className="mr-2 size-4" />
                            Cancelar
                          </MenuItem>
                        </MenuPopup>
                      </Menu>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!cursor}
              onClick={() => setCursor(undefined)}
            >
              <ChevronLeft className="mr-1 size-4" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!meta?.hasMore}
              onClick={() => {
                if (meta?.nextCursor) setCursor(meta.nextCursor);
              }}
            >
              Próximo <ChevronRight className="ml-1 size-4" />
            </Button>
          </div>
        </>
      )}

      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCancelTarget(null);
            setCancelReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar apólice</DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento da apólice {cancelTarget?.policyNumber}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo do cancelamento..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCancelTarget(null);
                setCancelReason('');
              }}
            >
              Voltar
            </Button>
            <Button
              variant="destructive"
              disabled={!cancelReason.trim() || cancelMutation.isPending}
              onClick={handleCancelConfirm}
            >
              {cancelMutation.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
