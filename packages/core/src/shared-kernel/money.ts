export type Cents = number
export type BasisPoints = number

const BASIS_POINTS_PER_WHOLE = 10000

export function applyBasisPoints(
  amountInCents: Cents,
  percentageInBasisPoints: BasisPoints,
  splitPercentageInBasisPoints: BasisPoints = BASIS_POINTS_PER_WHOLE
): Cents {
  return Math.round(
    (amountInCents * percentageInBasisPoints * splitPercentageInBasisPoints) /
      (BASIS_POINTS_PER_WHOLE * BASIS_POINTS_PER_WHOLE)
  )
}

export function reaisToCents(reais: number): Cents {
  return Math.round(reais * 100)
}
