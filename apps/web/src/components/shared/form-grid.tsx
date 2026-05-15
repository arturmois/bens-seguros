import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface FormGridProps {
  readonly columns?: 2 | 3
  readonly gap?: 'sm' | 'md' | 'lg'
  readonly children: ReactNode
}

const GAP_CLASS = {
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
} as const

export function FormGrid({ columns = 3, gap = 'md', children }: FormGridProps) {
  return (
    <div className="@container">
      <div
        className={cn(
          'grid grid-cols-1',
          '@[480px]:grid-cols-2',
          columns === 3 && '@[920px]:grid-cols-3',
          GAP_CLASS[gap]
        )}
      >
        {children}
      </div>
    </div>
  )
}
