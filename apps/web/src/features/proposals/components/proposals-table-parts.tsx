import { FileText } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function ProposalsTableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead>Ramo</TableHead>
            <TableHead>Estágio</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Criado em</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={`skeleton-${String(i)}`}>
              {Array.from({ length: 7 }).map((_, j) => (
                <TableCell key={`skeleton-${String(i)}-${String(j)}`}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function ProposalsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <FileText className="text-muted-foreground size-10" />
      <div>
        <p className="font-medium">Nenhuma proposta encontrada</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Crie uma nova proposta para começar.
        </p>
      </div>
    </div>
  )
}
