import { AlertOctagon, ArrowRight } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata: Metadata = { title: 'Assinatura expirada' }

export default function BillingExpiredPage() {
  return (
    <Card>
      <CardHeader>
        <AlertOctagon className="text-destructive size-8" />
        <CardTitle>Sua assinatura expirou</CardTitle>
        <CardDescription>
          O acesso à sua organização está suspenso enquanto a assinatura está
          inativa. Reative o plano para retomar o uso completo do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">
          Enquanto a assinatura está expirada, somente o proprietário pode
          acessar a área de pagamento para regularizar.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-2 sm:flex-row">
        <Button
          render={
            <Link href="/settings?section=billing">
              Reativar assinatura
              <ArrowRight />
            </Link>
          }
        />
        <Button
          variant="outline"
          render={<a href="mailto:contato@bensseg.com">Falar com suporte</a>}
        />
      </CardFooter>
    </Card>
  )
}
