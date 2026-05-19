'use client'

import { Ban } from 'lucide-react'

interface LostReasonCardProps {
  readonly reason: string
}

export function LostReasonCard({ reason }: LostReasonCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border-l-4 border-red-500 bg-red-50 p-4 dark:bg-red-950/30">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-500/90 text-white">
        <Ban className="size-4" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300">
          Motivo da Perda
        </p>
        <p className="mt-1 text-sm text-red-900 dark:text-red-100">{reason}</p>
      </div>
    </div>
  )
}
