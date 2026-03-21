'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ClaimsPaginationProps {
  readonly total: number;
  readonly hasNextPage: boolean;
  readonly hasPreviousPage: boolean;
  readonly onNext: () => void;
  readonly onPrevious: () => void;
}

export function ClaimsPagination({
  total,
  hasNextPage,
  hasPreviousPage,
  onNext,
  onPrevious,
}: ClaimsPaginationProps) {
  return (
    <nav aria-label="Paginação de sinistros" className="flex items-center justify-between">
      <p className="text-muted-foreground text-sm">
        {total} {total === 1 ? 'sinistro' : 'sinistros'} no total
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPrevious} disabled={!hasPreviousPage}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={!hasNextPage}>
          Próximo
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}
