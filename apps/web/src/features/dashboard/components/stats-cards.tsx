'use client'

import { FileText, Shield, AlertTriangle, DollarSign } from 'lucide-react'

import { Card, CardPanel } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/formatters'

import type { DashboardStats } from '../types'

interface StatsCardsProps {
  data: DashboardStats | undefined
  isLoading: boolean
}

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  badge?: { label: string; variant: 'warning' | 'info' | 'success' | 'error' }
}

function StatCard({ title, value, icon, badge }: StatCardProps) {
  return (
    <Card>
      <CardPanel className="flex items-center gap-4">
        <div className="bg-primary/8 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-sm">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold tracking-tight">{value}</p>
            {badge ? (
              <Badge variant={badge.variant} size="sm">
                {badge.label}
              </Badge>
            ) : null}
          </div>
        </div>
      </CardPanel>
    </Card>
  )
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardPanel className="flex items-center gap-4">
        <Skeleton className="size-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      </CardPanel>
    </Card>
  )
}

export function StatsCards({ data, isLoading }: StatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    )
  }

  if (!data) return null

  const activeProposals = data.proposalsByStage.reduce(
    (sum, s) => sum + s._count,
    0
  )
  const openClaims = data.claimsByPriority.reduce((sum, c) => sum + c._count, 0)
  const pendingCommissions = data.commissionsThisMonth
    .filter(
      (c) => c.status === 'PENDING_COMMERCIAL' || c.status === 'PENDING_ADMIN'
    )
    .reduce((sum, c) => sum + (c._sum.commissionValueInCents ?? 0), 0)

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Propostas ativas"
        value={activeProposals}
        icon={<FileText className="size-5" />}
      />
      <StatCard
        title="Apolices ativas"
        value={data.activePolicies}
        icon={<Shield className="size-5" />}
        badge={
          data.expiringPolicies > 0
            ? {
                label: `${data.expiringPolicies} expirando`,
                variant: 'warning',
              }
            : undefined
        }
      />
      <StatCard
        title="Sinistros abertos"
        value={openClaims}
        icon={<AlertTriangle className="size-5" />}
      />
      <StatCard
        title="Comissoes pendentes"
        value={formatCurrency(pendingCommissions)}
        icon={<DollarSign className="size-5" />}
      />
    </div>
  )
}
