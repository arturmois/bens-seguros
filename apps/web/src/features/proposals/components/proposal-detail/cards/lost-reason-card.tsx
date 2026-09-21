'use client'

import { Ban } from 'lucide-react'

interface LostReasonCardProps {
  readonly reason: string
}

export function LostReasonCard({ reason }: LostReasonCardProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border-destructive border-l-4 bg-destructive/10 p-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/90 text-white">
        <Ban className="size-4" />
      </div>
      <div>
        <p className="font-bold text-destructive-foreground text-xs uppercase tracking-wider">
          Motivo da Perda
        </p>
        <p className="mt-1 text-foreground text-sm">{reason}</p>
      </div>
    </div>
  )
}
