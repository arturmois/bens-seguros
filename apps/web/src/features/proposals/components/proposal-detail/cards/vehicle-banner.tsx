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
    <div className="mb-4 flex items-center gap-4 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 p-4 dark:from-emerald-950/40 dark:to-emerald-900/30">
      <div className="flex size-11 items-center justify-center rounded-lg bg-emerald-200/60 dark:bg-emerald-900/50">
        <Car className="size-6 text-emerald-700 dark:text-emerald-300" />
      </div>
      <div>
        <p className="text-base font-bold text-emerald-900 dark:text-emerald-100">
          {details.vehicle}
        </p>
        {subline && (
          <p className="text-xs text-emerald-800 dark:text-emerald-200">
            {subline}
          </p>
        )}
      </div>
    </div>
  )
}
