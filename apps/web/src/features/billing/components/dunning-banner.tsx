'use client'

import { AlertTriangle } from 'lucide-react'
import Link from 'next/link'

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

import { useBillingCurrent } from '../hooks/use-billing-current'

export function DunningBanner() {
  const { data } = useBillingCurrent()
  const subscription = data?.subscription
  if (!subscription) return null
  if (subscription.status !== 'PAST_DUE') return null
  if (subscription.billingManagedExternally) return null

  return (
    <Alert variant="error">
      <AlertTriangle />
      <AlertTitle>Pagamento atrasado</AlertTitle>
      <AlertDescription>
        Detectamos um pagamento atrasado na sua assinatura. Atualize o método de
        pagamento para evitar a suspensão do serviço.
      </AlertDescription>
      <AlertAction>
        <Button
          size="sm"
          render={
            <Link href="/settings?section=billing">Atualizar pagamento</Link>
          }
        />
      </AlertAction>
    </Alert>
  )
}
