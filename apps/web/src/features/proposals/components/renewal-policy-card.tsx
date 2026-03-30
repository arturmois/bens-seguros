'use client'

import Link from 'next/link'
import { ExternalLink, RefreshCw } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardPanel, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/formatters'
import { usePolicy } from '@/features/policies/hooks/use-policies'

interface RenewalPolicyCardProps {
  readonly policyId: string
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(dateStr))
}

export function RenewalPolicyCard({ policyId }: RenewalPolicyCardProps) {
  const { data, isLoading, isError } = usePolicy(policyId)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <RefreshCw className="size-4" />
            Apólice em Renovação
          </CardTitle>
        </CardHeader>
        <CardPanel className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
        </CardPanel>
      </Card>
    )
  }

  if (isError || !data?.data) return null

  const policy = data.data

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <RefreshCw className="size-4" />
            Apólice em Renovação
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/policies/${policyId}`}>
              <ExternalLink className="mr-1 size-3" />
              Ver apólice
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardPanel>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Nº Apólice</p>
            <p className="font-medium">{policy.policyNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Segurado</p>
            <p className="font-medium">{policy.clientName ?? '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Vigência</p>
            <p className="font-medium">
              {formatDate(policy.startDate)} — {formatDate(policy.endDate)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Prêmio</p>
            <p className="font-medium">
              {formatCurrency(policy.premiumValueInCents)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Status</p>
            <Badge variant="outline">{policy.status}</Badge>
          </div>
        </div>
      </CardPanel>
    </Card>
  )
}
