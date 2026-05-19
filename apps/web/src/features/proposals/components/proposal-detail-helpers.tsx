import { Skeleton } from '@/components/ui/skeleton'

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-44 w-full rounded-xl" />
      <div className="flex gap-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
    </div>
  )
}
