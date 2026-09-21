'use client'

import { Clock } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardPanel } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface PoliciesExpiringProps {
  count: number | undefined
  isLoading: boolean
}

export function PoliciesExpiring({ count, isLoading }: PoliciesExpiringProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Apólices expirando</CardTitle>
        </CardHeader>
        <CardPanel>
          <Skeleton className="h-24 w-full" />
        </CardPanel>
      </Card>
    )
  }
  const expiringCount = count ?? 0
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Apólices expirando</CardTitle>
      </CardHeader>
      <CardPanel className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-warning/8 text-warning">
          <Clock className="size-5" />
        </div>
        <div>
          <p className="font-bold text-3xl tracking-tight">{expiringCount}</p>
          <p className="text-muted-foreground text-xs">nos próximos 30 dias</p>
        </div>
        {expiringCount > 5 ? (
          <Badge variant="warning" size="sm" className="ml-auto">
            Atenção
          </Badge>
        ) : null}
      </CardPanel>
    </Card>
  )
}
