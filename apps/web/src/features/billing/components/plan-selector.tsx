'use client'

import { AlertCircle, PackageOpen } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { RadioGroup } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'

import { useBillingPlans } from '../hooks/use-billing-plans'
import { SelectablePlanCard } from './selectable-plan-card'

export function PlanSelector() {
  const { data: plans, isLoading, isError, refetch } = useBillingPlans()
  const [selectedSlug, setSelectedSlug] = useState('')
  const router = useRouter()

  if (isLoading) return <PlansSkeleton />
  if (isError) return <PlansError onRetry={() => refetch()} />

  const items = plans ?? []
  if (items.length === 0) return <PlansEmpty />

  function handleContinue() {
    if (selectedSlug === '') return
    router.push(`/onboarding?plan=${encodeURIComponent(selectedSlug)}`)
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 text-center">
        <h2 className="font-semibold text-xl">Escolha seu plano</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Comece com 14 dias grátis. Você pode trocar de plano quando quiser.
        </p>
      </div>
      <RadioGroup
        value={selectedSlug}
        onValueChange={(value) => {
          if (typeof value === 'string') setSelectedSlug(value)
        }}
        aria-label="Planos disponíveis"
      >
        {items.map((plan) => (
          <SelectablePlanCard
            key={plan.id}
            plan={plan}
            selected={plan.slug === selectedSlug}
          />
        ))}
      </RadioGroup>
      <Button
        type="button"
        size="lg"
        className="mt-6 w-full"
        disabled={selectedSlug === ''}
        onClick={handleContinue}
      >
        Continuar
      </Button>
    </div>
  )
}

function PlansSkeleton() {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-6 shadow-sm sm:p-8">
      <Skeleton className="mx-auto h-6 w-40" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
      <Skeleton className="h-28 w-full rounded-lg" />
    </div>
  )
}

function PlansError({ onRetry }: { readonly onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-8 text-center shadow-sm">
      <AlertCircle className="size-8 text-destructive" />
      <p className="text-muted-foreground text-sm">
        Não foi possível carregar os planos.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Tentar novamente
      </Button>
    </div>
  )
}

function PlansEmpty() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-card p-8 text-center shadow-sm">
      <PackageOpen className="size-8 text-muted-foreground" />
      <p className="text-muted-foreground text-sm">
        Nenhum plano disponível no momento.
      </p>
    </div>
  )
}
