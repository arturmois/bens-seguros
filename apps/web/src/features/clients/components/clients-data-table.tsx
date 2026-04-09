'use client'

import type { VisibilityState } from '@tanstack/react-table'
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

import type { ClientData } from '../lib/constants'

interface ClientsDataTableProps {
  readonly table: TanStackTable<ClientData>
  readonly columnVisibility: VisibilityState
  readonly isLoading: boolean
  readonly onRowClick: (id: string) => void
}

export function ClientsDataTable({
  table,
  columnVisibility,
  isLoading,
  onRowClick,
}: ClientsDataTableProps) {
  const visibleColumns = table.getAllLeafColumns().filter((col) => {
    if (col.id in columnVisibility) return columnVisibility[col.id]
    return true
  })

  const visibleIds = new Set(visibleColumns.map((col) => col.id))

  return (
    <div className="hidden rounded-md border md:block">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers
                .filter((header) => visibleIds.has(header.column.id))
                .map((header) => (
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
            <LoadingRows colCount={visibleColumns.length} />
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={visibleColumns.length}
                className="h-32 text-center"
              >
                <div className="text-muted-foreground flex flex-col items-center gap-2">
                  <p>Nenhum cliente encontrado.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer"
                onClick={(e) => {
                  const target = e.target as HTMLElement
                  if (
                    target.closest(
                      'button, [role="menu"], [role="menuitem"], [role="dialog"], a'
                    )
                  )
                    return
                  onRowClick(row.original.id)
                }}
              >
                {row
                  .getVisibleCells()
                  .filter((cell) => visibleIds.has(cell.column.id))
                  .map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
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

function LoadingRows({ colCount }: { readonly colCount: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: colCount }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
