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
    <div className="from-primary/5 to-primary/10 mb-4 flex items-center gap-4 rounded-xl bg-gradient-to-r p-4">
      <div className="bg-primary/10 flex size-11 items-center justify-center rounded-lg">
        <Car className="text-primary size-6" />
      </div>
      <div>
        <p className="text-foreground text-base font-bold">{details.vehicle}</p>
        {subline && <p className="text-muted-foreground text-xs">{subline}</p>}
      </div>
    </div>
  )
}
