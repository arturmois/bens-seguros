'use client'

import type React from 'react'
import { Trophy } from 'lucide-react'

import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/formatters'

import type { RankingEntry } from '../types'

interface BrokerRankingProps {
  readonly ranking: RankingEntry[] | undefined
  readonly isLoading: boolean
  readonly visible: boolean
}

function RankingHeader(): React.ReactElement {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Trophy className="size-4" />
        Ranking de Corretores
      </CardTitle>
    </CardHeader>
  )
}

export function BrokerRanking({
  ranking,
  isLoading,
  visible,
}: BrokerRankingProps): React.ReactElement | null {
  if (!visible) return null

  if (isLoading) {
    return (
      <Card>
        <RankingHeader />
        <CardPanel>
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardPanel>
      </Card>
    )
  }

  if (!ranking || ranking.length === 0) {
    return (
      <Card>
        <RankingHeader />
        <CardPanel>
          <p className="text-muted-foreground text-sm">
            Nenhuma apólice emitida no período.
          </p>
        </CardPanel>
      </Card>
    )
  }

  return (
    <Card>
      <RankingHeader />
      <CardPanel className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Corretor</TableHead>
              <TableHead className="text-right">Emitidas</TableHead>
              <TableHead className="text-right">Prêmio Total</TableHead>
              <TableHead className="text-right">Ticket Médio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ranking.map((entry, index) => (
              <TableRow key={entry.salespersonId}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>{entry.salespersonName}</TableCell>
                <TableCell className="text-right">
                  {entry.policiesIssued}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(entry.totalPremiumCents)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(entry.averageTicketCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardPanel>
    </Card>
  )
}
