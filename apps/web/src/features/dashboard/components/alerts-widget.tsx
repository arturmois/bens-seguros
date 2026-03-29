'use client'

import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAlertCounts } from '@/features/notifications/hooks/use-alert-counts'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  PauseCircle,
} from 'lucide-react'
import Link from 'next/link'

interface AlertRow {
  readonly entityType: 'Policy' | 'Claim' | 'Commission' | 'Proposal'
  readonly label: string
  readonly icon: React.ElementType
  readonly color: string
  readonly href: string
  readonly linkLabel: string
}

const ALERT_ROWS: readonly AlertRow[] = [
  {
    entityType: 'Policy',
    label: 'apólices vencendo',
    icon: Clock,
    color: 'text-orange-500',
    href: '/policies?filter=expiring',
    linkLabel: 'apólices',
  },
  {
    entityType: 'Claim',
    label: 'sinistros sem atualização',
    icon: AlertTriangle,
    color: 'text-amber-600',
    href: '/claims?filter=stalled',
    linkLabel: 'sinistros',
  },
  {
    entityType: 'Commission',
    label: 'comissões pendentes há mais de 7 dias',
    icon: DollarSign,
    color: 'text-yellow-500',
    href: '/commissions?filter=pending',
    linkLabel: 'comissões',
  },
  {
    entityType: 'Proposal',
    label: 'propostas estagnadas',
    icon: PauseCircle,
    color: 'text-slate-500',
    href: '/proposals?filter=stagnant',
    linkLabel: 'propostas',
  },
] as const

export function AlertsWidget() {
  const { data: alertCounts, isLoading, isError, refetch } = useAlertCounts()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alertas Ativos</CardTitle>
        </CardHeader>
        <CardPanel className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardPanel>
      </Card>
    )
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alertas Ativos</CardTitle>
        </CardHeader>
        <CardPanel className="flex flex-col items-center gap-2 py-6">
          <AlertTriangle className="text-destructive size-6" />
          <p className="text-muted-foreground text-sm">
            Erro ao carregar alertas.
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            Tentar novamente
          </Button>
        </CardPanel>
      </Card>
    )
  }

  const counts = alertCounts ?? {
    Policy: 0,
    Claim: 0,
    Commission: 0,
    Proposal: 0,
  }
  const totalAlerts = Object.values(counts).reduce((sum, c) => sum + c, 0)

  if (totalAlerts === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Alertas Ativos</CardTitle>
        </CardHeader>
        <CardPanel className="flex items-center gap-3 py-6">
          <CheckCircle2 className="size-6 text-emerald-500" />
          <p className="text-muted-foreground text-sm">
            Nenhum alerta ativo. Tudo em dia!
          </p>
        </CardPanel>
      </Card>
    )
  }

  const activeRows = ALERT_ROWS.filter(
    (row) => (counts[row.entityType] ?? 0) > 0
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Alertas Ativos</CardTitle>
      </CardHeader>
      <CardPanel className="space-y-3">
        {activeRows.map((row) => {
          const count = counts[row.entityType] ?? 0
          const Icon = row.icon
          return (
            <div key={row.entityType} className="flex items-center gap-3">
              <Icon className={`size-4 shrink-0 ${row.color}`} />
              <span className="text-sm">
                <span className="font-semibold">{count}</span> {row.label}
              </span>
              <Link
                href={row.href}
                className="text-primary ml-auto text-xs hover:underline"
              >
                Ver {row.linkLabel}
              </Link>
            </div>
          )
        })}
      </CardPanel>
    </Card>
  )
}
