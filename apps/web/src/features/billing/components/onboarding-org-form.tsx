'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  completeOnboardingBodyOrgNameMax,
  completeOnboardingBodyOrgNameMin,
} from '@/api/endpoints/onboarding/onboarding.zod'
import type { ListBillingPlans200DataItem } from '@/api/model'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

import { useBillingPlans } from '../hooks/use-billing-plans'
import { useCompleteOnboarding } from '../hooks/use-complete-onboarding'
import { formatPlanPrice } from '../lib/plan-display'

const onboardingOrgSchema = z.object({
  orgName: z
    .string()
    .trim()
    .min(
      completeOnboardingBodyOrgNameMin,
      `Nome da corretora deve ter no mínimo ${String(completeOnboardingBodyOrgNameMin)} caracteres`
    )
    .max(
      completeOnboardingBodyOrgNameMax,
      `Nome da corretora deve ter no máximo ${String(completeOnboardingBodyOrgNameMax)} caracteres`
    ),
})

type OnboardingOrgFormData = z.infer<typeof onboardingOrgSchema>

export function OnboardingOrgForm({ planSlug }: { readonly planSlug: string }) {
  const router = useRouter()
  const { data: plans, isLoading: plansLoading } = useBillingPlans()
  const { mutate, isPending } = useCompleteOnboarding()
  const form = useForm<OnboardingOrgFormData>({
    resolver: zodResolver(onboardingOrgSchema),
    defaultValues: { orgName: '' },
  })

  const selectedPlan = plans?.find((plan) => plan.slug === planSlug) ?? null
  const planMissing = plans !== undefined && selectedPlan === null

  useEffect(() => {
    if (planMissing) router.replace('/select-plan')
  }, [planMissing, router])

  if (planMissing) return null

  function onSubmit(data: OnboardingOrgFormData) {
    mutate({ data: { orgName: data.orgName, planSlug } })
  }

  return (
    <div className="rounded-lg border bg-card p-8 shadow-sm">
      <div className="mb-6 text-center">
        <p className="font-semibold text-primary text-sm uppercase tracking-wide">
          Passo 2 de 2
        </p>
        <h2 className="mt-1 font-semibold text-xl">Configure sua corretora</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Estas informações podem ser alteradas depois
        </p>
      </div>

      <PlanSummary plan={selectedPlan} isLoading={plansLoading} />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="orgName">Nome da corretora *</Label>
          <Input
            {...form.register('orgName')}
            id="orgName"
            placeholder="Ex: Corretora ABC Seguros"
            aria-invalid={form.formState.errors.orgName !== undefined}
            aria-describedby={
              form.formState.errors.orgName ? 'orgName-error' : undefined
            }
          />
          {form.formState.errors.orgName && (
            <p id="orgName-error" className="text-destructive text-sm">
              {form.formState.errors.orgName.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Criando...
            </>
          ) : (
            'Criar corretora'
          )}
        </Button>
        <p className="text-center text-muted-foreground text-xs">
          Você será o administrador (Owner) desta organização
        </p>
      </form>
    </div>
  )
}

function PlanSummary({
  plan,
  isLoading,
}: {
  readonly plan: ListBillingPlans200DataItem | null
  readonly isLoading: boolean
}) {
  if (isLoading && plan === null) {
    return <Skeleton className="mb-6 h-16 w-full rounded-lg" />
  }
  if (plan === null) return null

  const price = formatPlanPrice(plan)

  return (
    <div className="mb-6 flex items-center justify-between gap-3 rounded-lg border bg-muted/50 p-4">
      <div>
        <p className="font-semibold text-foreground">{plan.name}</p>
        <p className="mt-0.5 text-muted-foreground text-sm">
          <span>
            {price.amount}
            {price.suffix !== null ? ` ${price.suffix}` : ''}
          </span>
          {' · '}
          <span>14 dias grátis</span>
        </p>
      </div>
      <Link
        href="/select-plan"
        className="font-medium text-primary text-sm hover:underline"
      >
        Trocar plano
      </Link>
    </div>
  )
}
