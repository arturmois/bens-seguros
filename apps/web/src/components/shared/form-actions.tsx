import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

const ALIGN_CLASS = {
  start: 'justify-start',
  end: 'justify-end',
  between: 'justify-between',
} as const

const GAP_CLASS = {
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
} as const

interface FormActionsProps {
  readonly align?: 'start' | 'end' | 'between'
  readonly gap?: 2 | 3 | 4
  readonly noPadding?: boolean
  readonly children: ReactNode
}

export function FormActions({
  align = 'end',
  gap = 2,
  noPadding = false,
  children,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center',
        ALIGN_CLASS[align],
        GAP_CLASS[gap],
        !noPadding && 'pt-2'
      )}
    >
      {children}
    </div>
  )
}
