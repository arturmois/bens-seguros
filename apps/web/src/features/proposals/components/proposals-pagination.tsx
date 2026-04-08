'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface ProposalsPaginationProps {
  readonly hasNextPage: boolean
  readonly hasPreviousPage: boolean
  readonly onNext: () => void
  readonly onPrevious: () => void
}

export function ProposalsPagination({
  hasNextPage,
  hasPreviousPage,
  onNext,
  onPrevious,
}: ProposalsPaginationProps) {
  return (
    <nav
      aria-label="Paginação de propostas"
      className="flex items-center justify-end"
    >
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!hasPreviousPage}
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!hasNextPage}
        >
          Próximo
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </nav>
  )
}
