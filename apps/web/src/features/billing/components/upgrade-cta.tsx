'use client'

import { Sparkles } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { FEATURE_LABEL, type UpgradableFeature } from '../lib/constants'

interface UpgradeCtaProps {
  readonly feature: UpgradableFeature
  readonly description?: string
}

export function UpgradeCta({ feature, description }: UpgradeCtaProps) {
  const label = FEATURE_LABEL[feature]
  return (
    <Card>
      <CardHeader>
        <Sparkles className="size-6 text-primary" />
        <CardTitle>{label} indisponível</CardTitle>
        <CardDescription>
          {description ??
            `${label} não está incluso no seu plano atual. Faça upgrade para liberar essa funcionalidade.`}
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button
          size="sm"
          render={<Link href="/settings?section=billing">Ver planos</Link>}
        />
      </CardFooter>
    </Card>
  )
}
