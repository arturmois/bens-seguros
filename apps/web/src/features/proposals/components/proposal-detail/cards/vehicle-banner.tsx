'use client'

import { Car } from 'lucide-react'

import type { AutoDetails } from '../../../lib/constants'

interface VehicleBannerProps {
  readonly details: AutoDetails | null
}

export function VehicleBanner({ details }: VehicleBannerProps) {
  if (!details) return null
  const platePart = details.licensePlate
    ? `Placa ${details.licensePlate}`
    : null
  const vinPart = details.vin ? `Chassi ${details.vin}` : null
  const subline = [platePart, vinPart].filter(Boolean).join(' · ')
  return (
    <div className="mb-4 flex items-center gap-4 rounded-xl border bg-card p-4">
      <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10">
        <Car className="size-6 text-primary" />
      </div>
      <div>
        <p className="font-bold text-base text-foreground">{details.vehicle}</p>
        {subline && <p className="text-muted-foreground text-xs">{subline}</p>}
      </div>
    </div>
  )
}
