'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/lib/api-client';

import type { ClientData } from '@/features/clients/types';

interface ClientSearchProps {
  readonly value: string;
  readonly onChange: (id: string) => void;
}

export function ClientSearch({ value, onChange }: ClientSearchProps) {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['clients-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const res = await api.get<ClientData[]>(
        `/api/v1/clients?search=${encodeURIComponent(debouncedSearch)}&limit=10`,
      );
      return res.data;
    },
    enabled: debouncedSearch.length >= 2,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = value && selectedLabel ? selectedLabel : search;

  return (
    <div className="relative" ref={containerRef}>
      <Input
        placeholder="Buscar cliente por nome ou documento..."
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          setSelectedLabel('');
          onChange('');
          setShowResults(true);
        }}
        onFocus={() => {
          if (debouncedSearch.length >= 2) {
            setShowResults(true);
          }
        }}
      />
      {isLoading && debouncedSearch.length >= 2 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        </div>
      )}
      {showResults && data && data.length > 0 && (
        <div className="bg-popover absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border shadow-md">
          {data.map((client) => (
            <button
              key={client.id}
              type="button"
              className="hover:bg-accent w-full px-3 py-2 text-left text-sm"
              onClick={() => {
                const label = `${client.name} \u2014 ${client.document}`;
                onChange(client.id);
                setSelectedLabel(label);
                setSearch(label);
                setShowResults(false);
              }}
            >
              <span className="font-medium">{client.name}</span>
              <span className="text-muted-foreground ml-2">{client.document}</span>
            </button>
          ))}
        </div>
      )}
      {showResults && debouncedSearch.length >= 2 && !isLoading && data && data.length === 0 && (
        <div className="bg-popover absolute z-50 mt-1 w-full rounded-lg border px-3 py-2 shadow-md">
          <p className="text-muted-foreground text-sm">Nenhum cliente encontrado.</p>
        </div>
      )}
    </div>
  );
}
