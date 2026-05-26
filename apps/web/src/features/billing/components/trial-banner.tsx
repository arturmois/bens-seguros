'use client'

import { Clock } from 'lucide-react'
import Link from 'next/link'

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

import { useBillingCurrent } from '../hooks/use-billing-current'

const MS_PER_DAY = 1000 * 60 * 60 * 24

function daysRemaining(trialEndsAt: string): number {
  const end = new Date(trialEndsAt).getTime()
  const now = Date.now()
  return Math.max(0, Math.ceil((end - now) / MS_PER_DAY))
}

export function TrialBanner() {
  const { data } = useBillingCurrent()
  const subscription = data?.subscription
  if (!subscription) return null
  if (subscription.status !== 'TRIALING') return null
  if (subscription.billingManagedExternally) return null
  if (subscription.trialEndsAt === null) return null

  const days = daysRemaining(subscription.trialEndsAt)
  const dayLabel = days === 1 ? 'dia' : 'dias'

  return (
    <Alert variant="warning">
      <Clock />
      <AlertTitle>
        Avaliação termina em {days} {dayLabel}
      </AlertTitle>
      <AlertDescription>
        Sua avaliação termina em breve. Faça upgrade para continuar usando todas
        as funcionalidades.
      </AlertDescription>
      <AlertAction>
        <Button
          size="sm"
          variant="outline"
          render={<Link href="/settings?section=billing">Ver planos</Link>}
        />
      </AlertAction>
    </Alert>
  )
}
