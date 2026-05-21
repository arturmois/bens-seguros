'use client'

import { Ban } from 'lucide-react'

interface LostReasonCardProps {
  readonly reason: string
}

export function LostReasonCard({ reason }: LostReasonCardProps) {
  return (
    <div className="border-destructive bg-destructive/10 flex items-start gap-3 rounded-xl border-l-4 p-4">
      <div className="bg-destructive/90 flex size-8 shrink-0 items-center justify-center rounded-full text-white">
        <Ban className="size-4" />
      </div>
      <div>
        <p className="text-destructive-foreground text-xs font-bold uppercase tracking-wider">
          Motivo da Perda
        </p>
        <p className="text-foreground mt-1 text-sm">{reason}</p>
      </div>
    </div>
  )
}
