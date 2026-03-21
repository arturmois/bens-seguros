'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDebounce } from '@/hooks/use-debounce';
import { api } from '@/lib/api-client';

import type { PolicyData } from '@/features/policies/types';

const BRANCH_LABELS: Record<string, string> = {
  AUTO: 'Auto',
  RESIDENTIAL: 'Residencial',
  CONDOMINIUM: 'Condomínio',
  BUSINESS: 'Empresarial',
  LIFE: 'Vida',
  OTHER: 'Outros',
};

interface PolicySearchResult {
  readonly id: string;
  readonly policyNumber: string;
  readonly clientId: string;
  readonly clientName?: string;
  readonly branch: string;
}

interface PolicySearchSelection {
  readonly policyId: string;
  readonly clientId: string;
  readonly clientName: string;
}

interface PolicySearchProps {
  readonly value: string;
  readonly onChange: (selection: PolicySearchSelection) => void;
}

export function PolicySearch({ value, onChange }: PolicySearchProps) {
  const [search, setSearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['policies-search', debouncedSearch],
    queryFn: async () => {
      if (!debouncedSearch || debouncedSearch.length < 2) return [];
      const res = await api.get<PolicyData[]>(
        `/api/v1/policies?search=${encodeURIComponent(debouncedSearch)}&limit=10&status=ACTIVE`,
      );
      return res.data.map<PolicySearchResult>((policy) => ({
        id: policy.id,
        policyNumber: policy.policyNumber,
        clientId: policy.clientId,
        clientName: policy.clientName,
        branch: policy.branch,
      }));
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

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [data]);

  const selectPolicy = useCallback(
    (policy: PolicySearchResult) => {
      const clientLabel = policy.clientName ? ` — ${policy.clientName}` : '';
      const label = `${policy.policyNumber}${clientLabel}`;
      onChange({
        policyId: policy.id,
        clientId: policy.clientId,
        clientName: policy.clientName ?? '',
      });
      setSelectedLabel(label);
      setSearch(label);
      setShowResults(false);
    },
    [onChange],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showResults || !data || data.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < data.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : data.length - 1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0 && data[highlightedIndex]) {
      e.preventDefault();
      selectPolicy(data[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  }

  const displayValue = value && selectedLabel ? selectedLabel : search;
  const hasResults = showResults && data && data.length > 0;
  const hasNoResults =
    showResults && debouncedSearch.length >= 2 && !isLoading && data && data.length === 0;

  return (
    <div className="relative" ref={containerRef}>
      <Input
        aria-label="Buscar apólice por número ou nome do cliente"
        aria-autocomplete="list"
        aria-expanded={hasResults || undefined}
        aria-controls={hasResults ? 'policy-search-results' : undefined}
        aria-activedescendant={
          hasResults && highlightedIndex >= 0 && data?.[highlightedIndex]
            ? `policy-option-${data[highlightedIndex].id}`
            : undefined
        }
        role="combobox"
        placeholder="Buscar apólice por número ou cliente..."
        value={displayValue}
        onChange={(e) => {
          setSearch(e.target.value);
          setSelectedLabel('');
          onChange({ policyId: '', clientId: '', clientName: '' });
          setShowResults(true);
        }}
        onFocus={() => {
          if (debouncedSearch.length >= 2) {
            setShowResults(true);
          }
        }}
        onKeyDown={handleKeyDown}
      />
      {isLoading && debouncedSearch.length >= 2 && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
        </div>
      )}
      {hasResults && (
        <ul
          id="policy-search-results"
          ref={listRef}
          role="listbox"
          aria-label="Resultados de apólices"
          className="bg-popover absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border shadow-md"
        >
          {data.map((policy, index) => (
            <li
              key={policy.id}
              id={`policy-option-${policy.id}`}
              role="option"
              aria-selected={highlightedIndex === index}
              className={`w-full cursor-pointer px-3 py-2 text-left text-sm ${
                highlightedIndex === index ? 'bg-accent' : 'hover:bg-accent'
              }`}
              onClick={() => selectPolicy(policy)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{policy.policyNumber}</span>
                <Badge variant="outline" className="text-xs">
                  {BRANCH_LABELS[policy.branch] ?? policy.branch}
                </Badge>
              </div>
              {policy.clientName && (
                <span className="text-muted-foreground text-xs">{policy.clientName}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      {hasNoResults && (
        <div
          role="status"
          aria-live="polite"
          className="bg-popover absolute z-50 mt-1 w-full rounded-lg border px-3 py-2 shadow-md"
        >
          <p className="text-muted-foreground text-sm">Nenhuma apólice encontrada.</p>
        </div>
      )}
    </div>
  );
}
