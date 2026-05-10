'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50] as const

interface CursorPaginationProps {
  readonly total: number
  readonly pageSize: number
  readonly currentPage: number
  readonly onPageSizeChange: (size: number) => void
  readonly hasPreviousPage: boolean
  readonly hasNextPage: boolean
  readonly onPrevious: () => void
  readonly onNext: () => void
  readonly pageSizeOptions?: readonly number[]
}

export function CursorPagination({
  total,
  pageSize,
  currentPage,
  onPageSizeChange,
  hasPreviousPage,
  hasNextPage,
  onPrevious,
  onNext,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: CursorPaginationProps) {
  const pageSizeItems = pageSizeOptions.map((size) => ({
    value: String(size),
    label: String(size),
  }))
  const from = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, total)
  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <span className="text-muted-foreground text-sm">
        Mostrando {from}-{to} de {total} resultados
      </span>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Linhas</span>
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              if (value !== null) onPageSizeChange(Number(value))
            }}
            items={pageSizeItems}
          >
            <SelectTrigger className="h-8 w-16" size="sm">
              <SelectValue>
                {(value: string | null) => value ?? String(pageSize)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={!hasPreviousPage}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
            <span className="hidden sm:inline">Anterior</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!hasNextPage}
            aria-label="Próxima página"
          >
            <span className="hidden sm:inline">Próximo</span>
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
