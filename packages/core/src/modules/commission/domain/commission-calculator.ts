const BASIS_POINTS_DIVISOR = 10000

export function calculateCommissionValue(
  premiumValueInCents: number,
  percentageInBasisPoints: number,
  splitPercentageInBasisPoints: number = BASIS_POINTS_DIVISOR
): number {
  return Math.round(
    (premiumValueInCents *
      percentageInBasisPoints *
      splitPercentageInBasisPoints) /
      (BASIS_POINTS_DIVISOR * BASIS_POINTS_DIVISOR)
  )
}
