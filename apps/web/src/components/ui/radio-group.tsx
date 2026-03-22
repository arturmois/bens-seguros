'use client'

import { Radio as RadioPrimitive } from '@base-ui/react/radio'
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group'
import type React from 'react'
import { cn } from '@/lib/utils'

export function RadioGroup({
  className,
  ...props
}: RadioGroupPrimitive.Props): React.ReactElement {
  return (
    <RadioGroupPrimitive
      className={cn('flex flex-col gap-3', className)}
      data-slot="radio-group"
      {...props}
    />
  )
}

export function Radio({
  className,
  ...props
}: RadioPrimitive.Root.Props): React.ReactElement {
  return (
    <RadioPrimitive.Root
      className={cn(
        'size-4.5 border-input bg-background not-dark:bg-clip-padding shadow-xs/5 not-data-disabled:not-data-checked:not-aria-invalid:before:shadow-[0_1px_--theme(--color-black/4%)] focus-visible:ring-ring focus-visible:ring-offset-background aria-invalid:border-destructive/36 focus-visible:aria-invalid:border-destructive/64 focus-visible:aria-invalid:ring-destructive/48 data-disabled:opacity-64 dark:not-data-checked:bg-input/32 dark:aria-invalid:ring-destructive/24 dark:not-data-disabled:not-data-checked:not-aria-invalid:before:shadow-[0_-1px_--theme(--color-white/6%)] [[data-disabled],[data-checked],[aria-invalid]]:shadow-none relative inline-flex shrink-0 items-center justify-center rounded-full border outline-none transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-full focus-visible:ring-2 focus-visible:ring-offset-1 sm:size-4',
        className
      )}
      data-slot="radio"
      {...props}
    >
      <RadioPrimitive.Indicator
        className="size-4.5 before:bg-primary-foreground data-unchecked:hidden data-checked:bg-primary absolute -inset-px flex items-center justify-center rounded-full before:size-2 before:rounded-full sm:size-4 sm:before:size-1.5"
        data-slot="radio-indicator"
      />
    </RadioPrimitive.Root>
  )
}

export { RadioGroupPrimitive, RadioPrimitive, Radio as RadioGroupItem }
