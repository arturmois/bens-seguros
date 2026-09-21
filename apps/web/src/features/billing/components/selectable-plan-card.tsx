'use client'

import { Check } from 'lucide-react'

import type { ListBillingPlans200DataItem } from '@/api/model'
import { Radio } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'

import { buildPlanHighlights, formatPlanPrice } from '../lib/plan-display'

interface SelectablePlanCardProps {
  readonly plan: ListBillingPlans200DataItem
  readonly selected: boolean
}

export function SelectablePlanCard({
  plan,
  selected,
}: SelectablePlanCardProps) {
  const price = formatPlanPrice(plan)
  const highlights = buildPlanHighlights(plan)
  const ariaLabel = `${plan.name}, ${price.amount}${price.suffix ?? ''}`

  return (
    <label
      data-slot="plan-card"
      data-selected={selected || undefined}
      className={cn(
        'flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors',
        selected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
          : 'border-border hover:border-primary/40 hover:bg-accent/40'
      )}
    >
      <Radio
        value={plan.slug}
        aria-label={ariaLabel}
        className="mt-1 shrink-0"
      />
      <div className="flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold text-foreground">{plan.name}</span>
          <span className="font-semibold text-foreground tabular-nums">
            {price.amount}
            {price.suffix !== null && (
              <span className="ml-0.5 font-normal text-muted-foreground text-xs">
                {price.suffix}
              </span>
            )}
          </span>
        </div>
        {plan.description !== null && (
          <p className="mt-1 text-muted-foreground text-sm">
            {plan.description}
          </p>
        )}
        <ul className="mt-3 space-y-1.5">
          {highlights.map((highlight) => (
            <li
              key={highlight}
              className="flex items-start gap-2 text-muted-foreground text-sm"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>
    </label>
  )
}
