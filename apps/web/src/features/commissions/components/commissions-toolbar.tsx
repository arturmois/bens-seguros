'use client';

import { Search } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { CommissionFilters, CommissionStatus } from '../types';
import { COMMISSION_STATUS_OPTIONS } from '../lib/constants';
import { CommissionExportButton } from './commission-export-button';

const STATUS_FILTER_OPTIONS = [
  { value: 'ALL' as const, label: 'Todos os status' },
  ...COMMISSION_STATUS_OPTIONS,
];

const VALID_STATUS_FILTER_VALUES = STATUS_FILTER_OPTIONS.map((opt) => opt.value);

function isValidStatusFilter(value: string): value is CommissionStatus | 'ALL' {
  return VALID_STATUS_FILTER_VALUES.includes(value as CommissionStatus | 'ALL');
}

interface CommissionsToolbarProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly statusFilter: CommissionStatus | 'ALL';
  readonly onStatusFilterChange: (value: CommissionStatus | 'ALL') => void;
  readonly currentFilters: CommissionFilters;
}

export function CommissionsToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  currentFilters,
}: CommissionsToolbarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            aria-label="Buscar comissoes por vendedor, apolice ou cliente"
            placeholder="Buscar comissao..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <CommissionExportButton filters={currentFilters} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={statusFilter}
          onValueChange={(v: string | null) => {
            if (v && isValidStatusFilter(v)) onStatusFilterChange(v);
          }}
          items={STATUS_FILTER_OPTIONS}
        >
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
