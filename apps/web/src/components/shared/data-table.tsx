'use client'

import { flexRender, type Table as TanStackTable } from '@tanstack/react-table'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

interface DataTableProps<T> {
  readonly table: TanStackTable<T>
  readonly isLoading: boolean
  readonly emptyMessage?: string
  readonly emptyIcon?: React.ReactNode
  readonly onRowClick?: (row: T) => void
  readonly skeletonRows?: number
}

export function DataTable<T>({
  table,
  isLoading,
  emptyMessage = 'Nenhum registro encontrado.',
  emptyIcon,
  onRowClick,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const colCount = table.getVisibleLeafColumns().length

  return (
    <div className="hidden rounded-md border md:block">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <LoadingRows colCount={colCount} rowCount={skeletonRows} />
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={colCount} className="h-32 text-center">
                <div className="text-muted-foreground flex flex-col items-center gap-2">
                  {emptyIcon}
                  <p>{emptyMessage}</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={onRowClick ? 'cursor-pointer' : undefined}
                onClick={
                  onRowClick
                    ? (e) => {
                        const target = e.target as HTMLElement
                        if (
                          target.closest(
                            'button, [role="menu"], [role="menuitem"], [role="dialog"], a'
                          )
                        )
                          return
                        onRowClick(row.original)
                      }
                    : undefined
                }
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}

function LoadingRows({
  colCount,
  rowCount,
}: {
  readonly colCount: number
  readonly rowCount: number
}) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, i) => (
        <TableRow key={`skeleton-${String(i)}`}>
          {Array.from({ length: colCount }).map((_, j) => (
            <TableCell key={`skeleton-${String(i)}-${String(j)}`}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
