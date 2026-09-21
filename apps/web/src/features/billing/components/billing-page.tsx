'use client'

import { AlertCircle, BadgeCheck, Building2 } from 'lucide-react'
import { useState } from 'react'

import type { GetBillingCurrent200DataSubscription } from '@/api/model'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/formatters'

import { useBillingCurrent } from '../hooks/use-billing-current'
import { planLabel, STATUS_LABEL, STATUS_VARIANT } from '../lib/constants'
import { AiUsageCard } from './ai-usage-card'
import { CancelSubscriptionDialog } from './cancel-subscription-dialog'
import { InvoicesList } from './invoices-list'

type Subscription = NonNullable<GetBillingCurrent200DataSubscription>
const CANCELABLE_STATUSES: ReadonlyArray<Subscription['status']> = [
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
]

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}

function BillingError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <AlertCircle className="size-8 text-destructive" />
      <p className="text-muted-foreground text-sm">
        Erro ao carregar informações do plano.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}

function ExternallyManagedCard() {
  return (
    <Card>
      <CardHeader>
        <Building2 className="size-6 text-info" />
        <CardTitle>Plano comercial</CardTitle>
        <CardDescription>
          Sua assinatura é gerenciada externamente por contrato comercial. Para
          alterações de plano, entre em contato com o suporte.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

function ActiveSubscriptionCard({
  subscription,
}: {
  readonly subscription: Subscription
}) {
  const [cancelOpen, setCancelOpen] = useState(false)
  const canCancel = CANCELABLE_STATUSES.includes(subscription.status)
  return (
    <>
      <Card>
        <CardHeader>
          <BadgeCheck className="size-6 text-primary" />
          <CardTitle>{planLabel(subscription.plan.slug)}</CardTitle>
          <CardDescription>
            <Badge variant={STATUS_VARIANT[subscription.status]} size="sm">
              {STATUS_LABEL[subscription.status]}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {subscription.trialEndsAt !== null && (
            <SubscriptionDetail
              label="Avaliação termina em"
              value={formatDate(subscription.trialEndsAt)}
            />
          )}
          {subscription.currentPeriodEnd !== null && (
            <SubscriptionDetail
              label="Próxima renovação"
              value={formatDate(subscription.currentPeriodEnd)}
            />
          )}
        </CardContent>
        {canCancel && (
          <CardFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(true)}
            >
              Cancelar assinatura
            </Button>
          </CardFooter>
        )}
      </Card>
      <CancelSubscriptionDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        currentPeriodEnd={subscription.currentPeriodEnd}
      />
    </>
  )
}

function SubscriptionDetail({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function NoSubscriptionEmpty() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Nenhum plano ativo</CardTitle>
        <CardDescription>
          Sua organização ainda não possui uma assinatura. Entre em contato com
          o suporte para ativar um plano.
        </CardDescription>
      </CardHeader>
    </Card>
  )
}

export function BillingPage() {
  const { data, isLoading, isError, refetch } = useBillingCurrent()

  if (isLoading) return <BillingSkeleton />
  if (isError) return <BillingError onRetry={() => refetch()} />

  const subscription = data?.subscription ?? null

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold text-lg tracking-tight">Plano</h2>
        <p className="text-muted-foreground text-sm">
          Informações sobre o plano atual da sua organização.
        </p>
      </div>
      {subscription === null && <NoSubscriptionEmpty />}
      {subscription !== null && subscription.billingManagedExternally && (
        <ExternallyManagedCard />
      )}
      {subscription !== null && !subscription.billingManagedExternally && (
        <ActiveSubscriptionCard subscription={subscription} />
      )}
      {subscription !== null && !subscription.billingManagedExternally && (
        <InvoicesList />
      )}
      {subscription !== null && <AiUsageCard />}
    </div>
  )
}
