import { Skeleton } from '@/components/ui/skeleton';

export function ProposalsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={`skeleton-${String(i)}`} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function ProposalsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-muted-foreground text-sm">Nenhuma proposta encontrada.</p>
    </div>
  );
}
