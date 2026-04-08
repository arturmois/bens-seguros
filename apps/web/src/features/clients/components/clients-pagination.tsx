'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { PAGE_SIZE_OPTIONS } from '../lib/constants'

const PAGE_SIZE_ITEMS = PAGE_SIZE_OPTIONS.map((size) => ({
  value: String(size),
  label: String(size),
}))

interface ClientsPaginationProps {
  readonly total: number
  readonly pageSize: number
  readonly onPageSizeChange: (size: number) => void
  readonly currentPage: number
  readonly hasNextPage: boolean
  readonly hasPreviousPage: boolean
  readonly onNext: () => void
  readonly onPrevious: () => void
}

export function ClientsPagination({
  total,
  pageSize,
  onPageSizeChange,
  currentPage,
  hasNextPage,
  hasPreviousPage,
  onNext,
  onPrevious,
}: ClientsPaginationProps) {
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
            items={PAGE_SIZE_ITEMS}
          >
            <SelectTrigger className="h-8 w-16" size="sm">
              <SelectValue>
                {(value: string | null) => value ?? String(pageSize)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
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
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={!hasNextPage}
          >
            Próximo
          </Button>
        </div>
      </div>
    </div>
  )
}
