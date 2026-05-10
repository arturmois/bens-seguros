import { Skeleton } from '@/components/ui/skeleton'

export function DocumentListSkeleton() {
  return (
    <div className="divide-y rounded-md border">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={`doc-skel-${String(i)}`}
          className="flex items-center gap-3 px-4 py-3"
        >
          <Skeleton className="size-5 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  )
}
