import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'

interface RelatedEntityTableSkeletonProps {
  readonly rows?: number
  readonly cols: number
}

export function RelatedEntityTableSkeleton({
  rows = 5,
  cols,
}: RelatedEntityTableSkeletonProps) {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <TableRow key={rowIdx}>
            {Array.from({ length: cols }).map((_, colIdx) => (
              <TableCell key={colIdx}>
                <Skeleton className="h-4 w-full" />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
