'use client';

import { Plus, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { TYPE_OPTIONS } from '../lib/constants';

const TYPE_FILTER_OPTIONS = [{ value: 'ALL', label: 'Todos' }, ...TYPE_OPTIONS];

interface ClientsToolbarProps {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly typeFilter: string;
  readonly onTypeFilterChange: (value: string) => void;
  readonly onNewClient: () => void;
}

export function ClientsToolbar({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onNewClient,
}: ClientsToolbarProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            aria-label="Buscar clientes por nome ou documento"
            placeholder="Buscar por nome ou documento..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            if (v !== null) onTypeFilterChange(v);
          }}
          items={TYPE_FILTER_OPTIONS}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button onClick={onNewClient}>
        <Plus className="mr-2 h-4 w-4" />
        Novo Cliente
      </Button>
    </div>
  );
}
