import { applyBasisPoints } from '../../../shared-kernel/money.js'

export function calculateCommissionValue(
  premiumValueInCents: number,
  percentageInBasisPoints: number,
  splitPercentageInBasisPoints: number = 10000
): number {
  return applyBasisPoints(
    premiumValueInCents,
    percentageInBasisPoints,
    splitPercentageInBasisPoints
  )
}
