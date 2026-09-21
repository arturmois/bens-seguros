'use client'

import { FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import { RelatedEntityTableSkeleton } from '@/components/shared/related-entity-table-skeleton'
import { useOrgs } from '@/features/org/hooks/use-orgs'
import { useProposals } from '@/features/proposals/hooks/use-proposals'
import {
  BRANCH_LABELS,
  STAGE_BADGE_VARIANT,
  STAGE_LABELS,
} from '@/features/proposals/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { hasPermission } from '@/lib/permissions'

interface ClientProposalsTabProps {
  readonly clientId: string
}

const COLS = 4

export function ClientProposalsTab({ clientId }: ClientProposalsTabProps) {
  const router = useRouter()
  const { activeOrg } = useOrgs()
  const { data, isLoading, isError, refetch } = useProposals({
    clientId,
    limit: 10,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  })
  const canCreate = hasPermission(
    activeOrg?.role ?? 'VIEWER',
    'proposals:create'
  )
  if (isLoading) return <RelatedEntityTableSkeleton cols={COLS} />
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <p className="text-destructive text-sm">Erro ao carregar propostas.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Tentar novamente
        </Button>
      </div>
    )
  }
  const items = data?.data ?? []
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <FileText className="size-10 text-muted-foreground/50" />
        <p className="text-muted-foreground text-sm">
          Nenhuma proposta para este cliente
        </p>
        {canCreate && (
          <Button
            size="sm"
            render={<Link href={`/proposals/new?clientId=${clientId}`} />}
          >
            <Plus className="mr-1 h-4 w-4" />
            Nova proposta
          </Button>
        )}
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ramo</TableHead>
            <TableHead>Estágio</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead>Criada em</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <TableRow
              key={p.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/proposals/${p.id}`)}
            >
              <TableCell>
                <Badge variant="outline">{BRANCH_LABELS[p.branch]}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={STAGE_BADGE_VARIANT[p.stage]}>
                  {STAGE_LABELS[p.stage]}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(p.premiumValueInCents)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(p.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end pt-1">
        <Button
          variant="link"
          size="sm"
          render={<Link href={`/proposals?clientId=${clientId}`} />}
        >
          Ver todas as propostas →
        </Button>
      </div>
    </div>
  )
}
