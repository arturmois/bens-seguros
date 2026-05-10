'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface MobileCardListProps<T> {
  readonly data: T[]
  readonly renderCard: (item: T, index: number) => React.ReactNode
  readonly keyExtractor: (item: T) => string
  readonly isLoading?: boolean
  readonly skeletonCount?: number
  readonly emptyMessage?: string
  readonly emptyDescription?: string
  readonly emptyIcon?: React.ReactNode
}

export function MobileCardList<T>({
  data,
  renderCard,
  keyExtractor,
  isLoading,
  skeletonCount = 3,
  emptyMessage = 'Nenhum registro encontrado.',
  emptyDescription,
  emptyIcon,
}: MobileCardListProps<T>) {
  'use no memo'
  if (isLoading) {
    return (
      <div className="space-y-3 md:hidden">
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <div
            key={`card-skeleton-${String(i)}`}
            className="rounded-lg border p-4"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-center text-sm md:hidden">
        {emptyIcon}
        <p>{emptyMessage}</p>
        {emptyDescription && (
          <p className="text-muted-foreground/70 text-xs">{emptyDescription}</p>
        )}
      </div>
    )
  }
  return (
    <div className="space-y-3 md:hidden">
      {data.map((item, index) => (
        <div key={keyExtractor(item)}>{renderCard(item, index)}</div>
      ))}
    </div>
  )
}
