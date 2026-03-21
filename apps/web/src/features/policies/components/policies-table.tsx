'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, ChevronLeft, ChevronRight, MoreHorizontal, Search, Shield } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useDebounce } from '@/hooks/use-debounce';
import { formatCurrency, formatDate } from '@/lib/formatters';

import { usePolicies } from '../hooks/use-policies';
import type { PolicyData, PolicyStatus } from '../types';
import {
  POLICY_BRANCH_LABELS,
  POLICY_STATUS_BADGE_VARIANT,
  POLICY_STATUS_LABELS,
  POLICY_STATUSES,
} from '../types';
import { CancelPolicyDialog } from './cancel-policy-dialog';

export function PoliciesTable() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PolicyStatus | 'ALL'>('ALL');
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cancelTarget, setCancelTarget] = useState<PolicyData | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading, isError, refetch } = usePolicies({
    search: debouncedSearch || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    cursor,
  });

  const policies = data?.data ?? [];
  const meta = data?.meta;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <p className="text-destructive text-sm">Erro ao carregar apólices.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute left-3 top-2.5 size-4" />
          <Input
            aria-label="Buscar apólices por número ou cliente"
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
            if (v === null) return;
            const validStatuses: readonly string[] = POLICY_STATUSES;
            setStatusFilter(validStatuses.includes(v) ? (v as PolicyStatus) : 'ALL');
            setCursor(undefined);
          }}
          items={[
            { value: 'ALL', label: 'Todos' },
            ...POLICY_STATUSES.map((s) => ({ value: s, label: POLICY_STATUS_LABELS[s] })),
          ]}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos</SelectItem>
            {POLICY_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {POLICY_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
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
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${String(i)}`}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <TableCell key={`skeleton-${String(i)}-${String(j)}`}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : policies.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <Shield className="text-muted-foreground size-10" />
          <div>
            <p className="font-medium">Nenhuma apólice encontrada</p>
            <p className="text-muted-foreground mt-1 text-sm">
              As apólices serão criadas a partir de propostas aprovadas.
            </p>
          </div>
        </div>
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
                  tabIndex={0}
                  onClick={() => router.push(`/policies/${policy.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      router.push(`/policies/${policy.id}`);
                    }
                  }}
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
                        <MenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-10"
                              aria-label={`Ações da apólice ${policy.policyNumber}`}
                            />
                          }
                        >
                          <MoreHorizontal className="size-4" />
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

      <CancelPolicyDialog policy={cancelTarget} onClose={() => setCancelTarget(null)} />
    </>
  );
}
