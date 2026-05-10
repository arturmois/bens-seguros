'use client'

import { Shield } from 'lucide-react'
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
import { usePolicies } from '@/features/policies/hooks/use-policies'
import {
  POLICY_STATUS_BADGE_VARIANT,
  POLICY_STATUS_LABELS,
} from '@/features/policies/lib/constants'
import { formatCurrency, formatDate } from '@/lib/formatters'

interface ClientPoliciesTabProps {
  readonly clientId: string
}

const COLS = 5

export function ClientPoliciesTab({ clientId }: ClientPoliciesTabProps) {
  const router = useRouter()
  const { data, isLoading, isError, refetch } = usePolicies({
    clientId,
    limit: 10,
  })
  if (isLoading) return <RelatedEntityTableSkeleton cols={COLS} />
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8">
        <p className="text-destructive text-sm">Erro ao carregar apólices.</p>
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
        <Shield className="text-muted-foreground/50 size-10" />
        <p className="text-muted-foreground text-sm">
          Nenhuma apólice emitida ainda
        </p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nº</TableHead>
            <TableHead>Seguradora</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Prêmio</TableHead>
            <TableHead>Vigência</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <TableRow
              key={p.id}
              className="hover:bg-muted/50 cursor-pointer"
              onClick={() => router.push(`/policies/${p.id}`)}
            >
              <TableCell className="font-medium">{p.policyNumber}</TableCell>
              <TableCell>{p.insurerName ?? '-'}</TableCell>
              <TableCell>
                <Badge variant={POLICY_STATUS_BADGE_VARIANT[p.status]}>
                  {POLICY_STATUS_LABELS[p.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCurrency(p.premiumValueInCents)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(p.startDate)} → {formatDate(p.endDate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-end pt-1">
        <Button
          variant="link"
          size="sm"
          render={<Link href={`/policies?clientId=${clientId}`} />}
        >
          Ver todas as apólices →
        </Button>
      </div>
    </div>
  )
}
