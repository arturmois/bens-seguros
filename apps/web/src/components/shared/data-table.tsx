'use client'

import { flexRender, type Table as TanStackTable } from '@tanstack/react-table'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// Shared baseline row height. Forces every data table in the app to render
// rows of the same minimum height regardless of cell content (icon button,
// avatar, badge, plain text). Avoids the visual ritmo break the audit found
// across modules where row heights ranged from 39px to 57px.
const ROW_BASELINE = 'h-13'

interface DataTableProps<T> {
  readonly table: TanStackTable<T>
  readonly isLoading: boolean
  readonly emptyMessage?: string
  readonly emptyDescription?: string
  readonly emptyIcon?: React.ReactNode
  readonly columnVisibility?: Record<string, boolean>
  readonly onRowClick?: (row: T) => void
  readonly skeletonRows?: number
}

export function DataTable<T>({
  table,
  isLoading,
  emptyMessage = 'Nenhum registro encontrado.',
  emptyDescription,
  emptyIcon,
  columnVisibility = {},
  onRowClick,
  skeletonRows = 5,
}: DataTableProps<T>) {
  const colCount = table.getVisibleLeafColumns().length

  return (
    <div className="hidden min-h-0 flex-1 overflow-auto rounded-md border md:flex md:flex-col">
      <Table>
        <TableHeader className="bg-background sticky top-0 z-10">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) =>
                columnVisibility[header.column.id] !== false ? (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ) : null
              )}
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
                  {emptyDescription && (
                    <p className="text-muted-foreground/70 text-sm">
                      {emptyDescription}
                    </p>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(ROW_BASELINE, onRowClick && 'cursor-pointer')}
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
        <TableRow key={`skeleton-${String(i)}`} className={ROW_BASELINE}>
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
